"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { recruitNumber } from "@/lib/nft-metadata";
import type { NftMetadata } from "@/lib/types";

export function RecruitCard({ recruit, onOpen }: { recruit: NftMetadata; onOpen?: (recruit: NftMetadata) => void }) {
  const reduce = useReducedMotion();
  const classification = recruit.attributes.find((item) => item.trait_type === "Classification")?.value ?? "Recruit";
  return (
    <motion.button
      type="button"
      className="recruit-card"
      onClick={() => onOpen?.(recruit)}
      whileHover={reduce ? {} : { y: -8, rotate: -0.8 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 280, damping: 20 }}
      aria-label={`Open ${recruit.name}`}
    >
      <span className="recruit-image-wrap">
        <Image src={recruit.image} alt={recruit.name} fill sizes="(max-width: 640px) 74vw, 230px" className="recruit-image" />
        <span className="serial-stamp">GAS-{recruitNumber(recruit.name)}</span>
      </span>
      <span className="recruit-card-copy">
        <span className="recruit-number">#{recruitNumber(recruit.name)}</span>
        <strong>{recruit.codename}</strong>
        <small>{classification} classification</small>
      </span>
    </motion.button>
  );
}

