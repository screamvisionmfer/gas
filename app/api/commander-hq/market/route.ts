import { NextResponse } from "next/server";
import { hasCommanderApiSession } from "@/lib/commander-api-auth";
import { getGroyperMarketData } from "@/lib/groyper-market";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!(await hasCommanderApiSession())) {
    return NextResponse.json({ error: "COMMANDER_SESSION_REQUIRED" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const forceRefresh = new URL(request.url).searchParams.get("refresh") === "1";
    const market = await getGroyperMarketData({ forceRefresh });
    return NextResponse.json(market, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "MARKET_DATA_UNAVAILABLE" }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}

