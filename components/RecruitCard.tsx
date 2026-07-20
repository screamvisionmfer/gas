"use client";
/* eslint-disable @next/next/no-img-element -- Sites serves bundled artwork directly. */

import { motion, useReducedMotion } from "framer-motion";
import type { NftMetadata } from "@/lib/types";

function traitValue(recruit: NftMetadata, traitType: string) {
  const value = recruit.attributes.find((item) => item.trait_type === traitType)?.value;
  return value === undefined ? "" : String(value);
}

export function RecruitCard({ recruit, onSelect }: { recruit: NftMetadata; onSelect: () => void }) {
  const reduce = useReducedMotion();
  const rank = traitValue(recruit, "Ranks");
  const rarityRank = traitValue(recruit, "Rarity Rank");
  return (
    <motion.button
      type="button"
      className="recruit-card"
      onClick={onSelect}
      aria-label={`View traits for ${recruit.name}`}
      whileHover={reduce ? {} : { y: -8, rotate: -0.8 }}
      transition={{ type: "spring", stiffness: 280, damping: 20 }}
    >
      <span className="recruit-image-wrap">
        <img src={recruit.image} alt={recruit.name} loading="lazy" className="recruit-image" />
      </span>
      <span className="recruit-card-copy">
        <strong>{recruit.name}</strong>
        <span className="recruit-trait-row">
          {rank && <small>{rank}</small>}
          {rarityRank && <small>RARITY #{rarityRank}</small>}
        </span>
      </span>
    </motion.button>
  );
}
