import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import type sharpType from "sharp";
import type * as OpenType from "opentype.js";
import { bannerStyles, isBannerStyle, type BannerStyle } from "@/lib/banner-config";
import { normalizeBannerImageUrl } from "@/lib/banner-images";
import { verifySquadron } from "@/lib/nft-verification";
import { siteConfig } from "@/lib/site-config";
import type { SquadronResult } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const sharp = createRequire(import.meta.url)("sharp") as typeof sharpType;
const opentype = createRequire(import.meta.url)("opentype.js") as typeof OpenType;

const fontFiles = Promise.all([
  readFile(path.join(process.cwd(), "public", "fonts", "TopSecretC.otf")),
  readFile(path.join(process.cwd(), "public", "fonts", "OperationNapalm-Regular.otf")),
]);
const parsedFonts = fontFiles.then(([topSecret, napalm]) => [
  opentype.parse(topSecret.buffer.slice(topSecret.byteOffset, topSecret.byteOffset + topSecret.byteLength) as ArrayBuffer),
  opentype.parse(napalm.buffer.slice(napalm.byteOffset, napalm.byteOffset + napalm.byteLength) as ArrayBuffer),
] as const);
const localImageCache = new Map<string, Promise<Buffer>>();

function shortenWallet(wallet: string) {
  return `${wallet.slice(0, 5)}…${wallet.slice(-5)}`;
}

function textPath(font: OpenType.Font, value: string | number, x: number, y: number, size: number, color: string, anchor: "start" | "end" = "start") {
  const text = String(value);
  const originX = anchor === "end" ? x - font.getAdvanceWidth(text, size, { kerning: true }) : x;
  const glyphPath = font.getPath(text, originX, y, size, { kerning: true });
  return `<path d="${glyphPath.toPathData(2)}" fill="${color}"/>`;
}

function localAssetPath(source: string) {
  const publicRoot = path.resolve(process.cwd(), "public");
  const resolved = path.resolve(publicRoot, source.replace(/^\/+/, ""));
  return resolved.startsWith(`${publicRoot}${path.sep}`) ? resolved : null;
}

function localImageBuffer(source: string) {
  const filePath = localAssetPath(source);
  if (!filePath) return Promise.reject(new Error("Invalid local image path."));
  const cached = localImageCache.get(filePath);
  if (cached) return cached;
  const pending = readFile(filePath);
  localImageCache.set(filePath, pending);
  return pending;
}

async function safeImageBuffer(source?: string) {
  const fallback = () => localImageBuffer(siteConfig.banner.logoPath);
  if (!source) return fallback();
  if (source.startsWith("/")) {
    try { return await localImageBuffer(source); } catch { return fallback(); }
  }

  const normalized = normalizeBannerImageUrl(source);
  if (normalized === new URL(siteConfig.banner.logoPath, siteConfig.canonicalUrl).toString()) return fallback();
  try {
    const response = await fetch(normalized, { cache: "no-store", redirect: "error", signal: AbortSignal.timeout(10_000) });
    const contentType = response.headers.get("content-type")?.split(";")[0] ?? "";
    const declaredSize = Number(response.headers.get("content-length") ?? 0);
    if (!response.ok || !contentType.startsWith("image/") || declaredSize > 12 * 1024 * 1024) throw new Error("Recruit image is unavailable.");
    const data = Buffer.from(await response.arrayBuffer());
    if (data.byteLength > 12 * 1024 * 1024) throw new Error("Recruit image is too large.");
    return data;
  } catch {
    return fallback();
  }
}

async function prepareImage(input: Buffer, width: number, height: number, fit: "contain" | "cover") {
  return sharp(input)
    .resize({ width, height, fit, position: "centre", background: { r: 7, g: 11, b: 5, alpha: 0 } })
    .png()
    .toBuffer();
}

