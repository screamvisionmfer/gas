export type CommanderIdentity = {
  privyId: string;
  twitter: {
    id: string;
    username: string;
    displayName: string;
    profileImage?: string;
  };
  wallets: Array<{
    address: string;
    primary: boolean;
  }>;
  createdAt: string;
};

export type Soldier = {
  mint: string;
  name: string;
  image: string;
  rarity?: string;
  rank?: string;
  traits?: Array<{
    traitType: string;
    value: string;
  }>;
};

export type CommanderProfile = {
  displayName: string;
  username: string;
  avatarUrl?: string;
  rank: string;
  rankImage: string;
  rankUnit: string;
  armySize: number;
  commanderScore: number;
  memberSince: string;
  nextRank?: string;
  soldiersNeeded?: number;
  rankProgress: number;
  primarySoldier?: Soldier;
};

export type TreasuryData = {
  totalValueUsd: number;
  change24hUsd: number;
  change24hPercent: number;
  investedUsd: number;
  realizedPnlUsd: number;
  unrealizedPnlUsd: number;
  averageBuyPriceUsd: number;
};

export type GroyperTokenBalance = {
  walletAddress: string;
  mint: string;
  rawAmount: string;
  decimals: number;
  uiAmount: number;
};

export type GroyperMarketData = {
  priceUsd: number | null;
  priceChange24hPercent: number | null;
  liquidityUsd: number | null;
  volume24hUsd: number | null;
  marketCapUsd: number | null;
  fdvUsd: number | null;
  pairAddress: string | null;
  dexId: string | null;
  pairUrl: string | null;
  updatedAt: string;
};

export type MarketChartPoint = {
  timestamp: number;
  priceUsd: number;
};

export type GroyperMarketResponse = {
  market: GroyperMarketData;
  chart24h: MarketChartPoint[];
};

export type LiveDataStatus = "idle" | "loading" | "ready" | "error";

export type CommanderDashboardData = {
  commander: CommanderProfile;
  soldiers: Soldier[];
  treasury: TreasuryData;
  dataMode: "mock" | "hybrid" | "live";
};
