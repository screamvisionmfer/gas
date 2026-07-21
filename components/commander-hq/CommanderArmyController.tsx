"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { OwnedNft, SquadronResult } from "@/lib/types";
import type {
  CommanderIdentity,
  CommanderProfile,
  GroyperMarketData,
  GroyperMarketResponse,
  GroyperTokenBalance,
  LiveDataStatus,
  MarketChartPoint,
  Soldier,
  TreasuryData,
} from "@/lib/commander-hq-types";
import { connectReadOnlySolanaWallet, type SolanaWalletName } from "@/lib/solana-wallet";
import { CommanderHero } from "./CommanderHero";
import { ArmySection, type ArmyLoadStatus } from "./ArmySection";
import { TreasurySection } from "./TreasurySection";
import { MarketIntelSection } from "./MarketIntelSection";

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

function requestAborted(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function liveDataError(code: string | undefined, fallback: string) {
  if (code === "COMMANDER_SESSION_REQUIRED") return "COMMAND SESSION EXPIRED — RELOAD HQ";
  if (code === "INVALID_WALLET_ADDRESS") return "CONNECTED WALLET ADDRESS IS INVALID";
  if (code === "TOKEN_BALANCE_UNAVAILABLE") return "TOKEN BALANCE SERVICE IS TEMPORARILY UNAVAILABLE";
  if (code === "MARKET_DATA_UNAVAILABLE") return "MARKET INTELLIGENCE IS TEMPORARILY UNAVAILABLE";
  return fallback;
}

type CommanderArmyControllerProps = {
  commander: CommanderProfile;
  identity: CommanderIdentity;
  treasury: TreasuryData;
};

export function CommanderArmyController({ commander, identity, treasury }: CommanderArmyControllerProps) {
  const [wallet, setWallet] = useState("");
  const [walletName, setWalletName] = useState<SolanaWalletName | null>(null);
  const [result, setResult] = useState<SquadronResult | null>(null);
  const [status, setStatus] = useState<ArmyLoadStatus>("idle");
  const [error, setError] = useState("");
  const [balance, setBalance] = useState<GroyperTokenBalance | null>(null);
  const [provisionsStatus, setProvisionsStatus] = useState<LiveDataStatus>("idle");
  const [provisionsError, setProvisionsError] = useState("");
  const [market, setMarket] = useState<GroyperMarketData | null>(null);
  const [chart24h, setChart24h] = useState<MarketChartPoint[]>([]);
  const [marketStatus, setMarketStatus] = useState<LiveDataStatus>("idle");
  const [marketError, setMarketError] = useState("");
  const armyRequest = useRef<AbortController | null>(null);
  const provisionsRequest = useRef<AbortController | null>(null);
  const marketRequest = useRef<AbortController | null>(null);

  const loadArmy = useCallback(async (address: string) => {
    armyRequest.current?.abort();
    const controller = new AbortController();
    armyRequest.current = controller;
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
      if (requestAborted(scanError)) return;
      setError(scanError instanceof Error ? scanError.message : "Unable to inspect this wallet.");
      setStatus("error");
    } finally {
      if (armyRequest.current === controller) armyRequest.current = null;
    }
  }, []);

  const loadProvisions = useCallback(async (address: string) => {
    provisionsRequest.current?.abort();
    const controller = new AbortController();
    provisionsRequest.current = controller;
    setProvisionsStatus("loading");
    setProvisionsError("");

    try {
      const response = await fetch("/api/commander-hq/provisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: address }),
        cache: "no-store",
        signal: controller.signal,
      });
      const payload = await response.json() as GroyperTokenBalance & { error?: string };
      if (!response.ok) throw new Error(liveDataError(payload.error, "Unable to inspect $GROYPER provisions."));
      setBalance(payload);
      setProvisionsStatus("ready");
    } catch (balanceError) {
      if (requestAborted(balanceError)) return;
      setProvisionsError(balanceError instanceof Error ? balanceError.message : "Unable to inspect $GROYPER provisions.");
      setProvisionsStatus("error");
    } finally {
      if (provisionsRequest.current === controller) provisionsRequest.current = null;
    }
  }, []);

  const loadMarket = useCallback(async (forceRefresh = false) => {
    marketRequest.current?.abort();
    const controller = new AbortController();
    marketRequest.current = controller;
    setMarketStatus("loading");
    setMarketError("");

    try {
      const response = await fetch(`/api/commander-hq/market${forceRefresh ? "?refresh=1" : ""}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      const payload = await response.json() as GroyperMarketResponse & { error?: string };
      if (!response.ok) throw new Error(liveDataError(payload.error, "Unable to receive market intelligence."));
      setMarket(payload.market);
      setChart24h(payload.chart24h);
      setMarketStatus("ready");
    } catch (marketLoadError) {
      if (requestAborted(marketLoadError)) return;
      setMarketError(marketLoadError instanceof Error ? marketLoadError.message : "Unable to receive market intelligence.");
      setMarketStatus("error");
    } finally {
      if (marketRequest.current === controller) marketRequest.current = null;
    }
  }, []);

  useEffect(() => {
    const initialMarketRequest = window.setTimeout(() => void loadMarket(), 0);
    return () => {
      window.clearTimeout(initialMarketRequest);
      armyRequest.current?.abort();
      provisionsRequest.current?.abort();
      marketRequest.current?.abort();
    };
  }, [loadMarket]);

  async function connectWallet() {
    setStatus("connecting");
    setError("");
    try {
      const connection = await connectReadOnlySolanaWallet();
      if (connection.address !== wallet) {
        setResult(null);
        setBalance(null);
      }
      setWallet(connection.address);
      setWalletName(connection.walletName);
      await Promise.all([loadArmy(connection.address), loadProvisions(connection.address)]);
    } catch (connectionError) {
      setError(connectionError instanceof Error ? connectionError.message : "Wallet connection was cancelled.");
      setStatus("error");
    }
  }

  function refreshLiveData() {
    const requests: Promise<void>[] = [loadMarket(true)];
    if (wallet) requests.push(loadProvisions(wallet));
    void Promise.all(requests);
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
      <TreasurySection
        treasury={treasury}
        balance={balance}
        market={market}
        status={provisionsStatus}
        error={provisionsError}
        walletConnected={Boolean(wallet)}
        onRefresh={refreshLiveData}
      />
      <MarketIntelSection
        market={market}
        chart24h={chart24h}
        status={marketStatus}
        error={marketError}
        onRefresh={refreshLiveData}
      />
    </>
  );
}
