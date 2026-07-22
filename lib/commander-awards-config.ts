import type { CommanderAwardDefinition, CommanderAwardId } from "./commander-awards-types";

export const RARE_ASSET_MAX_RARITY_RANK = 77;

export const commanderAwards: readonly CommanderAwardDefinition[] = [
  { id: "FIRST_DEPLOYMENT", name: "First Deployment", description: "Published a verified Commander dossier.", condition: "Publish your public Commander dossier.", type: "permanent", icon: "FD", order: 80, publicPriority: 10 },
  { id: "ARMY_5", name: "Squad Leader", description: "Built a verified squad of at least 5 GAS soldiers.", condition: "Command at least 5 GAS soldiers.", type: "permanent", icon: "S5", order: 60, publicPriority: 30 },
  { id: "ARMY_10", name: "Platoon Commander", description: "Built a verified platoon of at least 10 GAS soldiers.", condition: "Command at least 10 GAS soldiers.", type: "permanent", icon: "P10", order: 50, publicPriority: 40 },
  { id: "ARMY_25", name: "Company Commander", description: "Built a verified company of at least 25 GAS soldiers.", condition: "Command at least 25 GAS soldiers.", type: "permanent", icon: "C25", order: 40, publicPriority: 50 },
  { id: "ARMY_50", name: "Battalion Commander", description: "Built a verified battalion of at least 50 GAS soldiers.", condition: "Command at least 50 GAS soldiers.", type: "permanent", icon: "B50", order: 30, publicPriority: 60 },
  { id: "ARMY_100", name: "Groyper General", description: "Commanded at least 100 verified GAS soldiers.", condition: "Command at least 100 GAS soldiers.", type: "permanent", icon: "G100", order: 20, publicPriority: 80 },
  { id: "OLD_GUARD", name: "Old Guard", description: "One of the first 25 published Commander dossiers.", condition: "Be among the first 25 public Commanders.", type: "permanent", icon: "OG", order: 10, publicPriority: 90 },
  { id: "RARE_ASSET", name: "Rare Asset", description: `Featured a verified GAS recruit ranked in the rarest ${RARE_ASSET_MAX_RARITY_RANK}.`, condition: `Feature a recruit with rarity rank #${RARE_ASSET_MAX_RARITY_RANK} or better.`, type: "permanent", icon: "RA", order: 15, publicPriority: 85 },
  { id: "TOP_10_ARMY", name: "Top Brass", description: "Currently ranked in the top 10 armies.", condition: "Reach the top 10 Army Size leaderboard.", type: "status", icon: "T10", order: 3, publicPriority: 100 },
  { id: "TOP_3_ARMY", name: "High Command", description: "Currently ranked in the top 3 armies.", condition: "Reach the top 3 Army Size leaderboard.", type: "status", icon: "HC", order: 2, publicPriority: 110 },
  { id: "RANK_1_ARMY", name: "Supreme Command", description: "Currently commands the largest public GAS army.", condition: "Reach #1 on the Army Size leaderboard.", type: "status", icon: "SC", order: 1, publicPriority: 120 },
] as const;

export const permanentAwardIds = commanderAwards.filter((award) => award.type === "permanent").map((award) => award.id);
export const statusAwardIds = commanderAwards.filter((award) => award.type === "status").map((award) => award.id);

export function awardDefinition(id: string) {
  return commanderAwards.find((award) => award.id === id);
}

export function isCommanderAwardId(value: string): value is CommanderAwardId {
  return commanderAwards.some((award) => award.id === value);
}

export function currentStatusAwardId(armyPosition: number | null | undefined): CommanderAwardId | null {
  if (!armyPosition || armyPosition < 1) return null;
  if (armyPosition === 1) return "RANK_1_ARMY";
  if (armyPosition <= 3) return "TOP_3_ARMY";
  if (armyPosition <= 10) return "TOP_10_ARMY";
  return null;
}
