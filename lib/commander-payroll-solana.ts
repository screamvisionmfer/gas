import {
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  getAccount,
  getAssociatedTokenAddressSync,
  getMint,
} from "@solana/spl-token";
import { Connection, PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";
import type { OnChainDeploymentState, OnChainPayrollEpoch, PayrollTestConfig } from "./commander-payroll-types";

const DEVNET_GENESIS_HASH = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1";
const CONFIRMATION_TIMEOUT_MS = 60_000;
export const MAX_ATOMIC_DEPLOYMENTS = 5;

type PreparedProgramDeployment = {
  connection: Connection;
  transaction: Transaction;
  latestBlockhash: Awaited<ReturnType<Connection["getLatestBlockhash"]>>;
  amountGas: number;
  epochNumber: number;
};

type ConfigAccount = {
  testGasMint: PublicKey;
  warChestAuthority: PublicKey;
  currentEpoch: bigint;
  paused: boolean;
};

function validPublicKey(value: string) {
  try { return new PublicKey(value).toBase58() === value; } catch { return false; }
}

export function payrollTestConfig(): PayrollTestConfig {
  const enabled = process.env.NEXT_PUBLIC_GAS_TEST_MODE?.trim().toLowerCase() === "true";
  const rpcUrl = process.env.NEXT_PUBLIC_GAS_TEST_RPC_URL?.trim() ?? "";
  const tokenMint = process.env.NEXT_PUBLIC_GAS_TEST_TOKEN_MINT?.trim() ?? "";
  const warChest = process.env.NEXT_PUBLIC_GAS_TEST_WAR_CHEST?.trim() ?? "";
  const programId = process.env.NEXT_PUBLIC_GAS_DEPLOYMENT_PROGRAM_ID?.trim() ?? "";
  const localFallback = !programId;
  let error = "";

  if (localFallback) {
    return { enabled: true, configured: true, localFallback: true, rpcUrl, tokenMint, warChest, programId, explorerCluster: "devnet" };
  }
  if (!enabled) error = "TEST MODE IS DISABLED";
  else if (!rpcUrl) error = "DEVNET RPC URL IS MISSING";
  else {
    try {
      const parsed = new URL(rpcUrl);
      if (!["https:", "http:"].includes(parsed.protocol)) error = "DEVNET RPC URL IS INVALID";
    } catch { error = "DEVNET RPC URL IS INVALID"; }
  }
  if (!error && !validPublicKey(tokenMint)) error = "TEST TOKEN MINT IS INVALID";
  if (!error && !validPublicKey(warChest)) error = "TEST WAR CHEST IS INVALID";
  if (!error && !validPublicKey(programId)) error = "DEPLOYMENT PROGRAM ID IS INVALID";

  return { enabled, configured: !error, localFallback: false, rpcUrl, tokenMint, warChest, programId, explorerCluster: "devnet", error: error || undefined };
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
  if (await connection.getGenesisHash() !== DEVNET_GENESIS_HASH) throw new Error("RPC SAFETY CHECK FAILED — DEVNET REQUIRED");
  return connection;
}

function u64(value: bigint | number) {
  const output = Buffer.alloc(8);
  output.writeBigUInt64LE(BigInt(value));
  return output;
}

async function discriminator(namespace: "account" | "global", name: string) {
  const bytes = new TextEncoder().encode(`${namespace}:${name}`);
  return Buffer.from(await crypto.subtle.digest("SHA-256", bytes)).subarray(0, 8);
}

function configPda(programId: PublicKey) {
  return PublicKey.findProgramAddressSync([Buffer.from("config")], programId)[0];
}

function epochPda(programId: PublicKey, epochNumber: bigint) {
  return PublicKey.findProgramAddressSync([Buffer.from("epoch"), u64(epochNumber)], programId)[0];
}

function deploymentPda(programId: PublicKey, epochNumber: bigint, nftMint: PublicKey) {
  return PublicKey.findProgramAddressSync([Buffer.from("deployment"), u64(epochNumber), nftMint.toBuffer()], programId)[0];
}

async function verifyAccountDiscriminator(data: Buffer, name: string) {
  const expected = await discriminator("account", name);
  if (data.length < 8 || !data.subarray(0, 8).equals(expected)) throw new Error(`INVALID ${name.toUpperCase()} ACCOUNT`);
}

async function readConfig(connection: Connection, programId: PublicKey): Promise<ConfigAccount> {
  const account = await connection.getAccountInfo(configPda(programId), "confirmed");
  if (!account || !account.owner.equals(programId)) throw new Error("DEVNET DEPLOYMENT CONFIG IS NOT INITIALIZED");
  await verifyAccountDiscriminator(account.data, "DeploymentConfig");
  return {
    testGasMint: new PublicKey(account.data.subarray(40, 72)),
    warChestAuthority: new PublicKey(account.data.subarray(72, 104)),
    currentEpoch: account.data.readBigUInt64LE(104),
    paused: account.data[112] === 1,
  };
}

async function readEpoch(connection: Connection, programId: PublicKey, epochNumber: bigint, tokenDecimals: number): Promise<OnChainPayrollEpoch> {
  const account = await connection.getAccountInfo(epochPda(programId, epochNumber), "confirmed");
  if (!account || !account.owner.equals(programId)) throw new Error("CURRENT DEVNET EPOCH IS NOT INITIALIZED");
  await verifyAccountDiscriminator(account.data, "DeploymentEpoch");
  return {
    number: Number(account.data.readBigUInt64LE(8)),
    startTimestamp: Number(account.data.readBigInt64LE(16)),
    endTimestamp: Number(account.data.readBigInt64LE(24)),
    deploymentCostGas: Number(account.data.readBigUInt64LE(32)) / (10 ** tokenDecimals),
    totalDeployed: Number(account.data.readBigUInt64LE(40)),
    status: account.data[48] === 0 ? "open" : "closed",
  };
}

export async function fetchOnChainDeploymentState(config: PayrollTestConfig, soldierMints: string[]): Promise<OnChainDeploymentState> {
  const connection = await verifiedDevnetConnection(config);
  const programId = new PublicKey(config.programId);
  const onChainConfig = await readConfig(connection, programId);
  if (!onChainConfig.testGasMint.equals(new PublicKey(config.tokenMint))) throw new Error("PROGRAM TEST $GAS MINT DOES NOT MATCH SITE CONFIG");
  if (!onChainConfig.warChestAuthority.equals(new PublicKey(config.warChest))) throw new Error("PROGRAM WAR CHEST DOES NOT MATCH SITE CONFIG");
  if (onChainConfig.currentEpoch === BigInt(0)) return { epoch: null, deployedSoldierMints: [] };
  const mintInfo = await getMint(connection, onChainConfig.testGasMint, "confirmed", TOKEN_PROGRAM_ID);
  const epoch = await readEpoch(connection, programId, onChainConfig.currentEpoch, mintInfo.decimals);
  const validMints = soldierMints.filter(validPublicKey).map((mint) => new PublicKey(mint));
  const deploymentAddresses = validMints.map((mint) => deploymentPda(programId, onChainConfig.currentEpoch, mint));
  const accounts: Awaited<ReturnType<Connection["getMultipleAccountsInfo"]>> = [];
  for (let index = 0; index < deploymentAddresses.length; index += 100) {
    accounts.push(...await connection.getMultipleAccountsInfo(deploymentAddresses.slice(index, index + 100), "confirmed"));
  }
  return {
    epoch,
    deployedSoldierMints: validMints.filter((_, index) => accounts[index]?.owner.equals(programId)).map((mint) => mint.toBase58()),
  };
}

export async function prepareProgramDeployment(config: PayrollTestConfig, ownerAddress: string, soldierMints: string[]): Promise<PreparedProgramDeployment> {
  if (!soldierMints.length || soldierMints.length > MAX_ATOMIC_DEPLOYMENTS) throw new Error(`SELECT BETWEEN 1 AND ${MAX_ATOMIC_DEPLOYMENTS} SOLDIERS`);
  const connection = await verifiedDevnetConnection(config);
  const programId = new PublicKey(config.programId);
  const owner = new PublicKey(ownerAddress);
  const tokenMint = new PublicKey(config.tokenMint);
  const warChest = new PublicKey(config.warChest);
  const onChainConfig = await readConfig(connection, programId);
  if (onChainConfig.paused) throw new Error("DEVNET DEPLOYMENT PROGRAM IS PAUSED");
  if (!onChainConfig.testGasMint.equals(tokenMint)) throw new Error("PROGRAM TEST $GAS MINT DOES NOT MATCH SITE CONFIG");
  if (!onChainConfig.warChestAuthority.equals(warChest)) throw new Error("PROGRAM WAR CHEST DOES NOT MATCH SITE CONFIG");
  if (onChainConfig.currentEpoch === BigInt(0)) throw new Error("CURRENT DEVNET EPOCH IS NOT INITIALIZED");
  const mintInfo = await getMint(connection, tokenMint, "confirmed", TOKEN_PROGRAM_ID);
  const epoch = await readEpoch(connection, programId, onChainConfig.currentEpoch, mintInfo.decimals);
  if (epoch.status !== "open") throw new Error("CURRENT DEVNET EPOCH IS CLOSED");

  const payerGasAccount = getAssociatedTokenAddressSync(tokenMint, owner);
  const warChestGasAccount = getAssociatedTokenAddressSync(tokenMint, warChest);
  let source;
  try { source = await getAccount(connection, payerGasAccount, "confirmed", TOKEN_PROGRAM_ID); }
  catch { throw new Error("NO TEST $GAS TOKEN ACCOUNT FOUND ON DEVNET"); }
  const rawCost = BigInt(Math.round(epoch.deploymentCostGas * (10 ** mintInfo.decimals)));
  const rawTotal = rawCost * BigInt(soldierMints.length);
  if (source.amount < rawTotal) throw new Error("INSUFFICIENT TEST $GAS BALANCE");

  const latestBlockhash = await connection.getLatestBlockhash("confirmed");
  const transaction = new Transaction({ feePayer: owner, blockhash: latestBlockhash.blockhash, lastValidBlockHeight: latestBlockhash.lastValidBlockHeight });
  transaction.add(createAssociatedTokenAccountIdempotentInstruction(owner, warChestGasAccount, warChest, tokenMint));
  const deployDiscriminator = await discriminator("global", "deploy_nft");
  for (const mintValue of soldierMints) {
    const nftMint = new PublicKey(mintValue);
    transaction.add(new TransactionInstruction({
      programId,
      data: deployDiscriminator,
      keys: [
        { pubkey: owner, isSigner: true, isWritable: true },
        { pubkey: configPda(programId), isSigner: false, isWritable: false },
        { pubkey: epochPda(programId, onChainConfig.currentEpoch), isSigner: false, isWritable: true },
        { pubkey: deploymentPda(programId, onChainConfig.currentEpoch, nftMint), isSigner: false, isWritable: true },
        { pubkey: nftMint, isSigner: false, isWritable: false },
        { pubkey: tokenMint, isSigner: false, isWritable: false },
        { pubkey: payerGasAccount, isSigner: false, isWritable: true },
        { pubkey: warChestGasAccount, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
    }));
  }
  return { connection, transaction, latestBlockhash, amountGas: Number(rawTotal) / (10 ** mintInfo.decimals), epochNumber: epoch.number };
}

export function serializeUnsignedTestTransaction(transaction: Transaction) {
  return transaction.serialize({ requireAllSignatures: false, verifySignatures: false });
}

export async function broadcastAndConfirmProgramDeployment(prepared: PreparedProgramDeployment, signedTransaction: Uint8Array) {
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
  const destinationAta = getAssociatedTokenAddressSync(mint, new PublicKey(config.warChest));
  const mintInfo = await getMint(connection, mint, "confirmed", TOKEN_PROGRAM_ID);
  try { return Number((await getAccount(connection, destinationAta, "confirmed", TOKEN_PROGRAM_ID)).amount) / (10 ** mintInfo.decimals); }
  catch { return 0; }
}

export function payrollTransactionError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "TEST TRANSACTION FAILED");
  const normalized = message.toLowerCase();
  if (normalized.includes("reject") || normalized.includes("declin") || normalized.includes("cancel")) return "TRANSACTION REJECTED IN WALLET";
  if (normalized.includes("insufficient") && normalized.includes("gas")) return "INSUFFICIENT TEST $GAS BALANCE";
  if (normalized.includes("already in use") || normalized.includes("already been processed")) return "ONE OR MORE SOLDIERS ARE ALREADY DEPLOYED — REFRESHING STATE";
  if (normalized.includes("blockhash") || normalized.includes("expired")) return "DEVNET TRANSACTION EXPIRED — RETRY";
  if (normalized.includes("simulation")) return "DEVNET TRANSACTION SIMULATION FAILED";
  return message.length > 180 ? "DEVNET TRANSACTION FAILED — RETRY" : message.toUpperCase();
}
