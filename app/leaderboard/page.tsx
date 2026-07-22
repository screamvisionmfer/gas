/* eslint-disable @next/next/no-img-element -- GAS artwork is served as bundled static imagery. */

import type { Metadata } from "next";
import Link from "next/link";
import { Footer, Header } from "@/components/LandingPage";
import { SafeImage } from "@/components/commander-profile/SafeImage";
import { AwardBadge } from "@/components/commander-profile/AwardBadge";
import type { CommanderLeaderboardEntry, CommanderLeaderboardSort } from "@/lib/commander-profile-types";
import { CommanderProfileStoreError } from "@/lib/commander-profile-store";
import { getCachedCommanderLeaderboard } from "@/lib/public-commander-leaderboard";
import { siteConfig } from "@/lib/site-config";
import styles from "./leaderboard.module.css";
import awardStyles from "./leaderboard-awards.module.css";
import auditStyles from "./leaderboard-audit.module.css";

type Props = { searchParams: Promise<{ sort?: string; page?: string }> };

export const metadata: Metadata = {
  title: "Commander Leaderboard | Groypers Alpha Squadron",
  description: "The public Groypers Alpha Squadron command registry, ranked by verified GAS army strength.",
  alternates: { canonical: `${siteConfig.canonicalUrl}/leaderboard` },
  openGraph: {
    title: "Commander Leaderboard | Groypers Alpha Squadron",
    description: "Inspect the strongest verified commanders in the GAS public registry.",
    url: `${siteConfig.canonicalUrl}/leaderboard`,
    type: "website",
    images: [{ url: "/social-preview.png", width: 1200, height: 630, alt: "Groypers Alpha Squadron" }],
  },
  twitter: { card: "summary_large_image", title: "GAS Commander Leaderboard", description: "The public GAS command registry.", images: ["/social-preview.png"] },
};

function parseSort(value?: string): CommanderLeaderboardSort {
  return value === "rank" || value === "newest" ? value : "army";
}

function parsePage(value?: string) {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function href(sort: CommanderLeaderboardSort, page = 1) {
  const query = new URLSearchParams({ sort });
  if (page > 1) query.set("page", String(page));
  return `/leaderboard?${query}`;
}

function freshness(value: string) {
  const hours = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 3_600_000));
  if (hours < 1) return "SYNCED <1H AGO";
  if (hours < 24) return `SYNCED ${hours}H AGO`;
  return `SYNCED ${Math.floor(hours / 24)}D AGO`;
}

function commanderUrl(entry: CommanderLeaderboardEntry) {
  return `/commander/${encodeURIComponent(entry.usernameNormalized)}`;
}

function PodiumCard({ entry }: { entry: CommanderLeaderboardEntry }) {
  const soldier = entry.featuredSoldier;
  return (
    <Link className={`${styles.podiumCard} ${styles[`place${entry.position}`] ?? ""}`} href={commanderUrl(entry)}>
      <span className={styles.place}>#{entry.position}</span>
      <div className={styles.podiumPortrait}>
        <SafeImage src={soldier?.image ?? entry.avatarUrl} alt={soldier ? `${soldier.name}, featured GAS soldier` : `${entry.displayName} avatar`} />
        <i aria-hidden="true" />
      </div>
      <span className={styles.clearance}>PUBLIC COMMAND FILE</span>
      <h2>{entry.displayName}</h2>
      <p>@{entry.username}</p>
      {entry.awards.length > 0 && <div className={awardStyles.podiumAwards}>{entry.awards.map((award) => <AwardBadge key={award.id} award={award} className={awardStyles.miniAward} />)}</div>}
      <div className={styles.podiumStats}><strong>{entry.armySize}<small>SOLDIERS</small></strong><span>{entry.rank.name}<small>{entry.rank.unit ?? "GAS COMMAND"}</small></span></div>
      <em>VIEW DOSSIER →</em>
    </Link>
  );
}

function RosterRow({ entry }: { entry: CommanderLeaderboardEntry }) {
  return (
    <Link className={styles.rosterRow} href={commanderUrl(entry)}>
      <strong className={styles.rowPosition}>#{entry.position}</strong>
      <SafeImage className={styles.avatar} src={entry.avatarUrl} alt="" />
      <span className={styles.identity}><b>{entry.displayName}</b><small>@{entry.username}</small>{entry.awards.length > 0 && <span className={awardStyles.rowAwards}>{entry.awards.map((award) => <AwardBadge key={award.id} award={award} className={awardStyles.miniAward} />)}</span>}</span>
      <span className={styles.rank}><SafeImage src={entry.rank.insignia} alt="" /><b>{entry.rank.name}</b><small>{entry.rank.unit ?? "GAS COMMAND"}</small></span>
      <span className={styles.strength}><b>{entry.armySize}</b><small>ACTIVE RECRUITS</small></span>
      <span className={styles.sync}>{freshness(entry.armyLastSyncedAt)}</span>
      <span className={styles.status}><i />ACTIVE</span>
      <span className={styles.rowArrow} aria-hidden="true">→</span>
    </Link>
  );
}

