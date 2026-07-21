import { siteConfig } from "./site-config";
import type { Attribute } from "./types";

type DasFile = {
  uri?: string;
  cdn_uri?: string;
  mime?: string;
};

export type DasAsset = {
  id: string;
  burnt?: boolean;
  content?: {
    metadata?: {
      name?: string;
      attributes?: Attribute[];
      rarity_score?: number | string;
      rarityScore?: number | string;
    };
    files?: DasFile[];
    links?: { image?: string };
  };
  ownership?: {
    owner?: string;
  };
};

type ParsedTokenAccount = {
  account?: {
    data?: {
      parsed?: {
        info?: {
          tokenAmount?: { uiAmountString?: string; uiAmount?: number };
        };
      };
    };
  };
};

type DasAssetList = {
  total?: number;
  items?: DasAsset[];
};

type HeliusRpcResponse<T> = {
  result?: T;
  error?: { code?: number; message?: string };
};

function apiKey() {
  return process.env.HELIUS_API_KEY ?? process.env.NFT_API_KEY;
}

export function collectionAddress() {
  return process.env.COLLECTION_ADDRESS ?? siteConfig.collectionAddress;
}

async function heliusRpc<T>(method: string, params: unknown): Promise<T> {
  const key = apiKey();
  if (!key) throw new Error("Helius API key is not configured.");

  const response = await fetch(`https://mainnet.helius-rpc.com/?api-key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: `gas-${method}`, method, params }),
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error("Squadron scanner is temporarily rate limited.");
    throw new Error("Helius is temporarily unavailable.");
  }

  const payload = await response.json() as HeliusRpcResponse<T>;
  if (payload.error || !payload.result) throw new Error(payload.error?.message ?? "Helius returned an invalid response.");
  return payload.result;
}

export async function getFungibleTokenBalance(ownerAddress: string, mintAddress: string) {
  const result = await heliusRpc<{ value?: ParsedTokenAccount[] }>("getTokenAccountsByOwner", [
    ownerAddress,
    { mint: mintAddress },
    { encoding: "jsonParsed", commitment: "confirmed" },
  ]);

  return (result.value ?? []).reduce((total, item) => {
    const tokenAmount = item.account?.data?.parsed?.info?.tokenAmount;
    const balance = Number(tokenAmount?.uiAmountString ?? tokenAmount?.uiAmount ?? 0);
    return total + (Number.isFinite(balance) ? balance : 0);
  }, 0);
}

export async function getCollectionAssets() {
  const result = await heliusRpc<DasAssetList>("getAssetsByGroup", {
    groupKey: "collection",
    groupValue: collectionAddress(),
    page: 1,
    limit: 1000,
  });

  return {
    total: result.total ?? result.items?.length ?? 0,
    items: (result.items ?? []).filter((asset) => !asset.burnt),
  };
}

export async function getWalletCollectionAssets(ownerAddress: string) {
  const result = await heliusRpc<DasAssetList>("searchAssets", {
    ownerAddress,
    grouping: ["collection", collectionAddress()],
    tokenType: "nonFungible",
    page: 1,
    limit: 1000,
    options: {
      showGrandTotal: true,
      showUnverifiedCollections: false,
      showZeroBalance: false,
    },
  });

  return {
    total: result.total ?? result.items?.length ?? 0,
    items: (result.items ?? []).filter((asset) => !asset.burnt),
  };
}

export function assetName(asset: DasAsset) {
  return asset.content?.metadata?.name?.trim() || `GAS Recruit ${asset.id.slice(0, 5)}`;
}

export function assetImage(asset: DasAsset) {
  const files = asset.content?.files ?? [];
  const image = files.find((file) => file.mime?.startsWith("image/")) ?? files[0];
  return image?.cdn_uri ?? image?.uri ?? asset.content?.links?.image ?? "/logo.png";
}

export function assetAttributes(asset: DasAsset) {
  const attributes = asset.content?.metadata?.attributes;
  return Array.isArray(attributes)
    ? attributes.filter((attribute) => attribute && typeof attribute.trait_type === "string" && (typeof attribute.value === "string" || typeof attribute.value === "number"))
    : [];
}

function metadataNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function assetRarityScore(asset: DasAsset) {
  const metadata = asset.content?.metadata;
  return metadataNumber(metadata?.rarity_score ?? metadata?.rarityScore);
}

export function assetRarityRank(asset: DasAsset) {
  const rarityAttribute = assetAttributes(asset).find((attribute) => attribute.trait_type.toLowerCase() === "rarity rank");
  return metadataNumber(rarityAttribute?.value);
}
