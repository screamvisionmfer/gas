"use client";
/* eslint-disable @next/next/no-img-element -- runtime X/NFT URLs require a direct fallback handler. */

import type { ImgHTMLAttributes } from "react";
import { useState } from "react";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & { src?: string; fallback?: string };

export function SafeImage({ src, fallback = "/logo.png", alt = "", ...props }: Props) {
  const [resolved, setResolved] = useState(src || fallback);
  return <img {...props} src={resolved} alt={alt} onError={() => { if (resolved !== fallback) setResolved(fallback); }} />;
}

