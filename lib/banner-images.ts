import { siteConfig } from "./site-config";

const allowedImageHosts = new Set([
  "www.groypersquadron.xyz",
  "groypersquadron.xyz",
  "cdn.helius-rpc.com",
  "ipfs.io",
  "gateway.pinata.cloud",
  "arweave.net",
]);

export function absoluteSiteAsset(path: string) {
  return new URL(path, siteConfig.canonicalUrl).toString();
}

export function normalizeBannerImageUrl(source?: string) {
  const fallback = absoluteSiteAsset(siteConfig.banner.logoPath);
  if (!source) return fallback;

  const normalized = source.startsWith("ipfs://")
    ? `https://ipfs.io/ipfs/${source.slice("ipfs://".length).replace(/^ipfs\//, "")}`
    : source;

  try {
    const url = normalized.startsWith("/")
      ? new URL(normalized, siteConfig.canonicalUrl)
      : new URL(normalized);
    if (url.protocol !== "https:" || !allowedImageHosts.has(url.hostname.toLowerCase())) return fallback;
    return url.toString();
  } catch {
    return fallback;
  }
}
