"use client";
/* eslint-disable @next/next/no-img-element -- Sites serves bundled artwork directly. */

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { safeExternalUrl, siteConfig } from "@/lib/site-config";
import type { NftMetadata, SquadronStats } from "@/lib/types";
import { CommandCenter } from "./CommandCenter";
import { RecruitCard } from "./RecruitCard";
import { Reveal } from "./Reveal";

const navItems = [
  ["Mission", "#mission"],
  ["Recruits", "#recruits"],
  ["Command Center", "#command-center"],
  ["Roadmap", "#roadmap"],
  ["FAQ", "#faq"],
] as const;

function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
      <div className="header-inner">
        <a href="#top" className="brand" aria-label="Groypers Alpha Squadron home">
          <img src="/logo.png" alt="GAS logo" width="72" height="72" fetchPriority="high" />
          <span><strong>GROYPERS</strong><b>ALPHA SQUADRON</b></span>
        </a>
        <nav className="desktop-nav" aria-label="Main navigation">
          {navItems.map(([label, href]) => <a key={href} href={href}>{label}</a>)}
        </nav>
        <div className="header-actions">
          <a href={safeExternalUrl(siteConfig.twitterUrl)} target="_blank" rel="noopener noreferrer" className="social-link" aria-label="X / Twitter">𝕏</a>
          {siteConfig.discordUrl && <a href={safeExternalUrl(siteConfig.discordUrl)} target="_blank" rel="noopener noreferrer" className="social-link" aria-label="Discord">D</a>}
          <a href={safeExternalUrl(siteConfig.launchMyNftUrl)} target="_blank" rel="noopener noreferrer" className="button button-gold header-mint">MINT ON LAUNCHMYNFT</a>
          <button className="menu-toggle" type="button" onClick={() => setOpen(true)} aria-label="Open navigation" aria-expanded={open}><span /><span /><span /></button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div className="mobile-menu" initial={{ y: "-100%" }} animate={{ y: 0 }} exit={{ y: "-100%" }} transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}>
            <div className="mobile-menu-top"><span>FIELD NAVIGATION / GAS</span><button type="button" onClick={() => setOpen(false)} aria-label="Close navigation">×</button></div>
            <nav aria-label="Mobile navigation">
              {navItems.map(([label, href], index) => <motion.a key={href} href={href} onClick={() => setOpen(false)} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.04 }}><small>0{index + 1}</small>{label}</motion.a>)}
            </nav>
            <a href={safeExternalUrl(siteConfig.launchMyNftUrl)} target="_blank" rel="noopener noreferrer" className="button button-gold button-full">MINT ON LAUNCHMYNFT</a>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function ContractAddress({ dark = false }: { dark?: boolean }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(siteConfig.contractAddress);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }
  return (
    <div className={`contract-address ${dark ? "contract-dark" : ""}`}>
      <div className="contract-label"><small>OFFICIAL SOLANA CA</small><strong>{siteConfig.token}</strong></div>
      <code title={siteConfig.contractAddress}>{siteConfig.contractAddress}</code>
      <motion.button type="button" onClick={copy} whileTap={{ scale: 0.96 }} aria-label="Copy contract address"><span aria-hidden="true">{copied ? "✓" : "▣"}</span>{copied ? "COPIED" : "COPY CA"}</motion.button>
    </div>
  );
}

