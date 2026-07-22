export type CommanderAwardType = "permanent" | "status";

export type CommanderAwardId =
  | "FIRST_DEPLOYMENT"
  | "ARMY_5"
  | "ARMY_10"
  | "ARMY_25"
  | "ARMY_50"
  | "ARMY_100"
  | "OLD_GUARD"
  | "RARE_ASSET"
  | "TOP_10_ARMY"
  | "TOP_3_ARMY"
  | "RANK_1_ARMY";

export type CommanderAwardDefinition = {
  id: CommanderAwardId;
  name: string;
  description: string;
  condition: string;
  type: CommanderAwardType;
  icon: string;
  order: number;
  publicPriority: number;
  hiddenUntilUnlocked?: boolean;
};

export type CommanderAward = CommanderAwardDefinition & {
  unlocked: boolean;
  unlockedAt?: string;
};

export type CommanderAwardSummary = {
  medals: CommanderAward[];
  statuses: CommanderAward[];
  unlocked: CommanderAward[];
  unlockedCount: number;
  totalCount: number;
  evaluatedAt: string;
};
