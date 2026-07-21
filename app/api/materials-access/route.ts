import { NextResponse } from "next/server";
import { inspectMaterialsAccess } from "@/lib/materials-access";
import { isSolanaAddress } from "@/lib/nft-verification";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { wallet?: string };
    const wallet = body.wallet?.trim() ?? "";
    if (!isSolanaAddress(wallet)) {
      return NextResponse.json({ error: "Enter a valid Solana wallet address." }, { status: 400 });
    }

    const access = await inspectMaterialsAccess(wallet);
    return NextResponse.json(access, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to inspect this wallet.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

