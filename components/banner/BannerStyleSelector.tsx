"use client";

import { bannerStyles, type BannerStyle } from "@/lib/banner-config";

export function BannerStyleSelector({ value, onChange }: { value: BannerStyle; onChange: (style: BannerStyle) => void }) {
  return (
    <fieldset className="banner-style-selector">
      <legend>BANNER STYLE</legend>
      <div>
        {(Object.keys(bannerStyles) as BannerStyle[]).map((style) => (
          <button key={style} type="button" className={value === style ? "is-active" : ""} aria-pressed={value === style} onClick={() => onChange(style)}>
            <strong>{bannerStyles[style].label}</strong>
            <small>{bannerStyles[style].description}</small>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
