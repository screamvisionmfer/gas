import type { CommanderAward, CommanderAwardSummary } from "@/lib/commander-awards-types";
import type { PublicCommanderProfile } from "@/lib/commander-profile-types";
import styles from "./CommanderHQ.module.css";

type Props = {
  summary?: CommanderAwardSummary;
  loading: boolean;
  unavailable: boolean;
  profile: PublicCommanderProfile | null;
  profileUrl: string;
};

function date(value?: string) {
  if (!value) return "ACTIVE STATUS";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric" }).format(new Date(value)).toUpperCase();
}

function AwardCard({ award }: { award: CommanderAward }) {
  return (
    <article className={award.unlocked ? styles.medalUnlocked : styles.medalLocked}>
      <div className={styles.medalMark} aria-hidden="true"><span>{award.icon}</span></div>
      <div><strong>{award.name}</strong><p>{award.unlocked ? award.description : award.condition}</p></div>
      <small>{award.unlocked ? award.type === "status" ? "CURRENT STATUS" : `AWARDED ${date(award.unlockedAt)}` : "LOCKED"}</small>
    </article>
  );
}

export function MedalsSection({ summary, loading, unavailable, profile, profileUrl }: Props) {
  const active = profile?.isPublic === true;
  return (
    <section className={`${styles.hqSection} ${styles.serviceDecorations}`} aria-labelledby="medals-title">
      <header className={styles.decorationsHeader}>
        <div><span className={styles.sectionKicker}>VERIFIED SERVICE RECORD</span><h2 id="medals-title">SERVICE DECORATIONS</h2></div>
        {summary && <strong>{summary.unlockedCount} / {summary.totalCount}<small>UNLOCKED</small></strong>}
      </header>
      {loading ? <p className={styles.decorationsState}>RETRIEVING SERVICE RECORD…</p> : unavailable ? <p className={styles.decorationsState} role="status">SERVICE RECORD TEMPORARILY UNAVAILABLE</p> : !active ? (
        <div className={styles.decorationsState}><strong>PUBLISH YOUR DOSSIER TO BEGIN EARNING SERVICE DECORATIONS</strong><p>Only server-verified public service is entered into the permanent record.</p></div>
      ) : summary ? <div className={styles.decorationsColumns}>
        <div><h3>MEDALS</h3><div className={styles.decorationList}>{summary.medals.map((award) => <AwardCard key={award.id} award={award} />)}</div></div>
        <div><h3>CURRENT STATUS</h3><div className={styles.decorationList}>{summary.statuses.map((award) => <AwardCard key={award.id} award={award} />)}</div>{profileUrl && <a className={styles.dossierCta} href={profileUrl}>VIEW PUBLIC DOSSIER →</a>}</div>
      </div> : <p className={styles.decorationsState}>NO SERVICE DECORATIONS UNLOCKED</p>}
    </section>
  );
}
