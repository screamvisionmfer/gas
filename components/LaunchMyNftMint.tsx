"use client";

import { useEffect, useState } from "react";
import { safeExternalUrl, siteConfig } from "@/lib/site-config";

declare global {
  interface Window {
    ownerId?: string;
    collectionId?: string;
  }
}

type EmbedState = "loading" | "ready" | "blocked" | "error";

export function LaunchMyNftMint() {
  const [state, setState] = useState<EmbedState>("loading");

  useEffect(() => {
    const buttonContainer = document.getElementById("mint-button-container");
    if (!buttonContainer) return;
    const embedContainer = buttonContainer;

    window.ownerId = siteConfig.launchMyNftEmbed.ownerId;
    window.collectionId = siteConfig.launchMyNftEmbed.collectionId;

    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = siteConfig.launchMyNftEmbed.stylesheetUrl;
    stylesheet.crossOrigin = "anonymous";
    stylesheet.dataset.launchMyNftEmbed = "style";
    document.head.appendChild(stylesheet);

    function syncEmbedState() {
      const control = embedContainer.querySelector<HTMLButtonElement | HTMLAnchorElement>("button, a");
      if (!control) return;
      const disabled = (control instanceof HTMLButtonElement && control.disabled)
        || control.getAttribute("aria-disabled") === "true";
      setState(disabled ? "blocked" : "ready");
    }

    const observer = new MutationObserver(syncEmbedState);
    observer.observe(embedContainer, {
      attributes: true,
      attributeFilter: ["disabled", "aria-disabled", "style"],
      childList: true,
      subtree: true,
    });

    const script = document.createElement("script");
    script.type = "module";
    script.src = siteConfig.launchMyNftEmbed.scriptUrl;
    script.crossOrigin = "anonymous";
    script.dataset.launchMyNftEmbed = "script";
    script.onload = syncEmbedState;
    script.onerror = () => setState("error");
    document.body.appendChild(script);

    const timeout = window.setTimeout(() => {
      if (embedContainer.childElementCount === 0) setState("error");
      else syncEmbedState();
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
      {state !== "ready" && (
        <a className="hero-mint-fallback" href={safeExternalUrl(siteConfig.launchMyNftUrl)} target="_blank" rel="noopener noreferrer">
          MINT NOW
        </a>
      )}
      <noscript><a className="hero-mint-fallback" href={safeExternalUrl(siteConfig.launchMyNftUrl)}>OPEN MINT TERMINAL</a></noscript>
    </div>
  );
}
