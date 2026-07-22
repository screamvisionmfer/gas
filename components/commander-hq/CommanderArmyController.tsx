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
import type { CommanderProfileResponse, PublicCommanderProfile } from "@/lib/commander-profile-types";
import { CommanderHero } from "./CommanderHero";
import { ArmySection, type ArmyLoadStatus } from "./ArmySection";
import { TreasurySection } from "./TreasurySection";
import { MarketIntelSection } from "./MarketIntelSection";
import { PublicProfilePanel } from "./PublicProfilePanel";
import { useCommanderIdentity } from "./CommanderIdentityProvider";

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

const ARMY_CACHE_TTL = 5 * 60 * 1000;

function cachedArmy(address: string) {
  try {
    const stored = window.sessionStorage.getItem(`gas:commander-army:${address}`);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as { result: SquadronResult; cachedAt: number };
    if (Date.now() - parsed.cachedAt > ARMY_CACHE_TTL) return null;
    return parsed.result;
  } catch {
    return null;
  }
}

function cacheArmy(address: string, result: SquadronResult) {
  try {
    window.sessionStorage.setItem(`gas:commander-army:${address}`, JSON.stringify({ result, cachedAt: Date.now() }));
  } catch {
    // Army caching is an optimization; a blocked storage API must not block the live scan.
  }
}

function memberSince(createdAt: string) {
  const date = new Date(createdAt);
  return Number.isNaN(date.getTime())
    ? "VERIFIED MEMBER"
    : new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date);
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
  walletAddress: string;
  onConnectWallet: () => void;
  onLogoutIdentity: () => Promise<void>;
  identityBusy: boolean;
};

export function CommanderArmyController({ commander, identity, treasury, walletAddress, onConnectWallet, onLogoutIdentity, identityBusy }: CommanderArmyControllerProps) {
  const { getAuthToken } = useCommanderIdentity();
  const wallet = walletAddress;
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
  const loadedWallet = useRef("");
  const [publicProfile, setPublicProfile] = useState<PublicCommanderProfile | null>(null);
  const [profileUrl, setProfileUrl] = useState("");
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileAction, setProfileAction] = useState("");
  const [profileError, setProfileError] = useState("");
  const [publicConsent, setPublicConsent] = useState(false);

  const loadArmy = useCallback(async (address: string, forceRefresh = false) => {
    armyRequest.current?.abort();
    if (!forceRefresh) {
      const cached = cachedArmy(address);
      if (cached) {
        setResult(cached);
        setStatus(cached.count > 0 ? "ready" : "empty");
        return;
      }
    }
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
      cacheArmy(address, payload);
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

  useEffect(() => {
    if (!wallet || loadedWallet.current === wallet) return;
    loadedWallet.current = wallet;
    setResult(null);
    setBalance(null);
    const initialArmyLoad = window.setTimeout(() => {
      void Promise.all([loadArmy(wallet), loadProvisions(wallet)]);
    }, 0);
    return () => window.clearTimeout(initialArmyLoad);
  }, [loadArmy, loadProvisions, wallet]);

  const profileRequest = useCallback(async (method: "GET" | "POST" | "PATCH", body?: unknown) => {
    const token = await getAuthToken();
    if (!token) throw new Error("PRIVY SESSION EXPIRED — SIGN IN AGAIN");
    const response = await fetch("/api/commander-profile", {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    const payload = await response.json() as CommanderProfileResponse & { message?: string };
    if (!response.ok) throw new Error(payload.message ?? "PUBLIC PROFILE SERVICE UNAVAILABLE");
    setPublicProfile(payload.profile);
    setProfileUrl(payload.profileUrl ?? "");
    return payload.profile;
  }, [getAuthToken]);

  useEffect(() => {
    let cancelled = false;
    const request = window.setTimeout(() => {
      setProfileLoading(true);
      void profileRequest("GET")
        .catch((profileLoadError) => { if (!cancelled) setProfileError(profileLoadError instanceof Error ? profileLoadError.message : "PUBLIC PROFILE SERVICE UNAVAILABLE"); })
        .finally(() => { if (!cancelled) setProfileLoading(false); });
    }, 0);
    return () => { cancelled = true; window.clearTimeout(request); };
  }, [identity.privyId, profileRequest, wallet]);

  const mutateProfile = useCallback(async (action: string, method: "POST" | "PATCH", body: unknown) => {
    setProfileAction(action);
    setProfileError("");
    try {
      const profile = await profileRequest(method, body);
      if (profile?.isPublic) setPublicConsent(true);
    } catch (profileMutationError) {
      setProfileError(profileMutationError instanceof Error ? profileMutationError.message : "PUBLIC PROFILE UPDATE FAILED");
    } finally {
      setProfileAction("");
    }
  }, [profileRequest]);

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
  const identifiedCommander = useMemo<CommanderProfile>(() => ({
    ...liveCommander,
    displayName: identity.twitter.displayName,
    username: identity.twitter.username,
    avatarUrl: identity.twitter.profileImage,
    memberSince: memberSince(identity.createdAt),
  }), [identity, liveCommander]);

  return (
    <>
      <CommanderHero
        commander={identifiedCommander}
        identity={identity}
        onConnectWallet={onConnectWallet}
        walletBusy={identityBusy}
        walletConnected={Boolean(wallet)}
        walletNotice={wallet ? "PRIVY LINKED · READ ONLY · NO TRANSACTIONS" : ""}
        onLogoutIdentity={onLogoutIdentity}
      />
      <PublicProfilePanel
        profile={publicProfile}
        profileUrl={profileUrl}
        loading={profileLoading}
        busyAction={profileAction}
        error={profileError}
        consent={publicConsent}
        onConsentChange={setPublicConsent}
        onCreate={() => void mutateProfile("create", "POST", { publicConsent })}
        onSync={() => void mutateProfile("sync", "PATCH", { action: "sync" })}
        onUnpublish={() => void mutateProfile("unpublish", "PATCH", { action: "unpublish" })}
        onCopy={() => void navigator.clipboard.writeText(profileUrl)}
      />
      <ArmySection
        soldiers={soldiers}
        armySize={result?.count}
        bestSoldier={primarySoldier}
        status={status}
        error={error}
        walletConnected={Boolean(wallet)}
        onRefresh={() => wallet && loadArmy(wallet, true)}
        publicProfileActive={publicProfile?.isPublic === true}
        featuredMint={publicProfile?.featuredSoldierMint}
        featuredBusyMint={profileAction.startsWith("feature:") ? profileAction.slice(8) : ""}
        onSetFeatured={(mint) => void mutateProfile(`feature:${mint}`, "PATCH", { action: "set-featured", mint })}
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
