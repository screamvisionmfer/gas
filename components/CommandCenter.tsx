"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { isSolanaAddress } from "@/lib/nft-verification";
import { safeExternalUrl, siteConfig } from "@/lib/site-config";
import type { SquadronResult } from "@/lib/types";

function shortenWallet(wallet: string) {
  return `${wallet.slice(0, 5)}…${wallet.slice(-5)}`;
}

function RankReveal({ result, onClose }: { result: SquadronResult; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const reduce = useReducedMotion();
  const hasRecruits = result.count > 0;
  const shareText = `My Groypers Alpha Squadron consists of ${result.count} recruits.\n\nRank: ${result.rank.name}\nUnit: ${result.unitName}\n\nThe token is the signal.\nThe squadron is the amplifier.\n\n${siteConfig.token}\n\n${siteConfig.siteUrl}`;
  const cardUrl = `/api/share-card?wallet=${encodeURIComponent(result.wallet)}&count=${result.count}&rank=${encodeURIComponent(result.rank.name)}&unit=${encodeURIComponent(result.unitName)}`;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  async function copyReport() {
    await navigator.clipboard.writeText(shareText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  const reveal = (
    <motion.div className="rank-reveal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
      <div className="rank-reveal-atmosphere" aria-hidden="true">
        <motion.span className="rank-beam rank-beam-a" animate={reduce ? {} : { rotate: 360 }} transition={{ duration: 22, repeat: Infinity, ease: "linear" }} />
        <motion.span className="rank-beam rank-beam-b" animate={reduce ? {} : { rotate: -360 }} transition={{ duration: 30, repeat: Infinity, ease: "linear" }} />
        {Array.from({ length: 18 }, (_, index) => <i key={index} style={{ "--particle": index } as React.CSSProperties} />)}
      </div>
      <motion.section
        className="rank-reveal-shell"
        initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.72, y: 70, rotateX: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: 30 }}
        transition={{ duration: 0.72, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rank-reveal-title"
      >
        <button className="rank-reveal-close" type="button" onClick={onClose} aria-label="Close rank report">×</button>
        <div className="rank-reveal-kicker"><span>GAS PERSONNEL SYSTEM</span><b>IDENTITY CONFIRMED</b></div>
        <div className="rank-reveal-stage">
          <motion.div className="rank-emblem" initial={reduce ? false : { opacity: 0, scale: 0.35, rotate: -12 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 150, damping: 14, delay: 0.48 }}>
            <span className="rank-emblem-ring" />
            <Image src={result.rank.image} width={270} height={270} alt={`${result.rank.name} insignia`} priority />
          </motion.div>
          <motion.div className="rank-reveal-copy" initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.72, duration: 0.45 }}>
            <small>{hasRecruits ? "NEW SQUADRON CLASSIFICATION" : "SQUADRON STATUS"}</small>
            <h2 id="rank-reveal-title">{hasRecruits ? result.rank.name : "NO ACTIVE PERSONNEL"}</h2>
            <p>{hasRecruits ? result.unitName : "Unassigned wallet"}</p>
          </motion.div>
        </div>

        <div className="rank-report-card">
          <div className="rank-report-metric"><span>ACTIVE RECRUITS</span><strong>{String(result.count).padStart(2, "0")}</strong></div>
          <div className="rank-report-wallet"><span>WALLET</span><strong>{shortenWallet(result.wallet)}</strong></div>
          <div className="rank-report-id"><span>REPORT ID</span><strong>GAS-{result.wallet.slice(0, 4).toUpperCase()}</strong></div>
        </div>

        {result.nextRank && hasRecruits && (
          <div className="reveal-progress">
            <div><span>NEXT CLASSIFICATION</span><strong>{result.nextRank.name}</strong></div>
            <div className="reveal-progress-track"><motion.span initial={{ width: 0 }} animate={{ width: `${Math.min(100, (result.count / result.nextRank.min) * 100)}%` }} transition={{ delay: 0.9, duration: 0.8 }} /></div>
            <small>{result.recruitsUntilNextRank} recruits required</small>
          </div>
        )}

        {hasRecruits && result.ownedNfts.length > 0 && (
          <div className="reveal-recruits">
            <span>DETECTED PERSONNEL</span>
            <div>{result.ownedNfts.map((nft, index) => <motion.div key={nft.mint} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 + index * 0.08 }}><Image src={nft.image} width={58} height={58} alt={nft.name} /></motion.div>)}</div>
          </div>
        )}

        <div className="rank-reveal-actions">
          <a className="button button-gold" href={cardUrl} download={`GAS-${result.rank.name.replaceAll(" ", "-")}.png`}>SAVE REPORT</a>
          <a className="button button-paper" href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer">SHARE ON X</a>
          <button className="button button-outline-light" type="button" onClick={copyReport}>{copied ? "REPORT COPIED" : "COPY REPORT"}</button>
          <a className="button button-olive" href={safeExternalUrl(siteConfig.launchMyNftUrl)} target="_blank" rel="noopener noreferrer">REINFORCE SQUADRON</a>
        </div>
      </motion.section>
    </motion.div>
  );

  return createPortal(reveal, document.body);
}

