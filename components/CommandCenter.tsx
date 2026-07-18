"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { isSolanaAddress } from "@/lib/nft-verification";
import { safeExternalUrl, siteConfig } from "@/lib/site-config";
import type { SquadronResult } from "@/lib/types";

function shortenWallet(wallet: string) {
  return `${wallet.slice(0, 5)}…${wallet.slice(-5)}`;
}

export function CommandCenter() {
  const [wallet, setWallet] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState<SquadronResult | null>(null);
  const reduce = useReducedMotion();

  async function inspectWallet(event: React.FormEvent) {
    event.preventDefault();
    const value = wallet.trim();
    if (!isSolanaAddress(value)) {
      setError("Enter a valid Solana wallet address.");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setError("");
    try {
      const response = await fetch("/api/verify-squadron", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: value }),
      });
      const data = (await response.json()) as SquadronResult & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Inspection failed.");
      setResult(data);
      setStatus("success");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Inspection failed.");
      setStatus("error");
    }
  }

  const shareText = result
    ? `My Groypers Alpha Squadron consists of ${result.count} recruits.\n\nRank: ${result.rank.name}\nUnit: ${result.unitName}\n\nThe token is the signal.\nThe squadron is the amplifier.\n\n${siteConfig.token}\n\n${siteConfig.siteUrl}`
    : "";

  return (
    <section className="dossier-panel command-panel" id="command-center" aria-labelledby="command-title">
      <div className="panel-heading"><span>✦</span><h2 id="command-title">Squadron Command</h2><span>✦</span></div>
      <div className="radar-screen" aria-hidden="true">
        <div className="radar-grid" />
        <motion.div className="radar-sweep" animate={reduce ? {} : { rotate: 360 }} transition={{ duration: 3.4, repeat: Infinity, ease: "linear" }} />
        <span className="radar-dot dot-one" /><span className="radar-dot dot-two" /><span className="radar-dot dot-three" />
        <strong>SIGNAL<br />STRENGTH: 100%</strong>
      </div>

      <form onSubmit={inspectWallet} className="wallet-form" noValidate>
        <label htmlFor="wallet">Enter Solana wallet address</label>
        <div className="field-wrap">
          <input id="wallet" value={wallet} onChange={(event) => setWallet(event.target.value)} placeholder="Enter wallet address…" autoComplete="off" spellCheck={false} />
          <span aria-hidden="true">⌖</span>
        </div>
        <motion.button className="button button-green button-full" type="submit" whileTap={{ scale: 0.98 }} disabled={status === "loading"}>
          {status === "loading" ? "SCANNING PERSONNEL…" : "INSPECT WALLET"}
        </motion.button>
        <p className="privacy-note">No signature. No transaction.<br />Address check only.</p>
      </form>

      <AnimatePresence mode="wait">
        {status === "loading" && (
          <motion.div key="loading" className="scan-status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <span className="scan-line" />Cross-checking squadron records…
          </motion.div>
        )}
        {status === "error" && <motion.p key="error" className="form-error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{error}</motion.p>}
        {status === "success" && result && (
          <motion.div key="result" className="rank-result" initial={reduce ? false : { opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
            {result.count === 0 ? <h3>NO ACTIVE PERSONNEL DETECTED</h3> : (
              <>
                <div className="rank-head">
                  <Image src={result.rank.image} width={70} height={70} alt="Rank insignia placeholder" />
                  <div><small>{shortenWallet(result.wallet)}</small><h3>{result.rank.name}</h3><p>{result.unitName} · {result.count} active recruits</p></div>
                </div>
                {result.nextRank && (
                  <div className="rank-progress">
                    <span style={{ width: `${Math.min(100, (result.count / result.nextRank.min) * 100)}%` }} />
                    <small>{result.recruitsUntilNextRank} until {result.nextRank.name}</small>
                  </div>
                )}
                <div className="owned-preview">
                  {result.ownedNfts.map((nft) => <Image key={nft.mint} src={nft.image} width={48} height={48} alt={nft.name} />)}
                </div>
                <a className="button button-gold button-full" href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer">SHARE YOUR REPORT</a>
                <a className="reinforce-link" href={safeExternalUrl(siteConfig.launchMyNftUrl)} target="_blank" rel="noopener noreferrer">Reinforce Your Squadron →</a>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

