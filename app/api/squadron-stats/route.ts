import { NextResponse } from "next/server";
import { getCollectionAssets } from "@/lib/helius";
import type { SquadronStats } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const collection = await getCollectionAssets();
    const holdings = new Map<string, number>();

    for (const asset of collection.items) {
      const owner = asset.ownership?.owner;
      if (owner) holdings.set(owner, (holdings.get(owner) ?? 0) + 1);
    }

    const stats: SquadronStats = {
      deployed: collection.total,
      commanders: holdings.size,
      largestArmy: Math.max(0, ...holdings.values()),
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json(stats, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load squadron statistics.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
