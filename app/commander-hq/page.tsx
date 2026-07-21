import type { Metadata } from "next";
import { cookies } from "next/headers";
import { CommanderAccessGate } from "@/components/commander-hq/CommanderAccessGate";
import { COMMANDER_SESSION_COOKIE, verifyCommanderSession } from "@/lib/commander-auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Commander HQ — Groypers Alpha Squadron",
  description: "Protected command center for cleared GAS personnel.",
  robots: { index: false, follow: false },
};

export default async function CommanderHQRoute() {
  const cookieStore = await cookies();
  let authorized = false;
  let configurationError = false;

  try {
    authorized = verifyCommanderSession(cookieStore.get(COMMANDER_SESSION_COOKIE)?.value);
  } catch {
    configurationError = true;
  }

  if (!authorized) return <CommanderAccessGate configurationError={configurationError} />;

  const [{ CommanderDashboard, CommanderDashboardError }, { commanderDataProvider }] = await Promise.all([
    import("@/components/commander-hq/CommanderDashboard"),
    import("@/lib/commander-hq-provider"),
  ]);
  const data = await commanderDataProvider.getDashboard().catch(() => null);
  return data ? <CommanderDashboard data={data} /> : <CommanderDashboardError />;
}
