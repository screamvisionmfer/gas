import * as anchor from "@coral-xyz/anchor";
import { assert } from "chai";
import { createAssociatedTokenAccount, createMint, getAccount, mintTo, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";

describe("gas-deployment", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.GasDeployment;
  const authority = (provider.wallet as anchor.Wallet).payer;
  const warChest = Keypair.generate();
  const user = Keypair.generate();
  let mint: PublicKey;
  let userGas: PublicKey;
  let warChestGas: PublicKey;
  let config: PublicKey;
  let epoch: PublicKey;
  const epochNumber = new anchor.BN(1);
  const cost = new anchor.BN(100_000_000);

  async function rejects(request: Promise<unknown>) {
    try { await request; }
    catch { return; }
    assert.fail("Expected transaction to fail");
  }

  before(async () => {
    for (const recipient of [warChest.publicKey, user.publicKey]) {
      const signature = await provider.connection.requestAirdrop(recipient, 2 * anchor.web3.LAMPORTS_PER_SOL);
      await provider.connection.confirmTransaction(signature, "confirmed");
    }
    mint = await createMint(provider.connection, authority, authority.publicKey, null, 6);
    userGas = await createAssociatedTokenAccount(provider.connection, authority, mint, user.publicKey);
    warChestGas = await createAssociatedTokenAccount(provider.connection, authority, mint, warChest.publicKey);
    await mintTo(provider.connection, authority, mint, userGas, authority, 10_000_000_000);
    [config] = PublicKey.findProgramAddressSync([Buffer.from("config")], program.programId);
    [epoch] = PublicKey.findProgramAddressSync([Buffer.from("epoch"), epochNumber.toArrayLike(Buffer, "le", 8)], program.programId);
  });

  it("initializes config", async () => {
    await program.methods.initializeConfig(mint, warChest.publicKey).accounts({ authority: authority.publicKey, config, systemProgram: SystemProgram.programId }).rpc();
    assert.isNotNull(await provider.connection.getAccountInfo(config));
  });

  it("initializes epoch", async () => {
    const now = Math.floor(Date.now() / 1000);
    await program.methods.initializeEpoch(epochNumber, new anchor.BN(now - 60), new anchor.BN(now + 3600), cost).accounts({ authority: authority.publicKey, config, epoch, systemProgram: SystemProgram.programId }).rpc();
    assert.isNotNull(await provider.connection.getAccountInfo(epoch));
  });

  async function deploy(nftMint: PublicKey, gasMint = mint, payerGas = userGas) {
    const [deployment] = PublicKey.findProgramAddressSync([Buffer.from("deployment"), epochNumber.toArrayLike(Buffer, "le", 8), nftMint.toBuffer()], program.programId);
    return program.methods.deployNft().accounts({ payer: user.publicKey, config, epoch, deployment, nftMint, testGasMint: gasMint, payerGasAccount: payerGas, warChestGasAccount: warChestGas, tokenProgram: TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId }).signers([user]).rpc();
  }

  it("deploys one mint, transfers TEST $GAS, creates PDA, and rejects duplicate", async () => {
    const nft = Keypair.generate().publicKey;
    const before = (await getAccount(provider.connection, warChestGas)).amount;
    await deploy(nft);
    assert.equal((await getAccount(provider.connection, warChestGas)).amount - before, BigInt(cost.toString()));
    const [deployment] = PublicKey.findProgramAddressSync([Buffer.from("deployment"), epochNumber.toArrayLike(Buffer, "le", 8), nft.toBuffer()], program.programId);
    assert.isNotNull(await provider.connection.getAccountInfo(deployment));
    await rejects(deploy(nft));
  });

  it("rejects wrong token mint", async () => {
    const wrongMint = await createMint(provider.connection, authority, authority.publicKey, null, 6);
    const wrongAta = await createAssociatedTokenAccount(provider.connection, authority, wrongMint, user.publicKey);
    await rejects(deploy(Keypair.generate().publicKey, wrongMint, wrongAta));
  });

  it("rejects insufficient TEST $GAS", async () => {
    const emptyAta = await createAssociatedTokenAccount(provider.connection, authority, mint, Keypair.generate().publicKey, { commitment: "confirmed" }, TOKEN_PROGRAM_ID);
    await rejects(deploy(Keypair.generate().publicKey, mint, emptyAta));
  });

  it("allows another NFT mint", async () => { await deploy(Keypair.generate().publicKey); });

  it("rejects deployment after epoch closes", async () => {
    await program.methods.closeEpoch(epochNumber).accounts({ authority: authority.publicKey, config, epoch }).rpc();
    await rejects(deploy(Keypair.generate().publicKey));
  });
});
