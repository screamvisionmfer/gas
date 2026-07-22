/* eslint-disable @next/next/no-img-element -- external X and verified NFT snapshot images have runtime fallbacks. */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Header, Footer } from "@/components/LandingPage";
import { PublicArmy } from "@/components/commander-profile/PublicArmy";
import { SafeImage } from "@/components/commander-profile/SafeImage";
import { CommanderProfileStoreError } from "@/lib/commander-profile-store";
import { cachedCommanderAlias, cachedPublicCommanderProfile } from "@/lib/public-commander-profile";
import { siteConfig } from "@/lib/site-config";
import styles from "./CommanderProfile.module.css";

type Props = { params: Promise<{ username: string }> };

function normalize(value: string) {
  return decodeURIComponent(value).replace(/^@/, "").trim().toLowerCase();
}

function short(value: string) {
  return value.length > 16 ? `${value.slice(0, 6)}…${value.slice(-6)}` : value;
}

function date(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric" }).format(new Date(value)).toUpperCase();
}

async function profileFor(username: string) {
  const normalized = normalize(username);
  const profile = await cachedPublicCommanderProfile(normalized);
  if (profile) return profile;
  const alias = await cachedCommanderAlias(normalized);
  if (alias && alias !== normalized) redirect(`/commander/${encodeURIComponent(alias)}`);
  return null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { username } = await params;
    const profile = await profileFor(username);
    if (!profile) return { title: "Commander File Not Found | Groypers Alpha Squadron", robots: { index: false, follow: false } };
    const title = `${profile.displayName} — ${profile.rank.name} | Groypers Alpha Squadron`;
    const description = `View @${profile.username}'s Groypers Alpha Squadron command dossier, army rank and featured soldier.`;
    const canonical = `${siteConfig.canonicalUrl}/commander/${encodeURIComponent(profile.usernameNormalized)}`;
    return {
      title,
      description,
      alternates: { canonical },
      openGraph: { title, description, url: canonical, type: "profile", images: [{ url: `${canonical}/opengraph-image`, width: 1200, height: 630, alt: `${profile.displayName} Commander dossier` }] },
      twitter: { card: "summary_large_image", title, description, images: [`${canonical}/opengraph-image`] },
    };
  } catch {
    return { title: "Commander Dossier | Groypers Alpha Squadron", robots: { index: false, follow: false } };
  }
}

function Unavailable() {
  return <main className={styles.publicPage}><Header /><section className={styles.fileState}><img src="/logo.png" alt="" /><span>GAS ARCHIVE NETWORK</span><h1>COMMANDER FILE UNAVAILABLE</h1><p>The personnel archive is temporarily offline. Try again shortly.</p></section><Footer /></main>;
}

