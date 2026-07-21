"use client";
/* eslint-disable @next/next/no-img-element -- local GAS artwork is served directly. */

import type { CommanderIdentity, CommanderProfile } from "@/lib/commander-hq-types";
import styles from "./CommanderHQ.module.css";

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-6)}`;
}

type CommanderHeroProps = {
  commander: CommanderProfile;
  identity: CommanderIdentity;
  onConnectWallet: () => void;
  walletBusy: boolean;
  walletConnected: boolean;
  walletNotice: string;
  onLogoutIdentity: () => Promise<void>;
};

export function CommanderHero({ commander, identity, onConnectWallet, walletBusy, walletConnected, walletNotice, onLogoutIdentity }: CommanderHeroProps) {
  const twitter = identity.twitter;
  const primaryWallet = identity.wallets.find((wallet) => wallet.primary) ?? identity.wallets[0];

  return (
    <section className={styles.commanderHero} aria-labelledby="commander-name">
      <div className={styles.identityPanel}>
        <div className={styles.identityTopline}><span>COMMANDER PROFILE</span><b>X IDENTITY VERIFIED</b></div>
        <div className={styles.identityMain}>
          <div className={styles.avatar}>{twitter.profileImage ? <img src={twitter.profileImage} alt="" /> : <span>{twitter.displayName.slice(0, 2).toUpperCase()}</span>}</div>
          <div>
            <small>FIELD IDENTITY</small>
            <h1 id="commander-name">{twitter.displayName}</h1>
            <p>@{twitter.username}</p>
          </div>
        </div>
        <div className={styles.walletStatus}>
          <span>{primaryWallet ? "PRIMARY SOLANA WALLET" : "NO WALLET CONNECTED"}</span>
          <strong>{primaryWallet ? shortAddress(primaryWallet.address) : "AWAITING LINK"}</strong>
        </div>
        {commander.primarySoldier ? (
          <div className={styles.primaryRecruit}>
            <img src={commander.primarySoldier.image} alt={commander.primarySoldier.name} />
            <div><small>SELECTED FIELD OPERATIVE</small><strong>{commander.primarySoldier.name}</strong><span>{commander.primarySoldier.rank ?? "GAS RECRUIT"} · RARITY {commander.primarySoldier.rarity ?? "UNRANKED"}</span></div>
          </div>
        ) : (
          <div className={styles.primaryRecruit}>
            <img src="/logo.png" alt="" />
            <div><small>SELECTED FIELD OPERATIVE</small><strong>AWAITING WALLET SCAN</strong><span>NO ON-CHAIN PERSONNEL LOADED</span></div>
          </div>
        )}
        <div className={styles.heroActions}>
          <button type="button" disabled>X VERIFIED</button>
          <button type="button" onClick={onConnectWallet} disabled={walletBusy}>{walletBusy ? "LINKING WALLET..." : walletConnected ? "CHANGE WALLET" : "CONNECT WALLET"}</button>
          <button type="button" disabled title="Coming in next deployment">VIEW PUBLIC PROFILE<small>COMING IN NEXT DEPLOYMENT</small></button>
          <button type="button" onClick={() => void onLogoutIdentity()} disabled={walletBusy}>SIGN OUT IDENTITY</button>
        </div>
        <p className={styles.heroNotice} aria-live="polite">{walletNotice}</p>
      </div>

      <div className={styles.rankPanel}>
        <span className={styles.rankKicker}>CURRENT CLASSIFICATION</span>
        <div className={styles.rankCore}>
          <img src={commander.rankImage} alt={`${commander.rank} insignia`} />
          <div><h2>{commander.rank}</h2><p>{commander.rankUnit}</p></div>
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
