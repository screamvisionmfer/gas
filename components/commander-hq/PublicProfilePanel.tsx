"use client";

import type { PublicCommanderProfile } from "@/lib/commander-profile-types";
import styles from "./CommanderHQ.module.css";

type Props = {
  profile: PublicCommanderProfile | null;
  profileUrl: string;
  loading: boolean;
  busyAction: string;
  error: string;
  consent: boolean;
  onConsentChange: (value: boolean) => void;
  onCreate: () => void;
  onSync: () => void;
  onUnpublish: () => void;
  onCopy: () => void;
};

function shareUrl(profile: PublicCommanderProfile, profileUrl: string) {
  const text = `I command ${profile.armySize} soldiers in the Groypers Alpha Squadron.\n\nCurrent rank: ${profile.rank.name}.\n\nView my commander dossier:`;
  return `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(profileUrl)}`;
}

export function PublicProfilePanel(props: Props) {
  const { profile, profileUrl, loading, busyAction, error, consent, onConsentChange, onCreate, onSync, onUnpublish, onCopy } = props;
  const active = profile?.isPublic === true;

  return (
    <section className={styles.publicProfilePanel} aria-labelledby="public-profile-title">
      <div>
        <span>PUBLIC PERSONNEL FILE</span>
        <h2 id="public-profile-title">COMMANDER DOSSIER</h2>
        <p>{active ? `Published as @${profile.username}` : "Create a public, shareable snapshot of your verified identity and on-chain Army."}</p>
      </div>

      {loading ? <strong className={styles.profileStatus}>CHECKING PUBLIC FILE…</strong> : active ? (
        <div className={styles.profileActions}>
          <button type="button" onClick={onCopy}>COPY PROFILE LINK</button>
          <a href={profileUrl} target="_blank" rel="noreferrer">OPEN PUBLIC PROFILE</a>
          <a href={shareUrl(profile, profileUrl)} target="_blank" rel="noreferrer">SHARE TO X</a>
          <button type="button" onClick={onSync} disabled={Boolean(busyAction)}>{busyAction === "sync" ? "SYNCING…" : "SYNC PUBLIC PROFILE"}</button>
          <button type="button" onClick={onUnpublish} disabled={Boolean(busyAction)}>{busyAction === "unpublish" ? "UNPUBLISHING…" : "UNPUBLISH PROFILE"}</button>
        </div>
      ) : (
        <div className={styles.profilePublishControls}>
          <label>
            <input type="checkbox" checked={consent} onChange={(event) => onConsentChange(event.target.checked)} />
            <span>Your X identity, rank, army size, featured NFT and primary wallet address will become publicly visible.</span>
          </label>
          <button type="button" onClick={onCreate} disabled={!consent || Boolean(busyAction)}>{busyAction === "create" ? "CREATING PUBLIC FILE…" : profile ? "REPUBLISH PROFILE" : "CREATE PUBLIC PROFILE"}</button>
        </div>
      )}
      {error && <p className={styles.profileError} role="alert">{error}</p>}
    </section>
  );
}

