import { traitWeights } from "./banner-config";
import type { Attribute, OwnedNft } from "./types";

function finiteNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function traitWeight(attributes: Attribute[] = []) {
  return attributes.reduce((total, attribute) => {
    const traitValues = traitWeights[attribute.trait_type];
    return total + (traitValues?.[String(attribute.value)] ?? 0);
  }, 0);
}

export function getBestRecruit(ownedNfts: OwnedNft[]) {
  if (ownedNfts.length === 0) return null;

  const scored = ownedNfts
    .map((nft) => ({ nft, score: finiteNumber(nft.rarityScore) }))
    .filter((entry): entry is { nft: OwnedNft; score: number } => entry.score !== undefined);
  if (scored.length > 0) return scored.reduce((best, entry) => entry.score > best.score ? entry : best).nft;

  const ranked = ownedNfts
    .map((nft) => ({ nft, rank: finiteNumber(nft.rarityRank) }))
    .filter((entry): entry is { nft: OwnedNft; rank: number } => entry.rank !== undefined && entry.rank > 0);
  if (ranked.length > 0) return ranked.reduce((best, entry) => entry.rank < best.rank ? entry : best).nft;

  const weighted = ownedNfts.map((nft) => ({ nft, score: traitWeight(nft.attributes) }));
  const bestWeighted = weighted.reduce((best, entry) => entry.score > best.score ? entry : best);
  return bestWeighted.score > 0 ? bestWeighted.nft : ownedNfts[0];
}
