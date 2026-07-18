"use client";
/* eslint-disable @next/next/no-img-element -- Sites serves bundled artwork directly. */

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { isSolanaAddress } from "@/lib/nft-verification";
import { safeExternalUrl, siteConfig } from "@/lib/site-config";
import type { SquadronResult } from "@/lib/types";

function shortenWallet(wallet: string) {
  return `${wallet.slice(0, 5)}…${wallet.slice(-5)}`;
}

function loadReportImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Unable to load report image: ${src}`));
    image.src = src;
  });
}

function drawContainedImage(context: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number) {
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const renderedWidth = image.naturalWidth * scale;
  const renderedHeight = image.naturalHeight * scale;
  context.drawImage(image, x + (width - renderedWidth) / 2, y + (height - renderedHeight) / 2, renderedWidth, renderedHeight);
}

function canvasToPng(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("PNG export failed.")), "image/png");
  });
}

function RankReveal({ result, onClose }: { result: SquadronResult; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const reduce = useReducedMotion();
  const hasRecruits = result.count > 0;
  const shareText = `My Groypers Alpha Squadron consists of ${result.count} recruits.\n\nRank: ${result.rank.name}\nUnit: ${result.unitName}\n\nThe token is the signal.\nThe squadron is the amplifier.\n\n${siteConfig.token}\n\n${siteConfig.siteUrl}`;

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

  async function saveReport() {
    if (saving) return;
    setSaving(true);
    setSaveFailed(false);

    try {
      await document.fonts?.ready;
      const [insignia, logo] = await Promise.all([
        loadReportImage(result.rank.image),
        loadReportImage("/logo.png"),
      ]);
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 630;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas is unavailable.");

      const background = context.createLinearGradient(0, 0, 1200, 630);
      background.addColorStop(0, "#17210d");
      background.addColorStop(0.55, "#0b1008");
      background.addColorStop(1, "#050805");
      context.fillStyle = background;
      context.fillRect(0, 0, 1200, 630);

      context.strokeStyle = "rgba(176, 157, 62, .18)";
      context.lineWidth = 1;
      for (let x = 0; x <= 1200; x += 60) {
        context.beginPath(); context.moveTo(x, 0); context.lineTo(x, 630); context.stroke();
      }
      for (let y = 0; y <= 630; y += 60) {
        context.beginPath(); context.moveTo(0, y); context.lineTo(1200, y); context.stroke();
      }

      context.strokeStyle = "#b99a35";
      context.lineWidth = 3;
      context.strokeRect(18, 18, 1164, 594);
      context.strokeStyle = "rgba(185, 154, 53, .45)";
      context.lineWidth = 1;
      context.strokeRect(29, 29, 1142, 572);

      context.save();
      context.translate(306, 286);
      context.strokeStyle = "rgba(156, 194, 55, .32)";
      context.lineWidth = 2;
      context.beginPath(); context.arc(0, 0, 205, 0, Math.PI * 2); context.stroke();
      context.setLineDash([8, 9]);
      context.strokeStyle = "rgba(207, 176, 65, .44)";
      context.beginPath(); context.arc(0, 0, 235, 0, Math.PI * 2); context.stroke();
      context.restore();
      drawContainedImage(context, insignia, 106, 86, 400, 400);

      context.fillStyle = "#a7c83b";
      context.font = "700 20px Impact, Arial Narrow, sans-serif";
      context.fillText("GAS PERSONNEL SYSTEM / IDENTITY CONFIRMED", 570, 74);
      context.fillStyle = "#e6bc3a";
      context.font = "900 68px Impact, Arial Narrow, sans-serif";
      const rankWords = result.rank.name.toUpperCase().split(" ");
      const rankLines: string[] = [];
      let rankLine = "";
      for (const word of rankWords) {
        const candidate = rankLine ? `${rankLine} ${word}` : word;
        if (context.measureText(candidate).width > 570 && rankLine) {
          rankLines.push(rankLine);
          rankLine = word;
        } else {
          rankLine = candidate;
        }
      }
      rankLines.push(rankLine);
      rankLines.slice(0, 3).forEach((line, index) => context.fillText(line, 570, 162 + index * 67));

      const unitY = 178 + Math.min(rankLines.length, 3) * 67;
      context.fillStyle = "#f1eee3";
      context.font = "700 30px Impact, Arial Narrow, sans-serif";
      context.fillText(result.unitName.toUpperCase(), 570, unitY);

      const metricsY = 422;
      context.fillStyle = "rgba(10, 15, 7, .82)";
      context.fillRect(548, metricsY, 602, 116);
      context.strokeStyle = "#697044";
      context.strokeRect(548, metricsY, 602, 116);
      context.fillStyle = "#8d9666";
      context.font = "700 15px Impact, Arial Narrow, sans-serif";
      context.fillText("ACTIVE RECRUITS", 572, metricsY + 30);
      context.fillText("WALLET", 746, metricsY + 30);
      context.fillText("REPORT ID", 955, metricsY + 30);
      context.fillStyle = "#e7bb36";
      context.font = "900 44px Impact, Arial Narrow, sans-serif";
      context.fillText(String(result.count).padStart(2, "0"), 572, metricsY + 82);
      context.fillStyle = "#f1eee3";
      context.font = "700 24px Impact, Arial Narrow, sans-serif";
      context.fillText(shortenWallet(result.wallet), 746, metricsY + 79);
      context.fillText(`GAS-${result.wallet.slice(0, 4).toUpperCase()}`, 955, metricsY + 79);

      drawContainedImage(context, logo, 52, 526, 62, 62);
      context.fillStyle = "#f1eee3";
      context.font = "700 21px Impact, Arial Narrow, sans-serif";
      context.fillText("GROYPERS ALPHA SQUADRON", 130, 554);
      context.fillStyle = "#9dbb37";
      context.font = "700 16px Arial, sans-serif";
      context.fillText("THE TOKEN IS THE SIGNAL. THE SQUADRON IS THE AMPLIFIER.", 130, 580);
      context.textAlign = "right";
      context.fillStyle = "#d7ae35";
      context.font = "700 18px Arial, sans-serif";
      context.fillText(siteConfig.token, 1148, 572);
      context.textAlign = "left";

      const blob = await canvasToPng(canvas);
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = `GAS-${result.rank.name.replaceAll(" ", "-")}.png`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    } catch {
      setSaveFailed(true);
      window.setTimeout(() => setSaveFailed(false), 2200);
    } finally {
      setSaving(false);
    }
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
            <img src={result.rank.image} width="270" height="270" alt={`${result.rank.name} insignia`} fetchPriority="high" />
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
            <div>{result.ownedNfts.map((nft, index) => <motion.div key={nft.mint} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 + index * 0.08 }}><img src={nft.image} width="58" height="58" alt={nft.name} loading="lazy" /></motion.div>)}</div>
          </div>
        )}

        <div className="rank-reveal-actions">
          <button className="button button-gold" type="button" onClick={saveReport} disabled={saving}>{saveFailed ? "EXPORT FAILED" : saving ? "GENERATING PNG..." : "SAVE REPORT"}</button>
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
        <img className="radar-media" src="/squadron-radar.gif" alt="" />
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
