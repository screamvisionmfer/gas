"use client";
/* eslint-disable @next/next/no-img-element -- protected artwork is served by access-controlled route handlers. */

import { FormEvent, useMemo, useState } from "react";
import { Footer, Header } from "./LandingPage";
import { materialsCatalog, requirementLabel } from "@/lib/materials-catalog";
import { connectReadOnlySolanaWallet } from "@/lib/solana-wallet";
import styles from "./MaterialsPage.module.css";

type AccessResult = {
  wallet: string;
  nftCount: number;
  rank: string;
  rankImage: string;
  tokenBalance: number;
  materialIds: string[];
  accessToken: string;
};

function shortened(value: string) {
  return value.length > 12 ? `${value.slice(0, 5)}…${value.slice(-5)}` : value;
}

function tokenLabel(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: value >= 1_000_000 ? 0 : 2 }).format(value);
}

export function MaterialsPage() {
  const [wallet, setWallet] = useState("");
  const [result, setResult] = useState<AccessResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const unlocked = useMemo(() => new Set(result?.materialIds ?? []), [result]);

  async function inspectWallet(address: string) {
    const normalized = address.trim();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/materials-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: normalized }),
      });
      const payload = await response.json() as AccessResult & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Wallet inspection failed.");
      setWallet(normalized);
      setResult(payload);
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : "Wallet inspection failed.");
    } finally {
      setLoading(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await inspectWallet(wallet);
  }

  async function connectReadOnly() {
    setError("");
    try {
      const { address } = await connectReadOnlySolanaWallet();
      setWallet(address);
      await inspectWallet(address);
    } catch (connectionError) {
      const message = connectionError instanceof Error ? connectionError.message : "Wallet connection was cancelled.";
      setError(`${message} No signature or transaction was requested.`);
    }
  }

  return (
    <main className={styles.page}>
      <Header />
      <section className={styles.hero}>
        <div className={styles.heroGrid} aria-hidden="true" />
        <div className={styles.heroCopy}>
          <span>GAS FIELD INTELLIGENCE / DISTRIBUTION OFFICE</span>
          <h1>SQUADRON<br />MATERIALS</h1>
          <p>Official X banners issued by rank, token strength and one-of-one recruit ownership.</p>
        </div>
        <img className={styles.heroLogo} src="/logo.png" width="320" height="320" alt="Groypers Alpha Squadron" />
      </section>

      <div className={styles.content}>
        <section className={styles.scanner} aria-labelledby="clearance-title">
          <div className={styles.scannerIntro}>
            <span>READ-ONLY CLEARANCE SCAN</span>
            <h2 id="clearance-title">VERIFY YOUR SQUADRON</h2>
            <p>We only read public on-chain holdings. No signature. No transaction. No wallet permissions beyond sharing the public address.</p>
          </div>
          <form className={styles.walletForm} onSubmit={submit}>
            <label htmlFor="materials-wallet">SOLANA WALLET ADDRESS</label>
            <div>
              <input id="materials-wallet" value={wallet} onChange={(event) => setWallet(event.target.value)} placeholder="Enter public wallet address…" autoComplete="off" spellCheck={false} />
              <button type="submit" disabled={loading}>{loading ? "SCANNING…" : "SCAN WALLET"}</button>
            </div>
            <button className={styles.connectButton} type="button" onClick={connectReadOnly} disabled={loading}>CONNECT WALLET · READ ONLY</button>
          </form>
          {loading && <div className={styles.scanLine}><span /></div>}
          {error && <p className={styles.error} role="alert">{error}</p>}
          {result && (
            <div className={styles.clearanceReport}>
              <img src={result.rankImage} width="74" height="74" alt="" />
              <div><small>WALLET</small><strong>{shortened(result.wallet)}</strong></div>
              <div><small>CLASSIFICATION</small><strong>{result.rank}</strong></div>
              <div><small>ACTIVE RECRUITS</small><strong>{result.nftCount}</strong></div>
              <div><small>$GROYPER BALANCE</small><strong>{tokenLabel(result.tokenBalance)}</strong></div>
              <div><small>MATERIALS CLEARED</small><strong>{result.materialIds.length} / {materialsCatalog.length}</strong></div>
            </div>
          )}
        </section>

        <section className={styles.archive} aria-labelledby="archive-title">
          <div className={styles.archiveHeading}>
            <div><span>CLASSIFIED ASSET ARCHIVE</span><h2 id="archive-title">X BANNER DEPOT</h2></div>
            <p>{materialsCatalog.length} FILES ON RECORD · MORE DROPS INCOMING</p>
          </div>

          <div className={styles.bannerList}>
            {materialsCatalog.map((material, index) => {
              const isUnlocked = unlocked.has(material.id);
              const token = result?.accessToken ?? "";
              const assetUrl = `/api/materials/${material.id}?token=${encodeURIComponent(token)}`;
              return (
                <article className={`${styles.bannerCard} ${isUnlocked ? styles.unlocked : styles.locked}`} key={material.id}>
                  <header>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <div><h3>{material.title}</h3><p>{material.subtitle}</p></div>
                    <b>{isUnlocked ? "CLEARANCE GRANTED" : "LOCKED"}</b>
                  </header>
                  <div className={styles.bannerFrame}>
                    <img src={isUnlocked ? assetUrl : `/api/materials-preview/${material.id}`} alt={isUnlocked ? material.title : "Locked banner preview"} loading="lazy" />
                    {!isUnlocked && (
                      <div className={styles.lockOverlay}>
                        <span aria-hidden="true">⌾</span>
                        <strong>RESTRICTED MATERIAL</strong>
                        <small>{result ? requirementLabel(material.requirement) : "VERIFY WALLET TO REQUEST CLEARANCE"}</small>
                      </div>
                    )}
                    {isUnlocked && <span className={styles.clearedStamp}>CLEARED</span>}
                  </div>
                  <footer>
                    <span>{requirementLabel(material.requirement)}</span>
                    {isUnlocked ? (
                      <a href={`${assetUrl}&download=1`} download={material.downloadName}>DOWNLOAD ORIGINAL PNG</a>
                    ) : (
                      <button type="button" onClick={() => document.getElementById("materials-wallet")?.focus()}>REQUIRES CLEARANCE</button>
                    )}
                  </footer>
                </article>
              );
            })}
          </div>
        </section>
      </div>
      <Footer />
    </main>
  );
}
