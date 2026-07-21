export type SolanaWalletName = "Phantom" | "Solflare" | "Backpack" | "Solana Wallet";

type PublicKeyLike = {
  toString: () => string;
};

export type SolanaWalletProvider = {
  connect: (options?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey?: PublicKeyLike } | void>;
  publicKey?: PublicKeyLike | null;
  isPhantom?: boolean;
  isSolflare?: boolean;
  isBackpack?: boolean;
};

declare global {
  interface Window {
    solana?: SolanaWalletProvider;
    phantom?: { solana?: SolanaWalletProvider };
    solflare?: SolanaWalletProvider;
    backpack?: SolanaWalletProvider;
  }
}

function providerName(provider: SolanaWalletProvider, fallback: SolanaWalletName): SolanaWalletName {
  if (provider.isPhantom) return "Phantom";
  if (provider.isSolflare) return "Solflare";
  if (provider.isBackpack) return "Backpack";
  return fallback;
}

export function detectSolanaWallets() {
  if (typeof window === "undefined") return [];

  const candidates: Array<[SolanaWalletName, SolanaWalletProvider | undefined]> = [
    ["Phantom", window.phantom?.solana],
    ["Solflare", window.solflare],
    ["Backpack", window.backpack],
    ["Solana Wallet", window.solana],
  ];
  const seen = new Set<SolanaWalletProvider>();

  return candidates.flatMap(([fallbackName, provider]) => {
    if (!provider || typeof provider.connect !== "function" || seen.has(provider)) return [];
    seen.add(provider);
    return [{ name: providerName(provider, fallbackName), provider }];
  });
}

export async function connectReadOnlySolanaWallet() {
  const detected = detectSolanaWallets();
  if (!detected.length) throw new Error("No compatible Solana wallet extension found.");

  const selected = detected[0];
  const connection = await selected.provider.connect();
  const publicKey = connection?.publicKey ?? selected.provider.publicKey;
  const address = publicKey?.toString().trim() ?? "";
  if (!address) throw new Error("The wallet did not provide a public address.");

  return { address, walletName: selected.name };
}
