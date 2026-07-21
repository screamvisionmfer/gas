"use client";

import Link from "next/link";
import { useState } from "react";
import { safeExternalUrl, siteConfig } from "@/lib/site-config";
import styles from "./CommanderHQ.module.css";

export function QuickActions({ onBeforeLock }: { onBeforeLock?: () => Promise<void> }) {
  const [locking, setLocking] = useState(false);

  async function lockTerminal() {
    setLocking(true);
    try {
      await onBeforeLock?.();
      await fetch("/api/commander-hq/logout", { method: "POST" });
    } finally {
      window.location.replace("/commander-hq");
    }
  }

  return (
    <section className={styles.quickActions} aria-labelledby="actions-title">
      <div><span>FIELD OPERATIONS MENU</span><h2 id="actions-title">COMMANDER ACTIONS</h2><p>Deploy your identity, reinforce the squadron, or secure this terminal.</p></div>
      <div className={styles.actionGrid}>
        <Link href="/#command-center">GENERATE BANNER</Link>
        <Link href="/#command-center">SHARE MY RANK</Link>
        <button type="button" disabled title="Coming in next deployment">VIEW LEADERBOARD<small>COMING SOON</small></button>
        <a href={safeExternalUrl(siteConfig.launchMyNftUrl)} target="_blank" rel="noopener noreferrer">RECRUIT SOLDIERS</a>
        <button className={styles.lockButton} type="button" onClick={lockTerminal} disabled={locking}>{locking ? "LOCKING..." : "LOCK TERMINAL"}</button>
      </div>
    </section>
  );
}
