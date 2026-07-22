/* eslint-disable @next/next/no-img-element -- ImageResponse requires native image elements. */

import { ImageResponse } from "next/og";
import { cachedPublicCommanderProfile } from "@/lib/public-commander-profile";
import { siteConfig } from "@/lib/site-config";

export const runtime = "nodejs";
export const alt = "Groypers Alpha Squadron Commander dossier";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function safeImageUrl(value?: string) {
  if (!value || value.length > 2048) return `${siteConfig.canonicalUrl}/logo.png`;
  try {
    const url = new URL(value, siteConfig.canonicalUrl);
    return url.protocol === "https:" ? url.toString() : `${siteConfig.canonicalUrl}/logo.png`;
  } catch {
    return `${siteConfig.canonicalUrl}/logo.png`;
  }
}

async function imageData(value?: string) {
  const fallback = `${siteConfig.canonicalUrl}/logo.png`;
  for (const candidate of [safeImageUrl(value), fallback]) {
    try {
      const response = await fetch(candidate, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(5_000) });
      const contentType = response.headers.get("content-type") ?? "";
      if (!response.ok || !contentType.startsWith("image/")) continue;
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length > 5_000_000) continue;
      return `data:${contentType};base64,${bytes.toString("base64")}`;
    } catch { /* use the next fallback */ }
  }
  return fallback;
}

export default async function OgImage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  let profile = null;
  try { profile = await cachedPublicCommanderProfile(decodeURIComponent(username).replace(/^@/, "").toLowerCase()); } catch { /* fallback card below */ }
  const featured = profile?.featuredSoldier ?? profile?.army[0];
  const displayName = profile?.displayName ?? "GAS COMMANDER";
  const handle = profile?.username ?? "CLASSIFIED";
  const rank = profile?.rank.name ?? "COMMANDER FILE";
  const armySize = profile?.armySize ?? 0;
  const [logoImage, avatarImage, featuredImage] = await Promise.all([imageData("/logo.png"), imageData(profile?.avatarUrl), imageData(featured?.image)]);

  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", background: "#0b1008", color: "#eee9da", padding: 34, fontFamily: "Arial, sans-serif" }}>
      <div style={{ position: "absolute", inset: 16, border: "2px solid #ad8d2b", display: "flex" }} />
      <div style={{ width: "58%", display: "flex", flexDirection: "column", padding: "18px 28px", borderRight: "1px solid #59623e" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, color: "#a9cc49", fontSize: 18, letterSpacing: 3 }}><img src={logoImage} alt="" width="94" height="94" style={{ objectFit: "contain" }} />GAS PERSONNEL NETWORK</div>
        <div style={{ display: "flex", alignItems: "center", gap: 22, marginTop: 32 }}><img src={avatarImage} alt="" width="112" height="112" style={{ objectFit: "cover", border: "3px solid #9aac4b" }} /><div style={{ display: "flex", flexDirection: "column" }}><span style={{ color: "#dcb33a", fontSize: 45, fontWeight: 900 }}>{displayName}</span><span style={{ color: "#a5ae91", fontSize: 25 }}>@{handle}</span></div></div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 38 }}><span style={{ color: "#87946d", fontSize: 16, letterSpacing: 2 }}>CURRENT CLASSIFICATION</span><strong style={{ marginTop: 5, color: "#e0b63a", fontSize: 54 }}>{rank.toUpperCase()}</strong></div>
        <div style={{ display: "flex", gap: 50, marginTop: "auto", borderTop: "1px solid #485134", paddingTop: 20 }}><div style={{ display: "flex", flexDirection: "column" }}><span style={{ color: "#87946d", fontSize: 14 }}>ARMY SIZE</span><strong style={{ color: "#b6d84c", fontSize: 38 }}>{armySize}</strong></div><div style={{ display: "flex", flexDirection: "column" }}><span style={{ color: "#87946d", fontSize: 14 }}>STATUS</span><strong style={{ color: "#eee9da", fontSize: 28 }}>ACTIVE COMMANDER</strong></div></div>
      </div>
      <div style={{ width: "42%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 28 }}><span style={{ color: "#9fb948", fontSize: 17, letterSpacing: 3 }}>FEATURED SOLDIER</span><img src={featuredImage} alt="" width="310" height="310" style={{ marginTop: 16, objectFit: "cover", border: "5px solid #c5a130" }} /><strong style={{ marginTop: 15, fontSize: 29 }}>{featured?.name ?? "AWAITING DEPLOYMENT"}</strong><span style={{ marginTop: "auto", color: "#d5b13a", fontSize: 19 }}>GROYPERSQUADRON.XYZ</span></div>
    </div>,
    size,
  );
}
