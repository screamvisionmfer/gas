import { groyperConfig } from "./groyper-config";
import type { GroyperMarketResponse, MarketChartPoint } from "./commander-hq-types";

type DexPair = {
  chainId?: string;
  dexId?: string;
  url?: string;
  pairAddress?: string;
  baseToken?: { address?: string };
  priceUsd?: string | null;
  volume?: { h24?: number | string | null };
  priceChange?: { h24?: number | string | null };
  liquidity?: { usd?: number | string | null };
  fdv?: number | string | null;
  marketCap?: number | string | null;
};

type DexPairResponse = {
  pairs?: DexPair[] | null;
};

type GeckoOhlcvResponse = {
  data?: {
    attributes?: {
      ohlcv_list?: unknown[];
    };
  };
};

type MarketCache = {
  expiresAt: number;
  value: GroyperMarketResponse;
};

let marketCache: MarketCache | null = null;
let marketRequest: Promise<GroyperMarketResponse> | null = null;

function finiteNumber(value: unknown, allowNegative = false) {
  const parsed = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
  if (!Number.isFinite(parsed) || (!allowNegative && parsed < 0)) return null;
  return parsed;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Upstream market request failed with ${response.status}.`);
  return response.json() as Promise<T>;
}

function pairLiquidity(pair: DexPair) {
  return finiteNumber(pair.liquidity?.usd) ?? 0;
}

function validTokenPair(pair: DexPair) {
  return pair.chainId === groyperConfig.chainId && pair.baseToken?.address === groyperConfig.tokenMint && Boolean(pair.pairAddress);
}

async function loadDexPairs() {
  if (groyperConfig.dexScreenerPairAddress) {
    const url = `https://api.dexscreener.com/latest/dex/pairs/${groyperConfig.chainId}/${encodeURIComponent(groyperConfig.dexScreenerPairAddress)}`;
    const payload = await fetchJson<DexPairResponse>(url);
    return (payload.pairs ?? []).filter(validTokenPair);
  }

  const url = `https://api.dexscreener.com/token-pairs/v1/${groyperConfig.chainId}/${encodeURIComponent(groyperConfig.tokenMint)}`;
  const payload = await fetchJson<DexPair[]>(url);
  return Array.isArray(payload) ? payload.filter(validTokenPair) : [];
}

function normalizeChartPoint(row: unknown): MarketChartPoint | null {
  if (!Array.isArray(row)) return null;
  const timestampSeconds = finiteNumber(row[0]);
  const closePrice = finiteNumber(row[4]);
  if (timestampSeconds === null || closePrice === null) return null;
  return { timestamp: timestampSeconds * 1000, priceUsd: closePrice };
}

async function load24hChart(pairAddress: string) {
  const query = "aggregate=1&limit=24&currency=usd&token=base";
  const url = `https://api.geckoterminal.com/api/v2/networks/${groyperConfig.chainId}/pools/${encodeURIComponent(pairAddress)}/ohlcv/hour?${query}`;
  const payload = await fetchJson<GeckoOhlcvResponse>(url);
  const rows = payload.data?.attributes?.ohlcv_list ?? [];
  return rows
    .map(normalizeChartPoint)
    .filter((point): point is MarketChartPoint => point !== null)
    .sort((left, right) => left.timestamp - right.timestamp);
}

async function loadMarketData(): Promise<GroyperMarketResponse> {
  const pairs = await loadDexPairs();
  const pair = pairs.sort((left, right) => pairLiquidity(right) - pairLiquidity(left))[0];
  if (!pair?.pairAddress) throw new Error("No liquid $GROYPER market pair was found.");

  const chart24h = await load24hChart(pair.pairAddress).catch(() => []);
  return {
    market: {
      priceUsd: finiteNumber(pair.priceUsd),
      priceChange24hPercent: finiteNumber(pair.priceChange?.h24, true),
      liquidityUsd: finiteNumber(pair.liquidity?.usd),
      volume24hUsd: finiteNumber(pair.volume?.h24),
      marketCapUsd: finiteNumber(pair.marketCap),
      fdvUsd: finiteNumber(pair.fdv),
      pairAddress: pair.pairAddress,
      dexId: pair.dexId?.trim() || null,
      pairUrl: pair.url?.startsWith("https://") ? pair.url : null,
      updatedAt: new Date().toISOString(),
    },
    chart24h,
  };
}

export async function getGroyperMarketData(options: { forceRefresh?: boolean } = {}) {
  const now = Date.now();
  if (!options.forceRefresh && marketCache && marketCache.expiresAt > now) return marketCache.value;
  if (!options.forceRefresh && marketRequest) return marketRequest;

  marketRequest = loadMarketData()
    .then((value) => {
      marketCache = { value, expiresAt: Date.now() + groyperConfig.marketCacheSeconds * 1000 };
      return value;
    })
    .catch((error) => {
      if (marketCache) return marketCache.value;
      throw error;
    })
    .finally(() => {
      marketRequest = null;
    });

  return marketRequest;
}

