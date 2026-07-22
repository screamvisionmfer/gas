import type { OwnedNft, SquadronResult } from "./types";
import type { Soldier } from "./commander-hq-types";
import type { PublicCommanderProfile } from "./commander-profile-types";
import type { VerifiedCommanderIdentity } from "./commander-profile-auth";
import { verifySquadron } from "./nft-verification";
import { getCommanderProfileByPrivyId, setCommanderFeaturedSoldier, upsertCommanderProfile } from "./commander-profile-store";

export class CommanderProfileServiceError extends Error {
  constructor(message: string, public readonly code: string, public readonly status: number) {
    super(message);
  }
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "unranked";
}

function traitValue(nft: OwnedNft, traitName: string) {
  return nft.attributes?.find((attribute) => attribute.trait_type.toLowerCase() === traitName.toLowerCase())?.value;
}

export function nftToSoldier(nft: OwnedNft): Soldier {
  const metadataRank = traitValue(nft, "Ranks");
  return {
    mint: nft.mint,
    name: nft.name,
    image: nft.image || "/logo.png",
    rarity: nft.rarityRank ? `#${nft.rarityRank}` : undefined,
    rank: metadataRank === undefined ? undefined : String(metadataRank),
    traits: (nft.attributes ?? []).map((attribute) => ({ traitType: attribute.trait_type, value: String(attribute.value) })),
  };
}

function progressToNextRank(result: SquadronResult) {
  if (!result.nextRank) return 100;
  const range = result.nextRank.min - result.rank.min;
  return range <= 0 ? 0 : Math.max(0, Math.min(100, Math.round(((result.count - result.rank.min) / range) * 100)));
}

function orderedSoldiers(result: SquadronResult) {
  const soldiers = result.ownedNfts.map(nftToSoldier);
  if (!result.bestRecruit) return soldiers;
  const index = soldiers.findIndex((soldier) => soldier.mint === result.bestRecruit?.mint);
  return index > 0 ? [soldiers[index], ...soldiers.slice(0, index), ...soldiers.slice(index + 1)] : soldiers;
}

async function scanArmy(identity: VerifiedCommanderIdentity) {
  try {
    return await verifySquadron(identity.primaryWallet, { nftLimit: 1000 });
  } catch {
    throw new CommanderProfileServiceError("The on-chain Army scan could not be completed.", "PROFILE_SYNC_FAILED", 502);
  }
}

export async function syncCommanderProfile(identity: VerifiedCommanderIdentity, options: { publish: boolean; bypassRateLimit?: boolean } = { publish: true }) {
  const current = await getCommanderProfileByPrivyId(identity.privyId);
  if (current && !options.bypassRateLimit) {
    const elapsed = Date.now() - new Date(current.armyLastSyncedAt).getTime();
    if (elapsed < 60_000) {
      const retryAfter = Math.max(1, Math.ceil((60_000 - elapsed) / 1000));
      throw new CommanderProfileServiceError(`Personnel sync is available again in ${retryAfter} seconds.`, "PROFILE_SYNC_RATE_LIMITED", 429);
    }
  }

  const result = await scanArmy(identity);
  const army = orderedSoldiers(result);
  const selected = current?.featuredSoldierMint
    ? army.find((soldier) => soldier.mint === current.featuredSoldierMint)
    : undefined;
  const best = result.bestRecruit ? nftToSoldier(result.bestRecruit) : army[0];
  const featuredSoldier = selected ?? best;
  const syncedAt = new Date().toISOString();

  return upsertCommanderProfile({
    privyId: identity.privyId,
    username: identity.username,
    usernameNormalized: identity.usernameNormalized,
    displayName: identity.displayName,
    avatarUrl: identity.avatarUrl,
    primaryWallet: identity.primaryWallet,
    memberSince: identity.memberSince,
    isPublic: options.publish || current?.isPublic === true,
    featuredSoldierMint: featuredSoldier?.mint,
    featuredSoldier,
    army,
    armySize: result.count,
    rank: { id: slug(result.rank.name), name: result.rank.name, unit: result.unitName, insignia: result.rank.image },
    nextRank: result.nextRank ? { name: result.nextRank.name, soldiersNeeded: result.recruitsUntilNextRank ?? 0, progress: progressToNextRank(result) } : undefined,
    commanderScore: undefined,
    groyperBalance: undefined,
    armyLastSyncedAt: syncedAt,
  });
}

export async function chooseFeaturedSoldier(identity: VerifiedCommanderIdentity, mint: string) {
  const profile = await getCommanderProfileByPrivyId(identity.privyId);
  if (!profile) throw new CommanderProfileServiceError("Create a public profile first.", "PROFILE_NOT_FOUND", 404);
  const result = await scanArmy(identity);
  const owned = result.ownedNfts.find((nft) => nft.mint === mint);
  if (!owned) throw new CommanderProfileServiceError("That soldier is not owned by the verified primary wallet.", "WALLET_OWNERSHIP_MISMATCH", 403);
  const updated = await setCommanderFeaturedSoldier(identity.privyId, mint, nftToSoldier(owned));
  if (!updated) throw new CommanderProfileServiceError("Commander profile not found.", "PROFILE_NOT_FOUND", 404);
  return updated;
}

export function publicProfileUrl(profile: Pick<PublicCommanderProfile, "usernameNormalized">) {
  return `https://www.groypersquadron.xyz/commander/${encodeURIComponent(profile.usernameNormalized)}`;
}

