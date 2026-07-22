import { commanderAwards, currentStatusAwardId, isCommanderAwardId, RARE_ASSET_MAX_RARITY_RANK } from "./commander-awards-config";
import { getCommanderLeaderboardPositionByProfileId } from "./commander-leaderboard-store";
import { getCommanderPermanentAwardRows, getCommanderPublicationPosition, unlockCommanderAwards } from "./commander-awards-store";
import type { CommanderAward, CommanderAwardId, CommanderAwardSummary } from "./commander-awards-types";
import type { PublicCommanderProfile } from "./commander-profile-types";

function featuredRarityRank(profile: PublicCommanderProfile) {
  const value = profile.featuredSoldier?.rarity?.trim();
  const match = value?.match(/^#(\d+)$/);
  return match ? Number(match[1]) : null;
}

async function permanentAwardsFor(profile: PublicCommanderProfile) {
  const awards: CommanderAwardId[] = [];
  if (profile.isPublic) awards.push("FIRST_DEPLOYMENT");
  if (profile.armySize >= 5) awards.push("ARMY_5");
  if (profile.armySize >= 10) awards.push("ARMY_10");
  if (profile.armySize >= 25) awards.push("ARMY_25");
  if (profile.armySize >= 50) awards.push("ARMY_50");
  if (profile.armySize >= 100) awards.push("ARMY_100");

  const publicationPosition = profile.isPublic ? await getCommanderPublicationPosition(profile.id) : null;
  if (publicationPosition && publicationPosition <= 25) awards.push("OLD_GUARD");

  const rarityRank = featuredRarityRank(profile);
  if (rarityRank !== null && rarityRank <= RARE_ASSET_MAX_RARITY_RANK) awards.push("RARE_ASSET");
  return awards;
}

export async function evaluateCommanderAwards(profile: PublicCommanderProfile): Promise<CommanderAwardSummary> {
  const qualifying = await permanentAwardsFor(profile);
  if (qualifying.length > 0) await unlockCommanderAwards(profile.id, qualifying);
  return getCommanderAwardSummary(profile);
}

export async function getCommanderAwardSummary(profile: PublicCommanderProfile): Promise<CommanderAwardSummary> {
  const [stored, positions] = await Promise.all([
    getCommanderPermanentAwardRows(profile.id),
    profile.isPublic ? getCommanderLeaderboardPositionsByProfile(profile) : Promise.resolve(null),
  ]);
  const storedMap = new Map(stored.filter((row) => isCommanderAwardId(row.award_id)).map((row) => [row.award_id, new Date(row.unlocked_at).toISOString()]));
  const activeStatus = currentStatusAwardId(positions?.army);

  const medals: CommanderAward[] = commanderAwards.filter((award) => award.type === "permanent").map((award) => ({ ...award, unlocked: storedMap.has(award.id), unlockedAt: storedMap.get(award.id) }));
  const statuses: CommanderAward[] = commanderAwards.filter((award) => award.type === "status").map((award) => ({ ...award, unlocked: award.id === activeStatus }));
  const unlocked = [...statuses.filter((award) => award.unlocked), ...medals.filter((award) => award.unlocked)]
    .sort((a, b) => b.publicPriority - a.publicPriority);

  return { medals, statuses, unlocked, unlockedCount: unlocked.length, totalCount: commanderAwards.length, evaluatedAt: new Date().toISOString() };
}

async function getCommanderLeaderboardPositionsByProfile(profile: PublicCommanderProfile) {
  return getCommanderLeaderboardPositionByProfileId(profile.id);
}
