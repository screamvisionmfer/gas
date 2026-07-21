"use client";
/* eslint-disable @next/next/no-img-element -- The preview is a generated PNG blob. */

import { useEffect, useState } from "react";
import type { BannerStyle } from "@/lib/banner-config";

export function bannerApiUrl(wallet: string, style: BannerStyle, version = 0) {
  const query = new URLSearchParams({ wallet, style, v: String(version) });
  return `/api/twitter-banner?${query.toString()}`;
}

export function BannerPreview({ wallet, style, refreshKey }: { wallet: string; style: BannerStyle; refreshKey: number }) {
  const [previewUrl, setPreviewUrl] = useState("");
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl = "";
    fetch(bannerApiUrl(wallet, style, refreshKey), { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          const payload = await response.json().catch(() => ({ error: "Banner generation failed." })) as { error?: string };
          throw new Error(payload.error ?? "Banner generation failed.");
        }
        const blob = await response.blob();
        if (blob.type !== "image/png") throw new Error("The generator returned an invalid image.");
        objectUrl = URL.createObjectURL(blob);
        setPreviewUrl(objectUrl);
        setState("ready");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setMessage(error instanceof Error ? error.message : "Banner generation failed.");
        setState("error");
      });

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [refreshKey, style, wallet]);

  return (
    <div className="banner-preview-shell" aria-live="polite" aria-busy={state === "loading"}>
      {previewUrl && <img src={previewUrl} width="1500" height="500" alt="Generated Groypers Alpha Squadron X banner preview" />}
      {state === "loading" && <div className="banner-preview-status"><span /><strong>VERIFYING WALLET / RENDERING 1500×500 PNG</strong></div>}
      {state === "error" && <div className="banner-preview-status banner-preview-error"><strong>GENERATION FAILED</strong><small>{message}</small></div>}
    </div>
  );
}