function bannerSvg(result: SquadronResult, styleName: BannerStyle, topSecret: OpenType.Font, napalm: OpenType.Font) {
  const colors = bannerStyles[styleName];
  const tactical = styleName === "tactical";
  const rankName = result.rank.name.toUpperCase();
  const rankSize = rankName.length > 25 ? 44 : rankName.length > 18 ? 56 : 70;
  const recruitName = (result.bestRecruit?.name ?? "GAS RECRUIT").toUpperCase();
  const recruitSize = recruitName.length > 24 ? 20 : 25;
  const reportId = `GAS-${result.wallet.slice(0, 4).toUpperCase()}`;
  const background = tactical ? ["#071006", "#0d1d0b", "#030603"] : ["#18230e", "#0b1008", "#040704"];

  return Buffer.from(`
    <svg width="1500" height="500" viewBox="0 0 1500 500" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="${background[0]}"/><stop offset=".52" stop-color="${background[1]}"/><stop offset="1" stop-color="${background[2]}"/>
        </linearGradient>
        <pattern id="grid" width="60" height="55" patternUnits="userSpaceOnUse"><path d="M60 0H0V55" fill="none" stroke="${colors.grid}" stroke-width="1"/></pattern>
      </defs>
      <rect width="1500" height="500" fill="url(#bg)"/><rect width="1500" height="500" fill="url(#grid)"/>
      <rect x="18" y="18" width="1464" height="464" fill="none" stroke="${colors.gold}" stroke-width="3" opacity=".82"/>
      <rect x="30" y="30" width="1440" height="440" fill="none" stroke="${colors.green}" opacity=".45"/>
      <rect x="60" y="46" width="204" height="204" fill="${colors.panel}" stroke="${colors.gold}"/>
      <rect x="75" y="270" width="174" height="168" fill="#030803" fill-opacity=".76" stroke="${colors.green}"/>
      <rect x="1120" y="46" width="320" height="304" fill="${colors.panel}" stroke="${colors.gold}" stroke-width="2"/>

      ${textPath(napalm, "GAS PERSONNEL SYSTEM / IDENTITY CONFIRMED", 300, 66, 21, colors.green)}
      ${textPath(topSecret, rankName, 300, 155, rankSize, colors.gold)}
      ${textPath(topSecret, result.unitName.toUpperCase(), 300, 198, 29, colors.text)}

      <rect x="300" y="236" width="770" height="105" fill="#040803" fill-opacity=".78" stroke="${colors.muted}"/>
      <path d="M475 236V341M815 236V341" stroke="${colors.muted}"/>
      ${textPath(napalm, "ACTIVE RECRUITS", 324, 273, 15, colors.muted)}
      ${textPath(topSecret, result.count, 324, 319, 39, colors.gold)}
      ${textPath(napalm, "WALLET", 499, 273, 15, colors.muted)}
      ${textPath(napalm, shortenWallet(result.wallet), 499, 315, 25, colors.text)}
      ${textPath(napalm, "REPORT ID", 839, 273, 15, colors.muted)}
      ${textPath(napalm, reportId, 839, 315, 25, colors.text)}
      ${textPath(napalm, siteConfig.banner.tagline, 300, 384, 17, colors.green)}

      ${textPath(topSecret, recruitName, 1120, 384, recruitSize, colors.text)}
      ${textPath(napalm, siteConfig.token, 300, 468, 18, colors.gold)}
      ${textPath(napalm, siteConfig.banner.websiteLabel, 1440, 468, 18, colors.text, "end")}
    </svg>
  `);
}

function recruitOverlaySvg(styleName: BannerStyle, napalm: OpenType.Font) {
  const colors = bannerStyles[styleName];
  return Buffer.from(`
    <svg width="1500" height="500" xmlns="http://www.w3.org/2000/svg">
      <rect x="1122" y="295" width="316" height="53" fill="#030602" fill-opacity=".91"/>
      <path d="M1122 295H1438" stroke="${colors.gold}"/>
      ${textPath(napalm, "PRIORITY RECRUIT", 1140, 328, 16, colors.green)}
    </svg>
  `);
}

export async function renderBanner(result: SquadronResult, styleName: BannerStyle) {
  const [fontData, logoSource, rankSource, recruitSource] = await Promise.all([
    parsedFonts,
    localImageBuffer(siteConfig.banner.logoPath),
    safeImageBuffer(result.rank.image),
    safeImageBuffer(result.bestRecruit?.image),
  ]);
  const [logo, rank, recruit] = await Promise.all([
    prepareImage(logoSource, 190, 190, "contain"),
    prepareImage(rankSource, 142, 142, "contain"),
    prepareImage(recruitSource, 316, 300, "cover"),
  ]);

  return sharp(bannerSvg(result, styleName, fontData[0], fontData[1]))
    .composite([
      { input: logo, left: 67, top: 53 },
      { input: rank, left: 91, top: 283 },
      { input: recruit, left: 1122, top: 48 },
      { input: recruitOverlaySvg(styleName, fontData[1]), left: 0, top: 0 },
    ])
    .png({ compressionLevel: 9, palette: false })
    .toBuffer();
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const wallet = url.searchParams.get("wallet")?.trim() ?? "";
  const requestedStyle = url.searchParams.get("style");
  const styleName = requestedStyle ?? siteConfig.banner.defaultStyle;

  if (!wallet) return Response.json({ error: "Wallet address is required." }, { status: 400 });
  if (!isBannerStyle(styleName)) return Response.json({ error: "Unknown banner style." }, { status: 400 });

  try {
    const result = await verifySquadron(wallet);
    if (result.count === 0 || !result.bestRecruit) return Response.json({ error: "No active GAS recruits were found in this wallet." }, { status: 422 });
    const png = await renderBanner(result, styleName);
    return new Response(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "private, no-store",
        "Content-Disposition": `inline; filename="gas-x-banner-${result.wallet.slice(0, 5)}.png"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate banner.";
    const status = message.includes("valid Solana") ? 400 : 502;
    return Response.json({ error: message }, { status });
  }
}
