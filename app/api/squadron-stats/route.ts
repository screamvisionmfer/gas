import { NextResponse } from "next/server";
import { getCollectionAssets } from "@/lib/helius";
import { siteConfig } from "@/lib/site-config";
import { getLaunchMyNftMintStats } from "@/lib/launchmynft";
import type { SquadronStats } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [collection, launchpad] = await Promise.all([
      getCollectionAssets(),
      getLaunchMyNftMintStats().catch(() => null),
    ]);
    const holdings = new Map<string, number>();

    for (const asset of collection.items) {
      const owner = asset.ownership?.owner;
      if (owner) holdings.set(owner, (holdings.get(owner) ?? 0) + 1);
    }

    const excludedFromLargestArmy = new Set<string>(siteConfig.statistics.largestArmyExcludedWallets);
    const teamAllocation = [...holdings.entries()]
      .filter(([owner]) => excludedFromLargestArmy.has(owner))
      .reduce((total, [, count]) => total + count, 0);
    const eligibleArmies = [...holdings.entries()]
      .filter(([owner]) => !excludedFromLargestArmy.has(owner))
      .map(([, count]) => count);

    const stats: SquadronStats = {
      deployed: launchpad?.totalMints ?? collection.total,
      teamAllocation,
      commanders: holdings.size,
      largestArmy: Math.max(0, ...eligibleArmies),
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
