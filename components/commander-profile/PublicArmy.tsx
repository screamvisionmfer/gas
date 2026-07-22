"use client";
/* eslint-disable @next/next/no-img-element -- NFT artwork URLs are stored in the verified server snapshot. */

import { useState } from "react";
import type { Soldier } from "@/lib/commander-hq-types";
import styles from "@/app/commander/[username]/CommanderProfile.module.css";

function Card({ soldier }: { soldier: Soldier }) {
  return (
    <article className={styles.armyCard}>
      <img src={soldier.image || "/logo.png"} alt={soldier.name} loading="lazy" onError={(event) => { event.currentTarget.src = "/logo.png"; }} />
      <div><span>{soldier.rarity ?? "UNRANKED"}</span><h3>{soldier.name}</h3><small>{soldier.rank ?? "GAS RECRUIT"}</small></div>
    </article>
  );
}

export function PublicArmy({ soldiers }: { soldiers: Soldier[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? soldiers : soldiers.slice(0, 9);
  if (!soldiers.length) return <div className={styles.emptyArmy}><strong>NO ACTIVE SOLDIERS</strong><p>This verified wallet currently holds no GAS NFT.</p></div>;

  return (
    <>
      <div className={styles.armyGrid}>{visible.map((soldier) => <Card key={soldier.mint} soldier={soldier} />)}</div>
      {soldiers.length > 9 && <button className={styles.fullArmyButton} type="button" onClick={() => setExpanded((value) => !value)}>{expanded ? "COLLAPSE PERSONNEL FILE" : `VIEW FULL ARMY · ${soldiers.length}`}</button>}
    </>
  );
}

