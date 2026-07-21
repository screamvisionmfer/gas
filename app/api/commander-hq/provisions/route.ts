import { NextResponse } from "next/server";
import { hasCommanderApiSession } from "@/lib/commander-api-auth";
import { groyperConfig } from "@/lib/groyper-config";
import { getFungibleTokenBalanceDetails } from "@/lib/helius";
import { isSolanaAddress } from "@/lib/nft-verification";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await hasCommanderApiSession())) {
    return NextResponse.json({ error: "COMMANDER_SESSION_REQUIRED" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  let body: { wallet?: string };
  try {
    body = await request.json() as { wallet?: string };
  } catch {
    return NextResponse.json({ error: "INVALID_WALLET_ADDRESS" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  const wallet = typeof body.wallet === "string" ? body.wallet.trim() : "";
  if (!isSolanaAddress(wallet)) {
    return NextResponse.json({ error: "INVALID_WALLET_ADDRESS" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const balance = await getFungibleTokenBalanceDetails(wallet, groyperConfig.tokenMint);
    return NextResponse.json(balance, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "TOKEN_BALANCE_UNAVAILABLE" }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
