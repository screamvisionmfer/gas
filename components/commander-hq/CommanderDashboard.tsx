/* eslint-disable @next/next/no-img-element -- local GAS artwork is served directly. */

import type { CommanderDashboardData } from "@/lib/commander-hq-types";
import { Header, Footer } from "@/components/LandingPage";
import { CommanderHero } from "./CommanderHero";
import { ArmySection } from "./ArmySection";
import { TreasurySection } from "./TreasurySection";
import { MarketIntelSection } from "./MarketIntelSection";
import { MedalsSection } from "./MedalsSection";
import { QuickActions } from "./QuickActions";
import styles from "./CommanderHQ.module.css";

export function CommanderDashboard({ data }: { data: CommanderDashboardData }) {
  return (
    <main className={styles.dashboardPage}>
      <Header />
      <div className={styles.commanderShell}>
        <div className={styles.commanderMasthead}>
          <span>GAS PERSONNEL NETWORK / PRIVATE COMMAND NODE</span>
          <b>{data.dataMode === "mock" ? "SIMULATION DATA" : "LIVE ON-CHAIN DATA"}</b>
        </div>
        <CommanderHero commander={data.commander} identity={data.identity} />
        <ArmySection soldiers={data.soldiers} armySize={data.commander.armySize} />
        <TreasurySection treasury={data.treasury} provisions={data.provisions} />
        <MarketIntelSection market={data.market} />
        <MedalsSection medals={data.medals} achievements={data.achievements} />
        <QuickActions />
      </div>
      <Footer />
    </main>
  );
}

export function CommanderDashboardError() {
  return (
    <main className={styles.dashboardPage}>
      <Header />
      <div className={styles.commanderShell}>
        <section className={styles.dashboardError}>
          <img src="/logo.png" width="120" height="120" alt="Groypers Alpha Squadron" />
          <span>COMMAND NETWORK INTERRUPTION</span>
          <h1>HQ DATA UNAVAILABLE</h1>
          <p>The terminal is cleared, but the personnel feed could not be loaded. Retry the operation shortly.</p>
          <a href="/commander-hq">RETRY CONNECTION</a>
        </section>
      </div>
    </main>
  );
}
