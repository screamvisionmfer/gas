"use client";
/* eslint-disable @next/next/no-img-element -- local GAS artwork is served directly. */

import { useState } from "react";
import type { CommanderIdentity, CommanderProfile } from "@/lib/commander-hq-types";
import styles from "./CommanderHQ.module.css";

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-6)}`;
}

export function CommanderHero({ commander, identity }: { commander: CommanderProfile; identity: CommanderIdentity }) {
  const [notice, setNotice] = useState("");
  const twitter = identity.twitter;
  const primaryWallet = identity.linkedWallets.find((wallet) => wallet.isPrimary) ?? identity.linkedWallets[0];

  function comingSoon(label: string) {
    setNotice(`${label} · COMING IN NEXT DEPLOYMENT`);
    window.setTimeout(() => setNotice(""), 2400);
  }

  return (
    <section className={styles.commanderHero} aria-labelledby="commander-name">
      <div className={styles.identityPanel}>
        <div className={styles.identityTopline}><span>COMMANDER PROFILE</span><b>{twitter ? "X LINK READY" : "X NOT CONNECTED"}</b></div>
        <div className={styles.identityMain}>
          <div className={styles.avatar}>{commander.avatarUrl ? <img src={commander.avatarUrl} alt="" /> : <span>SV</span>}</div>
          <div>
            <small>FIELD IDENTITY</small>
            <h1 id="commander-name">{twitter?.displayName ?? commander.displayName}</h1>
            <p>@{twitter?.username ?? commander.username}</p>
          </div>
        </div>
        <div className={styles.walletStatus}>
          <span>{primaryWallet ? "PRIMARY SOLANA WALLET" : "NO WALLET CONNECTED"}</span>
          <strong>{primaryWallet ? shortAddress(primaryWallet.address) : "AWAITING LINK"}</strong>
        </div>
        <div className={styles.primaryRecruit}>
          <img src={commander.primarySoldier.image} alt={commander.primarySoldier.name} />
          <div><small>SELECTED FIELD OPERATIVE</small><strong>{commander.primarySoldier.name}</strong><span>{commander.primarySoldier.rank} · RARITY {commander.primarySoldier.rarity}</span></div>
        </div>
        <div className={styles.heroActions}>
          <button type="button" onClick={() => comingSoon("CONNECT X")}>CONNECT X</button>
          <button type="button" onClick={() => comingSoon("CONNECT WALLET")}>CONNECT WALLET</button>
          <button type="button" onClick={() => comingSoon("SHARE COMMANDER CARD")}>SHARE COMMANDER CARD</button>
        </div>
        <p className={styles.heroNotice} aria-live="polite">{notice}</p>
      </div>

      <div className={styles.rankPanel}>
        <span className={styles.rankKicker}>CURRENT CLASSIFICATION</span>
        <div className={styles.rankCore}>
          <img src={commander.rankImage} alt={`${commander.rank} insignia`} />
          <div><h2>{commander.rank}</h2><p>ALPHA COMMAND</p></div>
        </div>
        <div className={styles.rankMetrics}>
          <div><small>ACTIVE SOLDIERS</small><strong>{commander.armySize}</strong></div>
          <div><small>COMMANDER SCORE</small><strong>{commander.commanderScore.toLocaleString("en-US")}</strong></div>
          <div><small>MEMBER SINCE</small><strong>{commander.memberSince}</strong></div>
        </div>
        <div className={styles.rankProgress}>
          <div><span>NEXT RANK</span><strong>{commander.nextRank ?? "MAXIMUM RANK"}</strong></div>
          <div className={styles.rankProgressTrack}><span style={{ width: `${commander.rankProgress}%` }} /></div>
          <small>{commander.soldiersNeeded ? `${commander.soldiersNeeded} SOLDIERS REQUIRED` : "TOP CLASSIFICATION ACHIEVED"}</small>
        </div>
      </div>
    </section>
  );
}

