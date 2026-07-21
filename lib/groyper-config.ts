const DEFAULT_TOKEN_MINT = "44eFuquSFU8aC6Nn3LWmNapFn8f5WzwxrYEnJXjspump";
const DEFAULT_DEXSCREENER_URL = `https://dexscreener.com/solana/${DEFAULT_TOKEN_MINT}`;

function configuredValue(value: string | undefined, fallback: string) {
  return value?.trim() || fallback;
}

export const groyperConfig = {
  chainId: "solana",
  tokenMint: configuredValue(process.env.NEXT_PUBLIC_GROYPER_TOKEN_MINT, DEFAULT_TOKEN_MINT),
  dexScreenerUrl: configuredValue(process.env.NEXT_PUBLIC_GROYPER_DEXSCREENER_URL, DEFAULT_DEXSCREENER_URL),
  dexScreenerPairAddress: process.env.GROYPER_DEXSCREENER_PAIR_ADDRESS?.trim() || null,
  marketCacheSeconds: 45,
} as const;