export default async function CommanderProfilePage({ params }: Props) {
  let profile;
  try {
    const { username } = await params;
    profile = await profileFor(username);
  } catch (error) {
    if (error instanceof CommanderProfileStoreError) return <Unavailable />;
    throw error;
  }
  if (!profile) notFound();

  const featured = profile.featuredSoldier ?? profile.army[0];
  const profileUrl = `${siteConfig.canonicalUrl}/commander/${encodeURIComponent(profile.usernameNormalized)}`;
  const shareText = `I command ${profile.armySize} soldiers in the Groypers Alpha Squadron.\n\nCurrent rank: ${profile.rank.name}.\n\nView my commander dossier:`;
  const xShare = `https://x.com/intent/post?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(profileUrl)}`;

  return (
    <main className={styles.publicPage}>
      <Header />
      <div className={styles.dossierShell}>
        <div className={styles.fileTab}>GAS PERSONNEL ARCHIVE · FILE {profile.id.slice(0, 8).toUpperCase()}</div>
        <section className={styles.heroDossier}>
          <div className={styles.identityDossier}>
            <div className={styles.classification}><span>GROYPERS ALPHA SQUADRON</span><b>ACTIVE COMMANDER</b></div>
            <div className={styles.commanderIdentity}>
              <SafeImage src={profile.avatarUrl} alt="" />
              <div><small>COMMANDER DOSSIER</small><h1>{profile.displayName}</h1><a href={`https://x.com/${profile.username}`} target="_blank" rel="noreferrer">@{profile.username} <b>GAS VERIFIED</b></a></div>
            </div>
            <div className={styles.rankFile}>
              <SafeImage src={profile.rank.insignia} alt={`${profile.rank.name} insignia`} />
              <div><span>CURRENT CLASSIFICATION</span><h2>{profile.rank.name}</h2><p>{profile.rank.unit ?? "UNASSIGNED UNIT"}</p></div>
            </div>
            <dl className={styles.identityFacts}>
              <div><dt>MEMBER SINCE</dt><dd>{date(profile.memberSince)}</dd></div>
              <div><dt>PRIMARY WALLET</dt><dd title={profile.primaryWallet}>{short(profile.primaryWallet)}</dd></div>
              <div><dt>FILE PUBLISHED</dt><dd>{date(profile.publishedAt)}</dd></div>
            </dl>
            <div className={styles.shareActions}>
              <a href={xShare} target="_blank" rel="noreferrer">SHARE TO X</a>
              <Link href="/leaderboard">VIEW LEADERBOARD</Link>
              <a href={siteConfig.twitterUrl} target="_blank" rel="noreferrer">JOIN THE SQUADRON</a>
            </div>
          </div>

          <aside className={styles.featuredFile}>
            <span>FEATURED SOLDIER</span>
            {featured ? <><SafeImage src={featured.image} alt={featured.name} /><div><small>{featured.rarity ?? "UNRANKED"}</small><h2>{featured.name}</h2><p>{featured.rank ?? "GAS RECRUIT"}</p><dl>{(featured.traits ?? []).slice(0, 4).map((trait) => <div key={trait.traitType}><dt>{trait.traitType}</dt><dd>{trait.value}</dd></div>)}</dl><em title={featured.mint}>MINT · {short(featured.mint)}</em></div></> : <div className={styles.featuredFallback}><img src="/logo.png" alt="" /><strong>NO FEATURED SOLDIER</strong></div>}
          </aside>
        </section>

        <section className={styles.summaryStrip} aria-label="Commander Army summary">
          <div><span>ARMY SIZE</span><strong>{profile.armySize}</strong><small>VERIFIED GAS NFT</small></div>
          <div><span>RANK</span><strong>{profile.rank.name}</strong><small>{profile.rank.unit ?? "UNASSIGNED"}</small></div>
          <div><span>NEXT PROMOTION</span><strong>{profile.nextRank?.name ?? "MAXIMUM RANK"}</strong><small>{profile.nextRank ? `${profile.nextRank.soldiersNeeded} SOLDIERS REQUIRED` : "TOP CLASSIFICATION"}</small>{profile.nextRank && <i><b style={{ width: `${profile.nextRank.progress}%` }} /></i>}</div>
        </section>

        <section className={styles.armySection}>
          <header><div><span>VERIFIED PERSONNEL MANIFEST</span><h2>COMMANDER&apos;S ARMY</h2></div><b>LAST SYNC · {date(profile.armyLastSyncedAt)}</b></header>
          <PublicArmy soldiers={profile.army} />
        </section>

        <section className={styles.serviceRecord}>
          <div><span>GAS SERVICE RECORD</span><h2>PERSONNEL FILE</h2></div>
          <dl><div><dt>STATUS</dt><dd>ACTIVE COMMANDER</dd></div><div><dt>CURRENT RANK</dt><dd>{profile.rank.name}</dd></div><div><dt>ARMY STRENGTH</dt><dd>{profile.armySize}</dd></div><div><dt>LAST VERIFIED</dt><dd>{date(profile.armyLastSyncedAt)}</dd></div></dl>
          <p>PUBLIC SNAPSHOT · ON-CHAIN ARMY VERIFIED THROUGH THE GAS PERSONNEL NETWORK</p>
        </section>
      </div>
      <Footer />
    </main>
  );
}
