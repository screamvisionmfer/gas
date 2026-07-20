import { nextRankForCount, rankForCount } from "./ranks";
import { assetImage, assetName, getWalletCollectionAssets } from "./helius";
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
  const ownedNfts: OwnedNft[] = collectionAssets.items.slice(0, 5).map((asset) => ({
    mint: asset.id,
    name: assetName(asset),
    image: assetImage(asset),
  }));

  return {
    wallet,
    count,
    ownedNfts,
    rank,
    unitName: rank.unitName,
    nextRank,
    recruitsUntilNextRank: nextRank ? nextRank.min - count : undefined,
  };
}
