import type { Rank } from "./types";

export const ranks: Rank[] = [
  { min: 0, max: 0, name: "Civilian Observer", unitName: "Unassigned", image: "/logo.png" },
  { min: 1, max: 1, name: "Recruit", unitName: "Fireteam", image: "/logo.png" },
  { min: 2, max: 3, name: "Private", unitName: "Fireteam", image: "/logo.png" },
  { min: 4, max: 6, name: "Corporal", unitName: "Squad", image: "/logo.png" },
  { min: 7, max: 11, name: "Sergeant", unitName: "Squad", image: "/logo.png" },
  { min: 12, max: 19, name: "Staff Sergeant", unitName: "Platoon", image: "/logo.png" },
  { min: 20, max: 34, name: "Lieutenant", unitName: "Platoon", image: "/logo.png" },
  { min: 35, max: 54, name: "Captain", unitName: "Company", image: "/logo.png" },
  { min: 55, max: 79, name: "Major", unitName: "Battalion", image: "/logo.png" },
  { min: 80, max: 119, name: "Colonel", unitName: "Regiment", image: "/logo.png" },
  { min: 120, max: 199, name: "Brigadier", unitName: "Brigade", image: "/logo.png" },
  { min: 200, name: "General", unitName: "Alpha Command", image: "/logo.png" },
];

export function rankForCount(count: number) {
  return [...ranks].reverse().find((rank) => count >= rank.min) ?? ranks[0];
}

export function nextRankForCount(count: number) {
  return ranks.find((rank) => rank.min > count);
}

