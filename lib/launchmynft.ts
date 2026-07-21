import { siteConfig } from "./site-config";

type LaunchMyNftPageData = {
  props?: {
    pageProps?: {
      collection?: {
        totalMints?: number;
        maxSupply?: number;
        fractionMinted?: number;
      };
    };
  };
};

export async function getLaunchMyNftMintStats() {
  const response = await fetch(siteConfig.launchMyNftUrl, {
    cache: "no-store",
    redirect: "follow",
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error("LaunchMyNFT mint statistics are temporarily unavailable.");

  const html = await response.text();
  const nextData = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)?.[1];
  if (!nextData) throw new Error("LaunchMyNFT returned an invalid statistics page.");

  const payload = JSON.parse(nextData) as LaunchMyNftPageData;
  const collection = payload.props?.pageProps?.collection;
  const totalMints = Number(collection?.totalMints);
  const maxSupply = Number(collection?.maxSupply);
  if (!Number.isFinite(totalMints) || !Number.isFinite(maxSupply) || maxSupply <= 0) {
    throw new Error("LaunchMyNFT returned invalid mint statistics.");
  }

  return {
    totalMints: Math.max(0, Math.min(maxSupply, totalMints)),
    maxSupply,
    fractionMinted: Number.isFinite(Number(collection?.fractionMinted))
      ? Number(collection?.fractionMinted)
      : totalMints / maxSupply,
  };
}
