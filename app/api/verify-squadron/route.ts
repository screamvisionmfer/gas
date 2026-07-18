import { NextResponse } from "next/server";
import { verifySquadron } from "@/lib/nft-verification";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { wallet?: string };
    const wallet = body.wallet?.trim() ?? "";
    const result = await verifySquadron(wallet);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to inspect this wallet.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

