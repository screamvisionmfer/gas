import { nextRankForCount, rankForCount } from "./ranks";
import { assetAttributes, assetImage, assetName, assetRarityRank, assetRarityScore, getWalletCollectionAssets } from "./helius";
import { getBestRecruit } from "./best-recruit";
import type { OwnedNft, SquadronResult } from "./types";

export function isSolanaAddress(value: string) {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value);
}

export async function verifySquadron(wallet: string): Promise<SquadronResult> {
  if (!isSolanaAddress(wallet)) throw new Error("Enter a valid Solana wallet address.");

  const collectionAssets = await getWalletCollectionAssets(wallet);
  const count = collectionAssets.total;
  const rank = rankForCount(count);
  const nextRank = nextRankForCount(count);
  const allOwnedNfts: OwnedNft[] = collectionAssets.items.map((asset) => ({
    mint: asset.id,
    name: assetName(asset),
    image: assetImage(asset),
    attributes: assetAttributes(asset),
    rarityScore: assetRarityScore(asset),
    rarityRank: assetRarityRank(asset),
  }));
  const bestRecruit = getBestRecruit(allOwnedNfts);

  return {
    wallet,
    count,
    ownedNfts: allOwnedNfts.slice(0, 5),
    bestRecruit,
    rank,
    unitName: rank.unitName,
    nextRank,
    recruitsUntilNextRank: nextRank ? nextRank.min - count : undefined,
  };
}
