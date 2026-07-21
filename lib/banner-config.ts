export type BannerStyle = "clean" | "tactical";

export const bannerStyles = {
  clean: {
    label: "CLEAN DOSSIER",
    description: "High-contrast command dossier",
    background: "#0b1008",
    panel: "#111a0c",
    grid: "rgba(158, 185, 58, 0.15)",
    gold: "#e6bb36",
    green: "#a7c83b",
    text: "#f1eee3",
    muted: "#89906d",
  },
  tactical: {
    label: "TACTICAL COMMAND",
    description: "Dark field-operations display",
    background: "#050905",
    panel: "#0b1308",
    grid: "rgba(50, 217, 82, 0.14)",
    gold: "#d8a72a",
    green: "#47d15e",
    text: "#e9f1df",
    muted: "#6f8b6a",
  },
} as const;

/**
 * Project-defined fallback weights used only when an NFT has no on-chain
 * rarity score or rank. Add or edit trait/value pairs as the collection grows.
 */
export const traitWeights: Record<string, Record<string, number>> = {
  Ranks: {
    "Groyper Supreme Commander": 120,
    "Alpha Commander": 100,
    "Alpha Officer": 85,
    "Squad Leader": 70,
    Strategist: 60,
    "Field Commander": 50,
    "Tactical Lead": 42,
    Vanguard: 35,
    Operative: 28,
    Prospect: 22,
    Initiate: 16,
    Recruit: 10,
    Civilian: 1,
  },
};

export function isBannerStyle(value: string | null): value is BannerStyle {
  return value === "clean" || value === "tactical";
}
