"use client";
/* eslint-disable @next/next/no-img-element -- X profile images and GAS artwork are rendered directly. */

import { useEffect, useState } from "react";
import type { CommanderDashboardData, CommanderIdentity } from "@/lib/commander-hq-types";
import { Header, Footer } from "@/components/LandingPage";
import { CommanderArmyController } from "./CommanderArmyController";
import { MedalsSection } from "./MedalsSection";
import { QuickActions } from "./QuickActions";
import { useCommanderIdentity } from "./CommanderIdentityProvider";
import styles from "./CommanderHQ.module.css";

const dossierPhases = ["VERIFYING IDENTITY...", "ACCESSING SECURE DATABASE...", "RETRIEVING PERSONNEL FILE...", "MATCH FOUND"];

function IdentityCheckpoint({
  eyebrow,
  title,
  detail,
  action,
  actionLabel,
  busy,
  error,
  identity,
}: {
  eyebrow: string;
  title: string;
  detail: string;
  action?: () => void;
  actionLabel?: string;
  busy?: boolean;
  error?: string;
  identity?: CommanderIdentity | null;
}) {
  return (
    <main className={styles.dashboardPage}>
      <Header />
      <div className={`${styles.commanderShell} ${styles.identityShell}`}>
        <section className={styles.identityCheckpoint} aria-labelledby="identity-checkpoint-title">
          <div className={styles.identityRadar} aria-hidden="true"><span /></div>
          <img src={identity?.twitter.profileImage ?? "/logo.png"} width="108" height="108" alt="" />
          <span>{eyebrow}</span>
          <h1 id="identity-checkpoint-title">{title}</h1>
          {identity && <strong>{identity.twitter.displayName}<small>@{identity.twitter.username}</small></strong>}
          <p>{detail}</p>
          {action && actionLabel && <button type="button" onClick={action} disabled={busy}>{busy ? "PROCESSING..." : actionLabel}</button>}
          <em role="alert">{error}</em>
          <small>GAS PERSONNEL NETWORK · ENCRYPTED IDENTITY CHANNEL</small>
        </section>
      </div>
      <Footer />
    </main>
  );
}

function CommanderDossier({ identity, onComplete }: { identity: CommanderIdentity; onComplete: () => void }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      const finish = window.setTimeout(onComplete, 80);
      return () => window.clearTimeout(finish);
    }

    const timers = dossierPhases.slice(1).map((_, index) => window.setTimeout(() => setStep(index + 1), (index + 1) * 700));
    timers.push(window.setTimeout(onComplete, dossierPhases.length * 700 + 420));
    return () => timers.forEach(window.clearTimeout);
  }, [onComplete]);

  return (
    <main className={styles.identityLoadingPage}>
      <div className={styles.accessScanlines} aria-hidden="true" />
      <section className={styles.dossier} aria-live="polite">
        <div className={styles.dossierHeader}><span>COMMANDER DOSSIER</span><b>{dossierPhases[step]}</b></div>
        <div className={styles.dossierBody}>
          <img src={identity.twitter.profileImage ?? "/logo.png"} width="110" height="110" alt="" />
          <dl>
            <div className={step >= 0 ? styles.dossierVisible : ""}><dt>NAME</dt><dd>{identity.twitter.username.toUpperCase()}</dd></div>
            <div className={step >= 1 ? styles.dossierVisible : ""}><dt>DISPLAY NAME</dt><dd>{identity.twitter.displayName.toUpperCase()}</dd></div>
            <div className={step >= 2 ? styles.dossierVisible : ""}><dt>RANK</dt><dd>CLASSIFICATION PENDING</dd></div>
            <div className={step >= 3 ? styles.dossierVisible : ""}><dt>STATUS</dt><dd>VERIFIED</dd></div>
          </dl>
        </div>
        <div className={styles.dossierProgress}><span style={{ width: `${((step + 1) / dossierPhases.length) * 100}%` }} /></div>
        <small>PRIVY ID · {identity.privyId.slice(-16).toUpperCase()}</small>
      </section>
    </main>
  );
}

export function CommanderIdentityGateway({ data }: { data: CommanderDashboardData }) {
  const { configured, ready, authenticated, identity, operation, error, continueWithX, connectWallet, logout } = useCommanderIdentity();
  const [completedDossierKey, setCompletedDossierKey] = useState("");
  const primaryWallet = identity?.wallets.find((wallet) => wallet.primary) ?? identity?.wallets[0];

  if (!configured) {
    return <IdentityCheckpoint eyebrow="IDENTITY NETWORK OFFLINE" title="PRIVY CONFIGURATION REQUIRED" detail="Add the Commander Identity environment values to activate X authorization and Solana wallet linking." error={error} />;
  }

  if (!ready) {
    return <IdentityCheckpoint eyebrow="SECURE HANDSHAKE" title="INITIALIZING IDENTITY NETWORK" detail="Restoring the encrypted Commander session." busy />;
  }

  if (!authenticated || !identity) {
    return <IdentityCheckpoint eyebrow="IDENTITY VERIFICATION" title="COMMANDER ID REQUIRED" detail="Authenticate the X account assigned to this personnel file." action={continueWithX} actionLabel="CONTINUE WITH X" busy={operation === "login"} error={error} />;
  }

  if (!primaryWallet) {
    return <IdentityCheckpoint eyebrow="IDENTITY CONFIRMED" title="PRIMARY WALLET NOT FOUND" detail="Link an existing Solana wallet. This operation verifies ownership only and never requests a transaction." action={connectWallet} actionLabel="CONNECT WALLET" busy={operation === "connecting" || operation === "linking"} error={error} identity={identity} />;
  }

  const dossierKey = `${identity.privyId}:${primaryWallet.address}`;
  if (completedDossierKey !== dossierKey) return <CommanderDossier identity={identity} onComplete={() => setCompletedDossierKey(dossierKey)} />;

  async function logoutIdentity() {
    setCompletedDossierKey("");
    await logout();
  }

  return (
    <main className={styles.dashboardPage}>
      <Header />
      <div className={styles.commanderShell}>
        <div className={styles.commanderMasthead}>
          <span>GAS PERSONNEL NETWORK / PRIVATE COMMAND NODE</span>
          <b>IDENTITY + ARMY + MARKET VERIFIED</b>
        </div>
        <CommanderArmyController
          commander={data.commander}
          identity={identity}
          treasury={data.treasury}
          walletAddress={primaryWallet.address}
          onConnectWallet={connectWallet}
          onLogoutIdentity={logoutIdentity}
          identityBusy={operation !== "idle"}
        />
        <MedalsSection medals={data.medals} achievements={data.achievements} />
        <QuickActions onBeforeLock={logoutIdentity} />
      </div>
      <Footer />
    </main>
  );
}
