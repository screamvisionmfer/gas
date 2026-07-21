/* eslint-disable @next/next/no-img-element -- local GAS artwork is served directly. */

import Link from "next/link";
import type { Soldier } from "@/lib/commander-hq-types";
import styles from "./CommanderHQ.module.css";

function SoldierCard({ soldier }: { soldier: Soldier }) {
  return (
    <article className={styles.soldierCard}>
      <div className={styles.soldierImage}><img src={soldier.image} alt={soldier.name} loading="lazy" /><span>{soldier.rarity ?? "UNRANKED"}</span></div>
      <div className={styles.soldierCopy}>
        <small>{soldier.mint}</small>
        <h3>{soldier.name}</h3>
        <b>{soldier.rank ?? "RECRUIT"}</b>
        <dl>
          {(soldier.traits ?? []).slice(0, 2).map((trait) => <div key={trait.traitType}><dt>{trait.traitType}</dt><dd>{trait.value}</dd></div>)}
        </dl>
      </div>
    </article>
  );
}

export function ArmySection({ soldiers, armySize }: { soldiers: Soldier[]; armySize: number }) {
  const bestSoldier = soldiers[0];
  return (
    <section className={styles.hqSection} aria-labelledby="army-title">
      <header className={styles.sectionHeader}>
        <div><span>PERSONNEL MANIFEST</span><h2 id="army-title">YOUR ARMY</h2></div>
        <div className={styles.armySummary}><p><strong>{armySize}</strong><span>TOTAL GAS NFT</span></p><p><strong>{bestSoldier?.name ?? "—"}</strong><span>BEST SOLDIER</span></p></div>
      </header>
      {soldiers.length ? (
        <div className={styles.soldierRail}>{soldiers.slice(0, 6).map((soldier) => <SoldierCard key={soldier.mint} soldier={soldier} />)}</div>
      ) : (
        <div className={styles.emptyState}><strong>NO ACTIVE SOLDIERS DETECTED</strong><p>Connect a Solana wallet holding GAS recruits to populate this manifest.</p></div>
      )}
      <Link className={styles.sectionButton} href="/#recruits">VIEW ALL SOLDIERS</Link>
    </section>
  );
}

