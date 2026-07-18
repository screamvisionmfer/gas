"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import type { NftMetadata } from "@/lib/types";
import { RecruitCard } from "./RecruitCard";

export function RecruitExplorer({ recruits }: { recruits: NftMetadata[] }) {
  const [query, setQuery] = useState("");
  const [classification, setClassification] = useState("All classifications");
  const [visible, setVisible] = useState(8);
  const [selected, setSelected] = useState<NftMetadata | null>(null);

  const classifications = useMemo(() => ["All classifications", ...new Set(recruits.map((recruit) => recruit.attributes.find((item) => item.trait_type === "Classification")?.value ?? "Other"))], [recruits]);
  const filtered = useMemo(() => recruits.filter((recruit) => {
    const matchesQuery = `${recruit.name} ${recruit.codename}`.toLowerCase().includes(query.toLowerCase());
    const recruitClass = recruit.attributes.find((item) => item.trait_type === "Classification")?.value;
    return matchesQuery && (classification === "All classifications" || recruitClass === classification);
  }), [classification, query, recruits]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) { if (event.key === "Escape") setSelected(null); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <main className="database-page">
      <header className="database-header">
        <Link href="/" className="brand"><Image src="/logo.png" alt="GAS logo" width={68} height={68} /><span><strong>GROYPERS</strong><b>RECRUIT DATABASE</b></span></Link>
        <Link href="/" className="button button-paper">← RETURN TO COMMAND</Link>
      </header>
      <section className="database-hero">
        <span className="eyebrow">FIELD ARCHIVE / 777 PERSONNEL</span>
        <h1>RECRUIT DATABASE</h1>
        <p>Search the active roster by designation, number, or primary classification.</p>
      </section>
      <section className="database-content" aria-label="Recruit database">
        <div className="database-toolbar">
          <label><span>SEARCH RECORDS</span><input value={query} onChange={(event) => { setQuery(event.target.value); setVisible(8); }} placeholder="Name or recruit number…" /></label>
          <label><span>CLASSIFICATION</span><select value={classification} onChange={(event) => { setClassification(event.target.value); setVisible(8); }}>{classifications.map((value) => <option key={value}>{value}</option>)}</select></label>
          <div className="record-count"><strong>{filtered.length}</strong><span>RECORDS FOUND</span></div>
        </div>
        {filtered.length ? (
          <motion.div className="recruit-grid" layout>
            {filtered.slice(0, visible).map((recruit) => <RecruitCard key={recruit.name} recruit={recruit} onOpen={setSelected} />)}
          </motion.div>
        ) : <div className="empty-records">NO PERSONNEL MATCH THIS SEARCH</div>}
        {visible < filtered.length && <button className="button button-olive load-more" type="button" onClick={() => setVisible((count) => count + 8)}>LOAD MORE RECRUITS</button>}
      </section>
      <AnimatePresence>
        {selected && (
          <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={() => setSelected(null)} role="presentation">
            <motion.section className="recruit-modal" initial={{ opacity: 0, y: 30, rotate: -1 }} animate={{ opacity: 1, y: 0, rotate: 0 }} exit={{ opacity: 0, y: 20 }} onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="modal-title">
              <button className="modal-close" type="button" onClick={() => setSelected(null)} aria-label="Close recruit record">×</button>
              <div className="modal-image"><Image src={selected.image} alt={selected.name} fill sizes="(max-width: 640px) 90vw, 420px" /></div>
              <div className="modal-copy"><small>OFFICIAL PERSONNEL RECORD</small><h2 id="modal-title">{selected.codename}</h2><p>{selected.name}</p><div className="attribute-list">{selected.attributes.map((attribute) => <div key={attribute.trait_type}><span>{attribute.trait_type}</span><strong>{attribute.value}</strong></div>)}</div><p className="record-description">{selected.description}</p></div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
