import type { Rank } from "./types";

export const unranked: Rank = {
  min: 0,
  max: 0,
  name: "Unranked",
  unitName: "Unassigned",
  image: "/logo.png",
};

export const ranks: Rank[] = [
  { min: 1, max: 1, name: "Recruit", unitName: "Fireteam", image: "/ranks/web/01-recruit.png" },
  { min: 2, max: 2, name: "Initiate", unitName: "Fireteam", image: "/ranks/web/02-initiate.png" },
  { min: 3, max: 4, name: "Prospect", unitName: "Squad", image: "/ranks/web/03-prospect.png" },
  { min: 5, max: 7, name: "Operative", unitName: "Squad", image: "/ranks/web/04-operative.png" },
  { min: 8, max: 11, name: "Vanguard", unitName: "Platoon", image: "/ranks/web/05-vanguard.png" },
  { min: 12, max: 16, name: "Field Commander", unitName: "Company", image: "/ranks/web/06-field-commander.png" },
  { min: 17, max: 22, name: "Strategist", unitName: "Battalion", image: "/ranks/web/07-strategist.png" },
  { min: 23, max: 29, name: "Tactical Lead", unitName: "Regiment", image: "/ranks/web/08-tactical-lead.png" },
  { min: 30, max: 39, name: "Squad Leader", unitName: "Brigade", image: "/ranks/web/09-squad-leader.png" },
  { min: 40, max: 54, name: "Alpha Officer", unitName: "Alpha Command", image: "/ranks/web/10-alpha-officer.png" },
  { min: 55, max: 76, name: "Alpha Commander", unitName: "High Command", image: "/ranks/web/11-alpha-commander.png" },
  { min: 77, name: "Groyper Supreme Commander", unitName: "Supreme Command", image: "/ranks/web/12-groyper-supreme-commander.png" },
];

export function rankForCount(count: number) {
  if (count <= 0) return unranked;
  return [...ranks].reverse().find((rank) => count >= rank.min) ?? ranks[0];
}

export function nextRankForCount(count: number) {
  return ranks.find((rank) => rank.min > count);
}

export function rankSortValue(rankName: string) {
  const normalized = rankName.trim().toLowerCase();
  const index = ranks.findIndex((rank) => rank.name.toLowerCase() === normalized);
  return index < 0 ? 0 : index + 1;
}
