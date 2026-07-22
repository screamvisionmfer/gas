import type { Soldier } from "./commander-hq-types";

export type PublicCommanderProfile = {
  id: string;
  username: string;
  usernameNormalized: string;
  displayName: string;
  avatarUrl?: string;
  primaryWallet: string;
  memberSince: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  isPublic: boolean;
  featuredSoldierMint?: string;
  featuredSoldier?: Soldier;
  army: Soldier[];
  armySize: number;
  rank: { id: string; name: string; unit?: string; insignia?: string };
  nextRank?: { name: string; soldiersNeeded: number; progress: number };
  groyperBalance?: number;
  commanderScore?: number;
  profileVersion: number;
  armyLastSyncedAt: string;
};

export type CommanderProfileMutation =
  | { action: "sync" }
  | { action: "set-featured"; mint: string }
  | { action: "unpublish" }
  | { action: "publish"; publicConsent: boolean };

export type CommanderProfileResponse = {
  profile: PublicCommanderProfile | null;
  profileUrl?: string;
};

