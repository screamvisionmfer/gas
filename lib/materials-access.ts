import { createHmac, timingSafeEqual } from "node:crypto";
import { assetName, getFungibleTokenBalance, getWalletCollectionAssets } from "./helius";
import { materialsCatalog, type MaterialDefinition } from "./materials-catalog";
import { rankForCount } from "./ranks";
import { siteConfig } from "./site-config";

type AccessTokenPayload = {
  wallet: string;
  materialIds: string[];
  expiresAt: number;
};

function accessSecret() {
  const secret = process.env.MATERIALS_ACCESS_SECRET ?? process.env.HELIUS_API_KEY ?? process.env.NFT_API_KEY;
  if (!secret) throw new Error("Materials access is not configured.");
  return `gas-materials:${secret}`;
}

function signature(payload: string) {
  return createHmac("sha256", accessSecret()).update(payload).digest("base64url");
}

function recruitNumber(name: string) {
  const match = name.match(/#\s*0*(\d{1,4})(?:\D|$)/i);
  return match ? Number(match[1]) : undefined;
}

export function isMaterialUnlocked(material: MaterialDefinition, nftCount: number, recruitNumbers: Set<number>, tokenBalance: number) {
  const requirement = material.requirement;
  if (requirement.type === "rank") return nftCount >= requirement.minNfts;
  if (requirement.type === "nft") return recruitNumbers.has(requirement.recruitNumber);
  return tokenBalance >= requirement.minimumBalance;
}

export async function inspectMaterialsAccess(wallet: string) {
  const [collectionAssets, tokenBalance] = await Promise.all([
    getWalletCollectionAssets(wallet),
    getFungibleTokenBalance(wallet, siteConfig.contractAddress),
  ]);
  const numbers = new Set(collectionAssets.items.map((asset) => recruitNumber(assetName(asset))).filter((value): value is number => value !== undefined));
  const materialIds = materialsCatalog
    .filter((material) => isMaterialUnlocked(material, collectionAssets.total, numbers, tokenBalance))
    .map((material) => material.id);
  const rank = rankForCount(collectionAssets.total);

  return {
    wallet,
    nftCount: collectionAssets.total,
    rank: rank.name,
    rankImage: rank.image,
    tokenBalance,
    materialIds,
    accessToken: createMaterialsAccessToken({
      wallet,
      materialIds,
      expiresAt: Date.now() + 15 * 60 * 1000,
    }),
  };
}

export function createMaterialsAccessToken(payload: AccessTokenPayload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${signature(encoded)}`;
}

export function verifyMaterialsAccessToken(token: string, materialId: string) {
  const [encoded, suppliedSignature] = token.split(".");
  if (!encoded || !suppliedSignature) return null;
  const expectedSignature = signature(encoded);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as AccessTokenPayload;
    if (!payload.wallet || payload.expiresAt < Date.now() || !payload.materialIds.includes(materialId)) return null;
    return payload;
  } catch {
    return null;
  }
}

