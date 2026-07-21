/* eslint-disable @next/next/no-img-element -- local GAS artwork is served directly. */

import type { CommanderDashboardData } from "@/lib/commander-hq-types";
import { Header } from "@/components/LandingPage";
import { CommanderIdentityGateway } from "./CommanderIdentityGateway";
import { CommanderIdentityProvider } from "./CommanderIdentityProvider";
import styles from "./CommanderHQ.module.css";

export function CommanderDashboard({ data }: { data: CommanderDashboardData }) {
  return (
    <CommanderIdentityProvider>
      <CommanderIdentityGateway data={data} />
    </CommanderIdentityProvider>
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
