import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site-config";

export const runtime = "edge";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const count = url.searchParams.get("count") ?? "777";
  const rank = url.searchParams.get("rank") ?? "Alpha Squadron";
  const unit = url.searchParams.get("unit") ?? "Hand-drawn Recruits";
  const wallet = url.searchParams.get("wallet") ?? "ONE TOKEN · ONE SQUADRON";
  const shortened = wallet.length > 44 ? `${wallet.slice(0, 5)}…${wallet.slice(-5)}` : wallet;

  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", background: "#eee9dc", color: "#10120f", padding: 48, fontFamily: "sans-serif", border: "18px solid #263016" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", border: "3px solid #10120f", padding: 32 }}>
        <div style={{ color: "#52631f", fontSize: 28, letterSpacing: 4 }}>SQUADRON FIELD REPORT</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 112, fontWeight: 900, lineHeight: 0.85, color: "#d9a91f" }}>{count}</div>
          <div style={{ fontSize: 38, fontWeight: 900 }}>ACTIVE RECRUITS</div>
        </div>
        <div style={{ display: "flex", gap: 42, fontSize: 25 }}>
          <div><div style={{ color: "#52631f", fontSize: 17 }}>RANK</div>{rank}</div>
          <div><div style={{ color: "#52631f", fontSize: 17 }}>UNIT</div>{unit}</div>
        </div>
        <div style={{ fontSize: 18 }}>{shortened} · {siteConfig.token}</div>
      </div>
      <div style={{ width: 500, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${url.origin}/logo.png`} width="430" height="430" style={{ objectFit: "contain" }} alt="" />
      </div>
    </div>,
    { width: 1200, height: 630 },
  );
}
