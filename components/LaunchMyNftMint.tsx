"use client";

import { useEffect, useState } from "react";
import { safeExternalUrl, siteConfig } from "@/lib/site-config";

declare global {
  interface Window {
    ownerId?: string;
    collectionId?: string;
  }
}

type EmbedState = "loading" | "ready" | "error";

export function LaunchMyNftMint() {
  const [state, setState] = useState<EmbedState>("loading");

  useEffect(() => {
    const buttonContainer = document.getElementById("mint-button-container");
    if (!buttonContainer) return;

    window.ownerId = siteConfig.launchMyNftEmbed.ownerId;
    window.collectionId = siteConfig.launchMyNftEmbed.collectionId;

    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = siteConfig.launchMyNftEmbed.stylesheetUrl;
    stylesheet.crossOrigin = "anonymous";
    stylesheet.dataset.launchMyNftEmbed = "style";
    document.head.appendChild(stylesheet);

    const observer = new MutationObserver(() => {
      if (buttonContainer.childElementCount > 0) setState("ready");
    });
    observer.observe(buttonContainer, { childList: true, subtree: true });

    const script = document.createElement("script");
    script.type = "module";
    script.src = siteConfig.launchMyNftEmbed.scriptUrl;
    script.crossOrigin = "anonymous";
    script.dataset.launchMyNftEmbed = "script";
    script.onerror = () => setState("error");
    document.body.appendChild(script);

    const timeout = window.setTimeout(() => {
      if (buttonContainer.childElementCount === 0) setState("error");
    }, 20_000);

    return () => {
      observer.disconnect();
      window.clearTimeout(timeout);
      script.remove();
      stylesheet.remove();
      delete window.ownerId;
      delete window.collectionId;
    };
  }, []);

  return (
    <div className={`hero-mint-embed is-${state}`} aria-label="LaunchMyNFT mint controls">
      <div id="mint-button-container" aria-live="polite" />
      <div id="mint-counter" aria-label="Minted supply" />
      {state === "loading" && <span className="hero-mint-loading">LOADING MINT TERMINAL…</span>}
      {state === "error" && <a className="hero-mint-fallback" href={safeExternalUrl(siteConfig.launchMyNftUrl)} target="_blank" rel="noopener noreferrer">OPEN MINT TERMINAL</a>}
      <noscript><a className="hero-mint-fallback" href={safeExternalUrl(siteConfig.launchMyNftUrl)}>OPEN MINT TERMINAL</a></noscript>
    </div>
  );
}