function Unavailable() {
  return <main className={`${styles.page} ${auditStyles.audit}`}><Header /><section className={styles.state}><img src="/logo.png" alt="" /><span>GAS COMMAND NETWORK</span><h1>REGISTRY OFFLINE</h1><p>The public command registry is temporarily unavailable. Try again shortly.</p></section><Footer /></main>;
}

export default async function LeaderboardPage({ searchParams }: Props) {
  const query = await searchParams;
  const sort = parseSort(query.sort);
  const requestedPage = parsePage(query.page);
  let data;
  try {
    data = await getCachedCommanderLeaderboard(sort, requestedPage);
  } catch (error) {
    if (error instanceof CommanderProfileStoreError) return <Unavailable />;
    throw error;
  }
  const podium = data.page === 1 ? data.entries.slice(0, 3) : [];
  const roster = data.page === 1 ? data.entries.slice(3) : data.entries;
  const firstShown = data.totalProfiles === 0 ? 0 : (data.page - 1) * data.pageSize + 1;
  const lastShown = Math.min(data.page * data.pageSize, data.totalProfiles);

  return (
    <main className={`${styles.page} ${auditStyles.audit}`}>
      <Header />
      <section className={styles.hero}>
        <div className={styles.heroSeal}><img src="/logo.png" alt="" /></div>
        <span>GAS PUBLIC COMMAND REGISTRY / LIVE CLASSIFICATION</span>
        <h1>COMMANDER<br />LEADERBOARD</h1>
        <p>VERIFIED COMMANDERS. ON-CHAIN ARMIES.<br />ONE SQUADRON.</p>
        <div className={styles.registryStats}><strong>{data.totalProfiles}<small>PUBLIC COMMANDERS</small></strong><i /><strong>777<small>MAXIMUM RECRUITS</small></strong></div>
      </section>

      <section className={styles.registry}>
        <header className={styles.registryHeader}>
          <div><span>CLASSIFICATION ORDER</span><h2>SQUADRON RANKINGS</h2></div>
          <nav aria-label="Leaderboard sorting">
            {(["army", "rank", "newest"] as const).map((item) => <Link key={item} href={href(item)} aria-current={sort === item ? "page" : undefined}>{item === "army" ? "ARMY SIZE" : item === "rank" ? "RANK" : "NEWEST"}</Link>)}
          </nav>
        </header>

        {data.totalProfiles === 0 ? (
          <div className={styles.empty}><img src="/logo.png" alt="" /><span>NO PUBLIC FILES DETECTED</span><h2>THE REGISTRY AWAITS ITS FIRST COMMANDER</h2><p>Publish your verified Commander dossier from HQ to enter the rankings.</p><Link href="/commander-hq">ENTER COMMANDER HQ</Link></div>
        ) : <>
          {podium.length > 0 && <div className={styles.podium}>{podium.map((entry) => <PodiumCard key={entry.usernameNormalized} entry={entry} />)}</div>}
          {roster.length > 0 && <div className={styles.roster}>
            <div className={styles.rosterLabels}><span>POSITION / COMMANDER</span><span>CLASSIFICATION</span><span>ARMY STRENGTH</span><span>STATUS</span></div>
            {roster.map((entry) => <RosterRow key={entry.usernameNormalized} entry={entry} />)}
          </div>}
          <footer className={styles.pagination}>
            <span>SHOWING {firstShown}–{lastShown} OF {data.totalProfiles} COMMANDERS</span>
            <nav aria-label="Leaderboard pages">
              {data.page > 1 ? <Link href={href(sort, data.page - 1)}>← PREVIOUS</Link> : <span aria-disabled="true">← PREVIOUS</span>}
              <b>PAGE {data.page} / {data.totalPages}</b>
              {data.page < data.totalPages ? <Link href={href(sort, data.page + 1)}>NEXT →</Link> : <span aria-disabled="true">NEXT →</span>}
            </nav>
          </footer>
        </>}
      </section>
      <section className={styles.cta}><div><span>YOUR FILE IS MISSING?</span><h2>TAKE YOUR PLACE IN THE RANKS.</h2></div><Link href="/commander-hq">ENTER COMMANDER HQ →</Link></section>
      <Footer />
    </main>
  );
}
