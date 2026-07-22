"use client";
/* eslint-disable @next/next/no-img-element -- verified GAS metadata images are served directly. */

import Link from "next/link";
import type { Soldier } from "@/lib/commander-hq-types";
import styles from "./CommanderHQ.module.css";

export type ArmyLoadStatus = "idle" | "connecting" | "loading" | "ready" | "empty" | "error";

function shortMint(mint: string) {
  return mint.length > 16 ? `${mint.slice(0, 6)}…${mint.slice(-6)}` : mint;
}

function SoldierCard({ soldier, canFeature, featured, busy, onSetFeatured }: { soldier: Soldier; canFeature: boolean; featured: boolean; busy: boolean; onSetFeatured: () => void }) {
  return (
    <article className={styles.soldierCard}>
      <div className={styles.soldierImage}><img src={soldier.image} alt={soldier.name} loading="lazy" /><span>{soldier.rarity ?? "UNRANKED"}</span></div>
      <div className={styles.soldierCopy}>
        <small title={soldier.mint}>{shortMint(soldier.mint)}</small>
        <h3>{soldier.name}</h3>
        <b>{soldier.rank ?? "RECRUIT"}</b>
        <dl>
          {(soldier.traits ?? []).slice(0, 2).map((trait) => <div key={trait.traitType}><dt>{trait.traitType}</dt><dd>{trait.value}</dd></div>)}
        </dl>
        {canFeature && <button className={styles.featureSoldierButton} type="button" onClick={onSetFeatured} disabled={featured || busy}>{featured ? "FEATURED SOLDIER" : busy ? "VERIFYING OWNERSHIP…" : "SET AS FEATURED SOLDIER"}</button>}
      </div>
    </article>
  );
}

type ArmySectionProps = {
  soldiers: Soldier[];
  armySize?: number;
  bestSoldier?: Soldier;
  status: ArmyLoadStatus;
  error: string;
  walletConnected: boolean;
  onRefresh: () => void;
  publicProfileActive: boolean;
  featuredMint?: string;
  featuredBusyMint: string;
  onSetFeatured: (mint: string) => void;
};

export function ArmySection({ soldiers, armySize, bestSoldier, status, error, walletConnected, onRefresh, publicProfileActive, featuredMint, featuredBusyMint, onSetFeatured }: ArmySectionProps) {
  const scanning = status === "connecting" || status === "loading";
  const totalLabel = armySize === undefined ? "—" : armySize;
  return (
    <section className={styles.hqSection} aria-labelledby="army-title">
      <header className={styles.sectionHeader}>
        <div><span>PERSONNEL MANIFEST</span><h2 id="army-title">YOUR ARMY</h2></div>
        <div className={styles.armySummary}><p><strong>{totalLabel}</strong><span>TOTAL GAS NFT</span></p><p><strong>{bestSoldier?.name ?? "—"}</strong><span>BEST SOLDIER</span></p></div>
      </header>
      {scanning && !soldiers.length ? (
        <div className={`${styles.emptyState} ${styles.armyLoading}`} aria-live="polite"><strong>SCANNING ON-CHAIN PERSONNEL</strong><span /><p>Reading verified GAS collection assets through the secure server feed.</p></div>
      ) : status === "error" && !soldiers.length ? (
        <div className={`${styles.emptyState} ${styles.armyError}`} role="alert"><strong>ARMY FEED UNAVAILABLE</strong><p>{error}</p></div>
      ) : soldiers.length ? (
        <>
          {status === "error" && <p className={styles.armyInlineError} role="alert">REFRESH FAILED · {error}</p>}
          {scanning && <p className={styles.armyRefreshStatus} aria-live="polite">REFRESHING ON-CHAIN PERSONNEL…</p>}
          <div className={styles.soldierRail}>{soldiers.map((soldier) => <SoldierCard key={soldier.mint} soldier={soldier} canFeature={publicProfileActive} featured={soldier.mint === featuredMint} busy={soldier.mint === featuredBusyMint} onSetFeatured={() => onSetFeatured(soldier.mint)} />)}</div>
        </>
      ) : status === "empty" ? (
        <div className={styles.emptyState}><strong>NO ACTIVE SOLDIERS DETECTED</strong><p>This wallet does not currently hold any verified GAS collection NFT.</p></div>
      ) : (
        <div className={styles.emptyState}><strong>WALLET LINK REQUIRED</strong><p>Connect Phantom or another compatible injected Solana wallet to load the live personnel manifest.</p></div>
      )}
      <div className={styles.sectionActions}>
        <Link className={styles.sectionButton} href="/#recruits">VIEW ALL SOLDIERS</Link>
        {walletConnected && <button className={`${styles.sectionButton} ${styles.refreshButton}`} type="button" onClick={onRefresh} disabled={scanning}>{scanning ? "REFRESHING..." : "REFRESH ARMY"}</button>}
      </div>
    </section>
  );
}
