import { nextRankForCount, rankForCount } from "./ranks";
import type { OwnedNft, SquadronResult } from "./types";

export function isSolanaAddress(value: string) {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value);
}

function mockOwnedNfts(count: number): OwnedNft[] {
  return Array.from({ length: Math.min(count, 5) }, (_, index) => ({
    mint: `mock-mint-${index + 1}`,
    name: `GAS Recruit #${String(index + 1).padStart(3, "0")}`,
    image: "/logo.png",
  }));
}

export async function verifySquadron(wallet: string): Promise<SquadronResult> {
  if (!isSolanaAddress(wallet)) throw new Error("Enter a valid Solana wallet address.");

  const apiKey = process.env.NFT_API_KEY;
  const collectionAddress = process.env.COLLECTION_ADDRESS;

  // TODO: Replace this deterministic mock adapter with the existing Bobros Cartel
  // verification request once its endpoint and response contract are provided.
  // Keep that request here, map its NFT records into OwnedNft[], and leave the API
  // route unchanged so credentials remain server-side.
  void apiKey;
  void collectionAddress;
  const seed = [...wallet].reduce((total, char) => total + char.charCodeAt(0), 0);
  const count = seed % 58;
  const rank = rankForCount(count);
  const nextRank = nextRankForCount(count);

  return {
    wallet,
    count,
    ownedNfts: mockOwnedNfts(count),
    rank,
    unitName: rank.unitName,
    nextRank,
    recruitsUntilNextRank: nextRank ? nextRank.min - count : undefined,
  };
}

