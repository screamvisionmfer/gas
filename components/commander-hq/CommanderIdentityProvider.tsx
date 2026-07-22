"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  PrivyProvider,
  useConnectWallet,
  useLinkWithSiws,
  useLoginWithOAuth,
  usePrivy,
  type BaseConnectedWalletType,
  type User,
} from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";
import type { CommanderIdentity } from "@/lib/commander-hq-types";

type IdentityOperation = "idle" | "login" | "connecting" | "linking" | "logout";

type CommanderIdentityContextValue = {
  configured: boolean;
  ready: boolean;
  authenticated: boolean;
  identity: CommanderIdentity | null;
  operation: IdentityOperation;
  error: string;
  getAuthToken: () => Promise<string | null>;
  continueWithX: () => void;
  connectWallet: () => void;
  logout: () => Promise<void>;
};

const unconfiguredIdentity: CommanderIdentityContextValue = {
  configured: false,
  ready: true,
  authenticated: false,
  identity: null,
  operation: "idle",
  error: "PRIVY APP ID IS NOT CONFIGURED",
  getAuthToken: async () => null,
  continueWithX: () => undefined,
  connectWallet: () => undefined,
  logout: async () => undefined,
};

const CommanderIdentityContext = createContext<CommanderIdentityContextValue>(unconfiguredIdentity);
const solanaConnectors = toSolanaWalletConnectors({ shouldAutoConnect: false });

function toCommanderIdentity(user: User | null): CommanderIdentity | null {
  if (!user?.twitter) return null;

  const linkedAccounts = Array.isArray(user.linkedAccounts) ? user.linkedAccounts : [];
  const externalSolanaAddresses = linkedAccounts.flatMap((account) => {
    if (account.type !== "wallet" || account.chainType !== "solana" || account.walletClientType === "privy" || account.walletClientType === "privy-v2") return [];
    return [account.address];
  });
  const externalSolanaWallets = externalSolanaAddresses.map((address, index) => ({ address, primary: index === 0 }));

  return {
    privyId: user.id,
    twitter: {
      id: user.twitter.subject,
      username: user.twitter.username ?? "commander",
      displayName: user.twitter.name ?? user.twitter.username ?? "GAS Commander",
      profileImage: user.twitter.profilePictureUrl ?? undefined,
    },
    wallets: externalSolanaWallets,
    createdAt: String(user.createdAt),
  };
}

function signatureToBase64(signature: Uint8Array) {
  let binary = "";
  for (const byte of signature) binary += String.fromCharCode(byte);
  return window.btoa(binary);
}

function CommanderIdentityState({ children }: { children: ReactNode }) {
  const { ready, authenticated, user, logout: privyLogout, getAccessToken } = usePrivy();
  const [linkedUser, setLinkedUser] = useState<User | null>(null);
  const [operation, setOperation] = useState<IdentityOperation>("idle");
  const [error, setError] = useState("");
  const { initOAuth, loading: oauthLoading } = useLoginWithOAuth({
    onComplete: ({ user: authenticatedUser }) => {
      setLinkedUser(authenticatedUser);
      setOperation("idle");
      setError("");
    },
    onError: (oauthError) => {
      setOperation("idle");
      setError(`X AUTHENTICATION FAILED · ${String(oauthError)}`);
    },
  });
  const { generateSiwsMessage, linkWithSiws } = useLinkWithSiws();

  async function linkSolanaWallet(wallet: BaseConnectedWalletType) {
    if (wallet.type !== "solana") {
      setOperation("idle");
      setError("A SOLANA WALLET IS REQUIRED");
      return;
    }

    try {
      setOperation("linking");
      const activeWallet = wallet.provider;
      const message = await generateSiwsMessage({ address: activeWallet.address });
      const encodedMessage = new TextEncoder().encode(message);
      const result = await activeWallet.signMessage({ message: encodedMessage });
      const linked = await linkWithSiws({
        message,
        signature: signatureToBase64(result.signature),
        walletClientType: activeWallet.standardWallet.name.toLowerCase().replaceAll(" ", "_"),
        connectorType: "injected",
      });
      setLinkedUser(linked.user);
      setOperation("idle");
    } catch (linkError) {
      setOperation("idle");
      setError(linkError instanceof Error ? linkError.message : "WALLET LINKING FAILED");
    }
  }

  const { connectWallet: openWalletSelector } = useConnectWallet({
    onSuccess: ({ wallet }) => void linkSolanaWallet(wallet),
    onError: (walletError) => {
      setOperation("idle");
      setError(String(walletError || "WALLET CONNECTION CANCELLED"));
    },
  });

  function continueWithX() {
    if (oauthLoading || operation !== "idle") return;
    setError("");
    setOperation("login");
    void initOAuth({ provider: "twitter" }).catch((loginError) => {
      setOperation("idle");
      setError(loginError instanceof Error ? loginError.message : "X AUTHENTICATION FAILED");
    });
  }

  function connectWallet() {
    if (!authenticated || operation !== "idle") return;
    setError("");
    setOperation("connecting");
    openWalletSelector({
      walletChainType: "solana-only",
      walletList: ["phantom", "solflare", "backpack", "detected_solana_wallets", "wallet_connect_qr_solana"],
      description: "Link an existing Solana wallet to your Commander identity. No transaction will be requested.",
    });
  }

  async function logout() {
    if (operation !== "idle") return;
    setOperation("logout");
    setError("");
    try {
      await privyLogout();
      setLinkedUser(null);
    } finally {
      setOperation("idle");
    }
  }

  const identity = useMemo(() => toCommanderIdentity(linkedUser ?? user), [linkedUser, user]);
  const value: CommanderIdentityContextValue = {
    configured: true,
    ready,
    authenticated,
    identity,
    operation: oauthLoading ? "login" : operation,
    error,
    getAuthToken: getAccessToken,
    continueWithX,
    connectWallet,
    logout,
  };

  return <CommanderIdentityContext.Provider value={value}>{children}</CommanderIdentityContext.Provider>;
}

export function CommanderIdentityProvider({ children }: { children: ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID?.trim();

  if (!appId) {
    return <CommanderIdentityContext.Provider value={unconfiguredIdentity}>{children}</CommanderIdentityContext.Provider>;
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ["twitter"],
        appearance: {
          walletChainType: "solana-only",
          walletList: ["phantom", "solflare", "backpack", "detected_solana_wallets", "wallet_connect_qr_solana"],
          accentColor: "#d8ac2e",
          theme: "dark",
          logo: "/logo.png",
        },
        externalWallets: { solana: { connectors: solanaConnectors } },
        embeddedWallets: {
          ethereum: { createOnLogin: "off" },
          solana: { createOnLogin: "off" },
          showWalletUIs: false,
        },
      }}
    >
      <CommanderIdentityState>{children}</CommanderIdentityState>
    </PrivyProvider>
  );
}

export function useCommanderIdentity() {
  return useContext(CommanderIdentityContext);
}
