import { PrivyClient, type User } from "@privy-io/server-auth";
import { hasCommanderApiSession } from "./commander-api-auth";

export class CommanderProfileAuthError extends Error {
  constructor(message: string, public readonly code: string, public readonly status: number) {
    super(message);
  }
}

let privyClient: PrivyClient | null = null;

function getPrivyClient() {
  const appId = (process.env.PRIVY_APP_ID ?? process.env.NEXT_PUBLIC_PRIVY_APP_ID)?.trim();
  const appSecret = process.env.PRIVY_APP_SECRET?.trim();
  if (!appId || !appSecret) throw new CommanderProfileAuthError("Privy server verification is not configured.", "PRIVY_SERVER_NOT_CONFIGURED", 503);
  privyClient ??= new PrivyClient(appId, appSecret);
  return privyClient;
}

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  return authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
}

function externalSolanaWallets(user: User) {
  return user.linkedAccounts.flatMap((account) => {
    if (account.type !== "wallet" || account.chainType !== "solana") return [];
    if (account.walletClientType === "privy" || account.walletClientType === "privy-v2") return [];
    return [account.address];
  });
}

export type VerifiedCommanderIdentity = {
  privyId: string;
  username: string;
  usernameNormalized: string;
  displayName: string;
  avatarUrl?: string;
  primaryWallet: string;
  memberSince: string;
};

export async function requireVerifiedCommander(request: Request): Promise<VerifiedCommanderIdentity> {
  if (!(await hasCommanderApiSession())) {
    throw new CommanderProfileAuthError("Commander HQ session required.", "COMMANDER_SESSION_REQUIRED", 401);
  }

  const token = bearerToken(request);
  if (!token) throw new CommanderProfileAuthError("Privy access token required.", "PRIVY_TOKEN_REQUIRED", 401);

  try {
    const client = getPrivyClient();
    const claims = await client.verifyAuthToken(token);
    const user = await client.getUserById(claims.userId);
    const twitter = user.twitter;
    const username = twitter?.username?.replace(/^@/, "").trim();
    if (!twitter || !username) throw new CommanderProfileAuthError("A verified X username is required.", "X_USERNAME_REQUIRED", 422);

    const wallets = externalSolanaWallets(user);
    const primaryWallet = wallets[0];
    if (!primaryWallet) throw new CommanderProfileAuthError("A SIWS-verified external Solana wallet is required.", "WALLET_OWNERSHIP_MISMATCH", 403);

    return {
      privyId: user.id,
      username,
      usernameNormalized: username.toLowerCase(),
      displayName: twitter.name?.trim() || username,
      avatarUrl: twitter.profilePictureUrl ?? undefined,
      primaryWallet,
      memberSince: user.createdAt.toISOString(),
    };
  } catch (error) {
    if (error instanceof CommanderProfileAuthError) throw error;
    throw new CommanderProfileAuthError("Privy verification failed.", "PRIVY_VERIFICATION_FAILED", 401);
  }
}

