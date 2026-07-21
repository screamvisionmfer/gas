export type CommanderIdentity = {
  privyUserId?: string;
  twitter?: {
    id: string;
    username: string;
    displayName: string;
    profilePictureUrl?: string;
  };
  linkedWallets: Array<{
    address: string;
    chain: "solana";
    isPrimary: boolean;
  }>;
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
  armySize: number;
  commanderScore: number;
  memberSince: string;
  nextRank?: string;
  soldiersNeeded?: number;
  rankProgress: number;
  primarySoldier: Soldier;
};

export type TreasuryData = {
  totalValueUsd: number;
  change24hUsd: number;
  change24hPercent: number;
  investedUsd: number;
  realizedPnlUsd: number;
  unrealizedPnlUsd: number;
};

export type ProvisionsData = {
  tokenBalance: number;
  tokenPriceUsd: number;
  tokenValueUsd: number;
  averageEntryUsd: number;
  change24hPercent: number;
};

export type MarketData = {
  tokenPriceUsd: number;
  change24hPercent: number;
  marketCapUsd: number;
  liquidityUsd: number;
  volume24hUsd: number;
  holders: number;
  chart: Record<"1H" | "24H" | "7D" | "30D", number[]>;
};

export type Medal = {
  id: string;
  name: string;
  code: string;
  unlocked: boolean;
};

export type Achievement = {
  id: string;
  name: string;
  description: string;
  state: "unlocked" | "locked" | "progress" | "hidden";
  progress?: number;
};

export type CommanderDashboardData = {
  identity: CommanderIdentity;
  commander: CommanderProfile;
  soldiers: Soldier[];
  treasury: TreasuryData;
  provisions: ProvisionsData;
  market: MarketData;
  medals: Medal[];
  achievements: Achievement[];
  dataMode: "mock" | "live";
};

