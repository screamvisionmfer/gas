"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { siteConfig } from "@/lib/site-config";
import type { BannerStyle } from "@/lib/banner-config";
import type { SquadronResult } from "@/lib/types";
import { BannerPreview, bannerApiUrl } from "./BannerPreview";
import { BannerStyleSelector } from "./BannerStyleSelector";

export function BannerGenerator({ result }: { result: SquadronResult }) {
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<BannerStyle>(siteConfig.banner.defaultStyle);
  const [version, setVersion] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const canGenerate = result.count > 0;

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  async function downloadBanner() {
    if (downloading) return;
    setDownloading(true);
    setError("");
    try {
      const response = await fetch(bannerApiUrl(result.wallet, style, version), { cache: "no-store" });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: "Download failed." })) as { error?: string };
        throw new Error(payload.error ?? "Download failed.");
      }
      const blob = await response.blob();
      if (blob.type !== "image/png") throw new Error("The generator returned an invalid image.");
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `GAS-X-Banner-${result.wallet.slice(0, 5)}.png`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Download failed.");
    } finally {
      setDownloading(false);
    }
  }

  const shareText = `My ${result.rank.name} banner is ready. ${result.count} GAS recruits reporting for duty.\n\n${siteConfig.token}\n${siteConfig.siteUrl}`;
  const modal = open ? (
    <div className="banner-modal-backdrop" onMouseDown={() => setOpen(false)}>
      <section className="banner-modal" role="dialog" aria-modal="true" aria-labelledby="banner-modal-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="banner-modal-header">
          <div><small>GAS MEDIA OPERATIONS</small><h2 id="banner-modal-title">GENERATE X BANNER</h2></div>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close banner generator">×</button>
        </header>

        <p className="banner-modal-intro">Server-verified command banner. Exact 1500 × 500 PNG, ready for an X profile header.</p>
        <BannerStyleSelector value={style} onChange={(nextStyle) => { setStyle(nextStyle); setVersion((current) => current + 1); }} />
        <BannerPreview key={`${style}-${version}`} wallet={result.wallet} style={style} refreshKey={version} />

        <div className="banner-result-summary">
          <div><span>CLASSIFICATION</span><strong>{result.rank.name}</strong></div>
          <div><span>ACTIVE RECRUITS</span><strong>{result.count}</strong></div>
          <div><span>UNIT</span><strong>{result.unitName}</strong></div>
          <div><span>PRIORITY RECRUIT</span><strong>{result.bestRecruit?.name ?? "SERVER SELECTED"}</strong></div>
        </div>

        {error && <p className="banner-generator-error" role="alert">{error}</p>}
        <div className="banner-modal-actions">
          <button className="button button-gold" type="button" onClick={downloadBanner} disabled={downloading}>{downloading ? "VERIFYING & DOWNLOADING…" : "DOWNLOAD PNG"}</button>
          <button className="button button-outline-light" type="button" onClick={() => { setError(""); setVersion((current) => current + 1); }}>GENERATE AGAIN</button>
          <a className="button button-paper" href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer">SHARE ON X</a>
        </div>
        <small className="banner-share-note">Download the PNG, then attach it to your X profile or post. Wallet data is re-checked on every generation.</small>
      </section>
    </div>
  ) : null;

  return (
    <div className="banner-generator-entry">
      <button className="button banner-generator-trigger" type="button" disabled={!canGenerate} onClick={() => { setError(""); setOpen(true); }}>
        {canGenerate ? "GENERATE X BANNER" : "BANNER REQUIRES ACTIVE PERSONNEL"}
      </button>
      {modal && createPortal(modal, document.body)}
    </div>
  );
}
