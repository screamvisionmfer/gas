"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { OwnedNft, SquadronResult } from "@/lib/types";
import type { CommanderIdentity, CommanderProfile, Soldier } from "@/lib/commander-hq-types";
import { connectReadOnlySolanaWallet, type SolanaWalletName } from "@/lib/solana-wallet";
import { CommanderHero } from "./CommanderHero";
import { ArmySection, type ArmyLoadStatus } from "./ArmySection";

function traitValue(nft: OwnedNft, traitName: string) {
  return nft.attributes?.find((attribute) => attribute.trait_type.toLowerCase() === traitName.toLowerCase())?.value;
}

function toSoldier(nft: OwnedNft): Soldier {
  const metadataRank = traitValue(nft, "Ranks");
  return {
    mint: nft.mint,
    name: nft.name,
    image: nft.image,
    rarity: nft.rarityRank ? `#${nft.rarityRank}` : undefined,
    rank: metadataRank === undefined ? undefined : String(metadataRank),
    traits: (nft.attributes ?? []).map((attribute) => ({
      traitType: attribute.trait_type,
      value: String(attribute.value),
    })),
  };
}

function orderedSoldiers(result: SquadronResult) {
  const soldiers = result.ownedNfts.map(toSoldier);
  if (!result.bestRecruit) return soldiers;
  const bestIndex = soldiers.findIndex((soldier) => soldier.mint === result.bestRecruit?.mint);
  if (bestIndex <= 0) return soldiers;
  return [soldiers[bestIndex], ...soldiers.slice(0, bestIndex), ...soldiers.slice(bestIndex + 1)];
}

function progressToNextRank(result: SquadronResult) {
  if (!result.nextRank) return 100;
  const bandSize = result.nextRank.min - result.rank.min;
  if (bandSize <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round(((result.count - result.rank.min) / bandSize) * 100)));
}

function disconnectedCommander(commander: CommanderProfile): CommanderProfile {
  return {
    ...commander,
    rank: "Awaiting Scan",
    rankImage: "/logo.png",
    rankUnit: "Unassigned",
    armySize: 0,
    nextRank: "Recruit",
    soldiersNeeded: 1,
    rankProgress: 0,
    primarySoldier: undefined,
  };
}

export function CommanderArmyController({ commander, identity }: { commander: CommanderProfile; identity: CommanderIdentity }) {
  const [wallet, setWallet] = useState("");
  const [walletName, setWalletName] = useState<SolanaWalletName | null>(null);
  const [result, setResult] = useState<SquadronResult | null>(null);
  const [status, setStatus] = useState<ArmyLoadStatus>("idle");
  const [error, setError] = useState("");
  const activeRequest = useRef<AbortController | null>(null);

  useEffect(() => () => activeRequest.current?.abort(), []);

  async function loadArmy(address: string) {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setStatus("loading");
    setError("");

    try {
      const response = await fetch("/api/verify-squadron", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: address, includeAll: true }),
        cache: "no-store",
        signal: controller.signal,
      });
      const payload = await response.json() as SquadronResult & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to inspect this wallet.");
      setResult(payload);
      setStatus(payload.count > 0 ? "ready" : "empty");
    } catch (scanError) {
      if (scanError instanceof DOMException && scanError.name === "AbortError") return;
      setError(scanError instanceof Error ? scanError.message : "Unable to inspect this wallet.");
      setStatus("error");
    } finally {
      if (activeRequest.current === controller) activeRequest.current = null;
    }
  }

  async function connectWallet() {
    setStatus("connecting");
    setError("");
    try {
      const connection = await connectReadOnlySolanaWallet();
      setWallet(connection.address);
      setWalletName(connection.walletName);
      await loadArmy(connection.address);
    } catch (connectionError) {
      setError(connectionError instanceof Error ? connectionError.message : "Wallet connection was cancelled.");
      setStatus("error");
    }
  }

  const soldiers = useMemo(() => result ? orderedSoldiers(result) : [], [result]);
  const primarySoldier = result?.bestRecruit ? toSoldier(result.bestRecruit) : soldiers[0];
  const liveCommander = useMemo<CommanderProfile>(() => result ? {
    ...commander,
    rank: result.rank.name,
    rankImage: result.rank.image,
    rankUnit: result.unitName,
    armySize: result.count,
    nextRank: result.nextRank?.name,
    soldiersNeeded: result.recruitsUntilNextRank,
    rankProgress: progressToNextRank(result),
    primarySoldier,
  } : disconnectedCommander(commander), [commander, primarySoldier, result]);
  const liveIdentity = useMemo<CommanderIdentity>(() => ({
    ...identity,
    linkedWallets: wallet ? [{ address: wallet, chain: "solana", isPrimary: true }] : [],
  }), [identity, wallet]);

  return (
    <>
      <CommanderHero
        commander={liveCommander}
        identity={liveIdentity}
        onConnectWallet={connectWallet}
        walletBusy={status === "connecting" || status === "loading"}
        walletConnected={Boolean(wallet)}
        walletNotice={walletName && wallet ? `${walletName.toUpperCase()} CONNECTED · READ ONLY` : ""}
      />
      <ArmySection
        soldiers={soldiers}
        armySize={result?.count}
        bestSoldier={primarySoldier}
        status={status}
        error={error}
        walletConnected={Boolean(wallet)}
        onRefresh={() => wallet && loadArmy(wallet)}
      />
    </>
  );
}
