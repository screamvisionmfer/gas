/* eslint-disable @next/next/no-img-element -- local GAS artwork is served directly. */

import type { CommanderDashboardData } from "@/lib/commander-hq-types";
import { Header, Footer } from "@/components/LandingPage";
import { CommanderArmyController } from "./CommanderArmyController";
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
          <b>{data.dataMode === "live" ? "LIVE ON-CHAIN DATA" : data.dataMode === "hybrid" ? "LIVE ARMY + MARKET / SIMULATION PROFILE" : "SIMULATION DATA"}</b>
        </div>
        <CommanderArmyController commander={data.commander} identity={data.identity} treasury={data.treasury} />
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
