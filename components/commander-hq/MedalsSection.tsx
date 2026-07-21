import type { Achievement, Medal } from "@/lib/commander-hq-types";
import styles from "./CommanderHQ.module.css";

export function MedalsSection({ medals, achievements }: { medals: Medal[]; achievements: Achievement[] }) {
  return (
    <section className={`${styles.hqSection} ${styles.awardsSection}`} aria-labelledby="medals-title">
      <div>
        <span className={styles.sectionKicker}>SERVICE DECORATIONS</span>
        <h2 id="medals-title">MEDALS</h2>
        <div className={styles.medalGrid}>
          {medals.map((medal) => <article className={medal.unlocked ? styles.medalUnlocked : styles.medalLocked} key={medal.id}><div className={styles.medalMark}><span>{medal.code}</span></div><strong>{medal.name}</strong><small>{medal.unlocked ? "AWARDED" : "LOCKED"}</small></article>)}
        </div>
      </div>
      <div>
        <span className={styles.sectionKicker}>OPERATIONAL RECORD</span>
        <h2>ACHIEVEMENTS</h2>
        <div className={styles.achievementList}>
          {achievements.map((achievement) => <AchievementRow key={achievement.id} achievement={achievement} />)}
        </div>
      </div>
    </section>
  );
}

function AchievementRow({ achievement }: { achievement: Achievement }) {
  return (
    <article className={styles[`achievement_${achievement.state}`]}>
      <span className={styles.achievementIcon} aria-hidden="true">{achievement.state === "hidden" ? "?" : achievement.name.slice(0, 1)}</span>
      <div><strong>{achievement.state === "hidden" ? "CLASSIFIED" : achievement.name}</strong><p>{achievement.description}</p>{achievement.state === "progress" && <div className={styles.achievementProgress}><span style={{ width: `${achievement.progress ?? 0}%` }} /></div>}</div>
      <small>{achievement.state.toUpperCase()}</small>
    </article>
  );
}

