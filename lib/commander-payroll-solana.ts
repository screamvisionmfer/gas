import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAccount,
  getAssociatedTokenAddressSync,
  getMint,
} from "@solana/spl-token";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import type { PayrollTestConfig } from "./commander-payroll-types";

const DEVNET_GENESIS_HASH = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1";
const CONFIRMATION_TIMEOUT_MS = 60_000;

type PreparedTestTransfer = {
  connection: Connection;
  transaction: Transaction;
  latestBlockhash: Awaited<ReturnType<Connection["getLatestBlockhash"]>>;
  rawAmount: bigint;
  decimals: number;
};

function validPublicKey(value: string) {
  try {
    return new PublicKey(value).toBase58() === value;
  } catch {
    return false;
  }
}

export function payrollTestConfig(): PayrollTestConfig {
  const enabled = process.env.NEXT_PUBLIC_GAS_TEST_MODE?.trim().toLowerCase() === "true";
  const rpcUrl = process.env.NEXT_PUBLIC_GAS_TEST_RPC_URL?.trim() ?? "";
  const tokenMint = process.env.NEXT_PUBLIC_GAS_TEST_TOKEN_MINT?.trim() ?? "";
  const warChest = process.env.NEXT_PUBLIC_GAS_TEST_WAR_CHEST?.trim() ?? "";
  let error = "";

  if (!enabled) error = "TEST MODE IS DISABLED";
  else if (!rpcUrl) error = "DEVNET RPC URL IS MISSING";
  else {
    try {
      const parsed = new URL(rpcUrl);
      if (!['https:', 'http:'].includes(parsed.protocol)) error = "DEVNET RPC URL IS INVALID";
    } catch {
      error = "DEVNET RPC URL IS INVALID";
    }
  }
  if (!error && !validPublicKey(tokenMint)) error = "TEST TOKEN MINT IS INVALID";
  if (!error && !validPublicKey(warChest)) error = "TEST WAR CHEST IS INVALID";

  return { enabled, configured: !error, rpcUrl, tokenMint, warChest, explorerCluster: "devnet", error: error || undefined };
}

export function testExplorerUrl(signature: string) {
  return `https://explorer.solana.com/tx/${encodeURIComponent(signature)}?cluster=devnet`;
}

export function shortenSignature(signature: string) {
  return signature.length > 18 ? `${signature.slice(0, 8)}…${signature.slice(-8)}` : signature;
}

async function verifiedDevnetConnection(config: PayrollTestConfig) {
  if (!config.configured) throw new Error(config.error ?? "TEST NETWORK NOT CONFIGURED");
  const connection = new Connection(config.rpcUrl, "confirmed");
  const genesisHash = await connection.getGenesisHash();
  if (genesisHash !== DEVNET_GENESIS_HASH) throw new Error("RPC SAFETY CHECK FAILED — DEVNET REQUIRED");
  return connection;
}

function rawTokenAmount(uiAmount: number, decimals: number) {
  if (!Number.isFinite(uiAmount) || uiAmount <= 0) throw new Error("INVALID TEST $GAS AMOUNT");
  const scale = 10 ** decimals;
  const scaled = uiAmount * scale;
  if (!Number.isSafeInteger(scaled)) throw new Error("TEST $GAS AMOUNT EXCEEDS SAFE PRECISION");
  return BigInt(Math.round(scaled));
}

export async function prepareTestGasTransfer(config: PayrollTestConfig, ownerAddress: string, amountGas: number): Promise<PreparedTestTransfer> {
  const connection = await verifiedDevnetConnection(config);
  const owner = new PublicKey(ownerAddress);
  const mint = new PublicKey(config.tokenMint);
  const warChest = new PublicKey(config.warChest);
  const mintAccount = await connection.getAccountInfo(mint, "confirmed");
  if (!mintAccount || !mintAccount.owner.equals(TOKEN_PROGRAM_ID)) throw new Error("CONFIGURED TEST MINT IS NOT A STANDARD DEVNET SPL TOKEN");
  const mintInfo = await getMint(connection, mint, "confirmed", TOKEN_PROGRAM_ID);
  const sourceAta = getAssociatedTokenAddressSync(mint, owner, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
  const destinationAta = getAssociatedTokenAddressSync(mint, warChest, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
  const rawAmount = rawTokenAmount(amountGas, mintInfo.decimals);

  let sourceAccount;
  try {
    sourceAccount = await getAccount(connection, sourceAta, "confirmed", TOKEN_PROGRAM_ID);
  } catch {
    throw new Error("NO TEST $GAS TOKEN ACCOUNT FOUND ON DEVNET");
  }
  if (sourceAccount.amount < rawAmount) throw new Error("INSUFFICIENT TEST $GAS BALANCE");

  const latestBlockhash = await connection.getLatestBlockhash("confirmed");
  const transaction = new Transaction({
    feePayer: owner,
    blockhash: latestBlockhash.blockhash,
    lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
  });
  transaction.add(
    createAssociatedTokenAccountIdempotentInstruction(owner, destinationAta, warChest, mint, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID),
    createTransferCheckedInstruction(sourceAta, mint, destinationAta, owner, rawAmount, mintInfo.decimals, [], TOKEN_PROGRAM_ID),
  );
  return { connection, transaction, latestBlockhash, rawAmount, decimals: mintInfo.decimals };
}

export function serializeUnsignedTestTransaction(transaction: Transaction) {
  return transaction.serialize({ requireAllSignatures: false, verifySignatures: false });
}

export async function broadcastAndConfirmTestTransfer(prepared: PreparedTestTransfer, signedTransaction: Uint8Array) {
  const signature = await prepared.connection.sendRawTransaction(signedTransaction, { preflightCommitment: "confirmed", skipPreflight: false, maxRetries: 3 });
  const confirmation = prepared.connection.confirmTransaction({ signature, ...prepared.latestBlockhash }, "confirmed");
  const timeout = new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error("DEVNET CONFIRMATION TIMED OUT — CHECK EXPLORER BEFORE RETRYING")), CONFIRMATION_TIMEOUT_MS));
  const result = await Promise.race([confirmation, timeout]);
  if (result.value.err) throw new Error("DEVNET TRANSACTION FAILED DURING CONFIRMATION");
  return signature;
}

export async function fetchTestWarChestBalance(config: PayrollTestConfig) {
  const connection = await verifiedDevnetConnection(config);
  const mint = new PublicKey(config.tokenMint);
  const warChest = new PublicKey(config.warChest);
  const mintInfo = await getMint(connection, mint, "confirmed", TOKEN_PROGRAM_ID);
  const destinationAta = getAssociatedTokenAddressSync(mint, warChest, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
  try {
    const account = await getAccount(connection, destinationAta, "confirmed", TOKEN_PROGRAM_ID);
    return Number(account.amount) / (10 ** mintInfo.decimals);
  } catch {
    return 0;
  }
}

export function payrollTransactionError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "TEST TRANSACTION FAILED");
  const normalized = message.toLowerCase();
  if (normalized.includes("reject") || normalized.includes("declin") || normalized.includes("cancel")) return "TRANSACTION REJECTED IN WALLET";
  if (normalized.includes("insufficient") && normalized.includes("gas")) return "INSUFFICIENT TEST $GAS BALANCE";
  if (normalized.includes("blockhash") || normalized.includes("expired")) return "DEVNET TRANSACTION EXPIRED — RETRY";
  if (normalized.includes("simulation")) return "DEVNET TRANSACTION SIMULATION FAILED";
  return message.length > 180 ? "DEVNET TRANSACTION FAILED — RETRY" : message.toUpperCase();
}
