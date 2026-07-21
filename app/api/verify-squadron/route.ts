import { NextResponse } from "next/server";
import { isSolanaAddress, verifySquadron } from "@/lib/nft-verification";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { wallet?: string; includeAll?: boolean };
    const wallet = body.wallet?.trim() ?? "";
    if (!isSolanaAddress(wallet)) return NextResponse.json({ error: "Enter a valid Solana wallet address." }, { status: 400 });
    const result = await verifySquadron(wallet, { nftLimit: body.includeAll === true ? 1000 : 5 });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to inspect this wallet.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