export function CommandCenter() {
  const [wallet, setWallet] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState<SquadronResult | null>(null);
  const [revealOpen, setRevealOpen] = useState(false);
  const reduce = useReducedMotion();
  const scanLabels = useMemo(() => ["LOCATING WALLET", "READING PERSONNEL", "CALCULATING RANK"], []);

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
      const [response] = await Promise.all([
        fetch("/api/verify-squadron", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wallet: value }),
        }),
        new Promise((resolve) => window.setTimeout(resolve, reduce ? 250 : 1900)),
      ]);
      const data = (await response.json()) as SquadronResult & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Inspection failed.");
      setResult(data);
      setStatus("idle");
      setRevealOpen(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Inspection failed.");
      setStatus("error");
    }
  }

  return (
    <section className={`dossier-panel command-panel ${status === "loading" ? "command-panel-scanning" : ""}`} id="command-center" aria-labelledby="command-title">
      <div className="panel-heading"><span>✦</span><h2 id="command-title">Squadron Command</h2><span>✦</span></div>
      <div className="radar-screen" aria-hidden="true">
        <div className="radar-grid" />
        <motion.div className="radar-sweep" animate={reduce ? {} : { rotate: 360 }} transition={{ duration: status === "loading" ? 1.2 : 3.4, repeat: Infinity, ease: "linear" }} />
        <span className="radar-dot dot-one" /><span className="radar-dot dot-two" /><span className="radar-dot dot-three" />
        <strong>{status === "loading" ? "SCAN IN PROGRESS" : "SIGNAL STRENGTH: 100%"}</strong>
      </div>

      <form onSubmit={inspectWallet} className="wallet-form" noValidate>
        <label htmlFor="wallet">Enter Solana wallet address</label>
        <div className="field-wrap">
          <input id="wallet" value={wallet} onChange={(event) => setWallet(event.target.value)} placeholder="Enter wallet address…" autoComplete="off" spellCheck={false} disabled={status === "loading"} />
          <span aria-hidden="true">⌖</span>
        </div>
        <motion.button className="button button-green button-full" type="submit" whileTap={{ scale: 0.98 }} disabled={status === "loading"}>
          {status === "loading" ? "SCANNING PERSONNEL…" : "INSPECT WALLET"}
        </motion.button>
        <p className="privacy-note">No signature. No transaction.<br />Address check only.</p>
      </form>

      <AnimatePresence mode="wait">
        {status === "loading" && (
          <motion.div key="loading" className="scan-status scan-status-steps" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <span className="scan-line" />
            <div>{scanLabels.map((label, index) => <motion.small key={label} initial={{ opacity: 0.25 }} animate={{ opacity: [0.25, 1, 0.25] }} transition={{ delay: index * 0.38, duration: 1.1, repeat: Infinity }}>{label}</motion.small>)}</div>
          </motion.div>
        )}
        {status === "error" && <motion.p key="error" className="form-error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{error}</motion.p>}
      </AnimatePresence>

      <AnimatePresence>{revealOpen && result && <RankReveal result={result} onClose={() => setRevealOpen(false)} />}</AnimatePresence>
    </section>
  );
}