function Hero() {
  const reduce = useReducedMotion();
  return (
    <section className="hero" id="top">
      <motion.span className="map-mark map-a" animate={reduce ? {} : { rotate: [0, 7, 0], y: [0, -8, 0] }} transition={{ duration: 8, repeat: Infinity }}>×</motion.span>
      <motion.span className="map-mark map-b" animate={reduce ? {} : { rotate: [0, -8, 0], x: [0, 8, 0] }} transition={{ duration: 9, repeat: Infinity }}>＋</motion.span>
      <div className="hero-inner">
        <motion.div className="hero-copy" initial={reduce ? false : { opacity: 0, x: -32 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.65 }}>
          <div className="eyebrow"><span className="wing-mark">≡</span>{siteConfig.supply} HAND-DRAWN RECRUITS</div>
          <h1>GROYPERS<br />ALPHA SQUADRON</h1>
          <p className="hero-tagline">THE SIGNAL. THE SQUADRON.<br />THE AMPLIFIER.</p>
          <div className="mission-callout"><span>★</span><p>SPREAD THE MEME.<br />STRENGTHEN THE BRAND.<br />MAKE {siteConfig.token} RECOGNIZABLE.</p></div>
          <div className="hero-buttons">
            <a href="#recruits" className="button button-olive">VIEW RECRUITS</a>
            <a href={safeExternalUrl(siteConfig.launchMyNftUrl)} target="_blank" rel="noopener noreferrer" className="button button-gold">MINT ON LAUNCHMYNFT</a>
            <a href={safeExternalUrl(siteConfig.tokenUrl)} target="_blank" rel="noopener noreferrer" className="button button-paper">GET {siteConfig.token}</a>
          </div>
          <ContractAddress />
        </motion.div>
        <motion.div className="hero-art" initial={reduce ? false : { opacity: 0, scale: 0.88, rotate: 2 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ duration: 0.75, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}>
          <div className="aircraft aircraft-one">✈</div><div className="aircraft aircraft-two">✈</div>
          <div className="logo-halo" />
          <img src="/logo.png" alt="Groypers Alpha Squadron military badge" width="760" height="760" fetchPriority="high" />
          <span className="classified-stamp">CLASSIFIED<br />ALPHA UNIT</span>
        </motion.div>
      </div>
    </section>
  );
}

function StatsBar() {
  const [liveStats, setLiveStats] = useState<SquadronStats | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/squadron-stats", { signal: controller.signal })
      .then((response) => response.ok ? response.json() as Promise<SquadronStats> : Promise.reject())
      .then(setLiveStats)
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const stats = [
    ["◉", siteConfig.supply, "UNIQUE RECRUITS"],
    ["♟", liveStats?.deployed ?? "—", "DEPLOYED"],
    ["≋", liveStats?.commanders ?? "—", "VERIFIED COMMANDERS"],
    ["▰", liveStats?.largestArmy ?? "—", "LARGEST KNOWN ARMY"],
    ["★", "ONE TOKEN", "ONE SQUADRON"],
  ];
  return <Reveal><section className="stats-bar" aria-label="Squadron statistics" aria-busy={!liveStats}>{stats.map(([icon, value, label]) => <div className="stat" key={label}><span>{icon}</span><p><strong>{value}</strong><small>{label}</small></p></div>)}</section></Reveal>;
}

const phases = [
  { icon: "⚑", title: "ESTABLISH THE UNIT", detail: "Create the GAS identity · Produce 777 recruits · Prepare metadata and website" },
  { icon: "✈", title: "DEPLOY THE SQUADRON", detail: "Launch through LaunchMyNFT · Showcase selected recruits · Promote original artwork" },
  { icon: "♟", title: "COMPLETE THE FIRST OPERATION", detail: "Complete deployment · Continue meme and community operations" },
  { icon: "▣", title: "THE 4,444 EXPANSION", detail: "A new expanded collection begins once all 777 artworks are sold." },
];

function AboutCollection() {
  return (
    <section className="dossier-panel about-panel" id="mission" aria-labelledby="about-title">
      <div className="panel-heading"><span>★</span><h2 id="about-title">About the Collection</h2><span>≡</span></div>
      <p>Groypers Alpha Squadron is a collection of 777 unique hand-drawn NFT recruits.</p>
      <p>Each recruit is part of the {siteConfig.token} universe, created to support the visibility, recognition and visual identity of the token.</p>
      <p>The squadron does not replace the token. <strong>It gives the token an army.</strong></p>
      <div className="field-folder" aria-hidden="true">
        <span className="folder-tab">GAS / FIELD FILE</span>
        <div className="folder-paper"><img src="/logo.png" width="140" height="140" alt="" /><b>IDENTITY<br />OPERATION</b><small>777 PERSONNEL</small></div>
      </div>
    </section>
  );
}

function Roadmap() {
  return (
    <section className="dossier-panel roadmap-panel" id="roadmap" aria-labelledby="roadmap-title">
      <div className="panel-heading"><span>≡</span><h2 id="roadmap-title">Operational Roadmap</h2><span>≡</span></div>
      <div className="timeline">
        {phases.map((phase, index) => {
          const config = siteConfig.roadmap[index];
          return (
            <motion.article key={phase.title} className={`phase phase-${config.state}`} initial={{ opacity: 0, x: 16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }}>
              <div className="phase-icon">{phase.icon}</div>
              <div className="phase-copy"><small>PHASE {config.phase}</small><h3>{phase.title}</h3><p>{phase.detail}</p></div>
              <span className="phase-status">{config.status}</span>
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}

function RecruitCarousel({ recruits }: { recruits: NftMetadata[] }) {
  const stripRef = useRef<HTMLDivElement>(null);
  const [selectedRecruit, setSelectedRecruit] = useState<NftMetadata | null>(null);

  useEffect(() => {
    if (!selectedRecruit) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedRecruit(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [selectedRecruit]);

  function move(direction: number) {
    stripRef.current?.scrollBy({ left: direction * Math.min(stripRef.current.clientWidth * 0.82, 920), behavior: "smooth" });
  }
  return (
    <>
      <Reveal>
        <section className="recruits-section" id="recruits" aria-labelledby="recruits-title">
          <div className="section-heading"><h2 id="recruits-title">Selected Recruits</h2><span className="heading-rule" /></div>
          <div className="recruit-carousel-shell">
            <button className="carousel-arrow carousel-arrow-left" type="button" onClick={() => move(-1)} aria-label="Previous recruits">‹</button>
            <motion.div ref={stripRef} className="recruit-strip" initial="hidden" whileInView="show" viewport={{ once: true }} variants={{ hidden: {}, show: { transition: { staggerChildren: 0.035 } } }}>
              {recruits.map((recruit) => <motion.div key={recruit.name} variants={{ hidden: { opacity: 0, y: 22 }, show: { opacity: 1, y: 0 } }}><RecruitCard recruit={recruit} onSelect={() => setSelectedRecruit(recruit)} /></motion.div>)}
            </motion.div>
            <button className="carousel-arrow carousel-arrow-right" type="button" onClick={() => move(1)} aria-label="Next recruits">›</button>
          </div>
        </section>
      </Reveal>

      <AnimatePresence>
        {selectedRecruit && (
          <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={() => setSelectedRecruit(null)}>
            <motion.section className="recruit-modal" initial={{ opacity: 0, scale: 0.94, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 16 }} onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="recruit-modal-title">
              <button className="modal-close" type="button" onClick={() => setSelectedRecruit(null)} aria-label="Close recruit traits">&times;</button>
              <div className="modal-image"><img src={selectedRecruit.image} alt={selectedRecruit.name} /></div>
              <div className="modal-copy">
                <h2 id="recruit-modal-title">{selectedRecruit.name}</h2>
                <div className="attribute-list">
                  {selectedRecruit.attributes.map((attribute, index) => (
                    <div key={`${attribute.trait_type}-${index}`}><span>{attribute.trait_type}</span><strong>{attribute.trait_type === "Rarity Rank" ? `#${attribute.value}` : attribute.value}</strong></div>
                  ))}
                </div>
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function FinalCTA() {
  return (
    <section className="final-cta">
      <div className="cta-copy"><span>★</span><p><strong>777 UNIQUE RECRUITS. ONE SQUADRON.</strong><br />GIVE {siteConfig.token} AN ARMY.</p></div>
      <div className="cta-actions"><a href="#recruits" className="button button-paper">VIEW SELECTED RECRUITS</a><a href={safeExternalUrl(siteConfig.launchMyNftUrl)} className="button button-gold" target="_blank" rel="noopener noreferrer">MINT ON LAUNCHMYNFT</a><a href={safeExternalUrl(siteConfig.tokenUrl)} className="button button-outline-light" target="_blank" rel="noopener noreferrer">GET {siteConfig.token}</a></div>
    </section>
  );
}

function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer" id="faq">
      <div className="footer-grid">
        <div className="footer-brand"><img src="/logo.png" width="74" height="74" alt="GAS logo" /><div><strong>GROYPERS<br /><span>ALPHA SQUADRON</span></strong><p>The token is the signal.<br />The squadron is the amplifier.</p></div></div>
        <div><h3>NAVIGATION</h3>{navItems.map(([label, href]) => <a key={href} href={href}>{label}</a>)}</div>
        <div><h3>RESOURCES</h3><a href={safeExternalUrl(siteConfig.launchMyNftUrl)} target="_blank" rel="noopener noreferrer">LaunchMyNFT</a><a href={safeExternalUrl(siteConfig.tokenWebsiteUrl)} target="_blank" rel="noopener noreferrer">{siteConfig.token} Website</a><a href={safeExternalUrl(siteConfig.tokenUrl)} target="_blank" rel="noopener noreferrer">Get {siteConfig.token}</a><a href={safeExternalUrl(siteConfig.knowYourMemeUrl)} target="_blank" rel="noopener noreferrer">Know Your Meme</a></div>
        <div><h3>CONNECT</h3><a href={safeExternalUrl(siteConfig.twitterUrl)} target="_blank" rel="noopener noreferrer">𝕏 / Groyper</a><a href={safeExternalUrl(siteConfig.creatorTwitterUrl)} target="_blank" rel="noopener noreferrer">𝕏 / Founder</a>{siteConfig.discordUrl && <a href={safeExternalUrl(siteConfig.discordUrl)}>Discord</a>}</div>
        <ContractAddress dark />
      </div>
      <div className="footer-bottom">© {year} {siteConfig.name} <span>·</span> {siteConfig.network} collection <span>·</span> One token. One squadron.</div>
    </footer>
  );
}

export function LandingPage({ recruits }: { recruits: NftMetadata[] }) {
  return (
    <main className="site-shell">
      <Header />
      <Hero />
      <div className="content-wrap">
        <StatsBar />
        <div className="information-grid">
          <Reveal><AboutCollection /></Reveal>
          <Reveal delay={0.08}><Roadmap /></Reveal>
          <Reveal delay={0.16}><CommandCenter /></Reveal>
        </div>
        <RecruitCarousel recruits={recruits} />
      </div>
      <FinalCTA />
      <Footer />
    </main>
  );
}
