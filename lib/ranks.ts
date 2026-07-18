import type { Rank } from "./types";

export const unranked: Rank = {
  min: 0,
  max: 0,
  name: "Unranked",
  unitName: "Unassigned",
  image: "/logo.png",
};

export const ranks: Rank[] = [
  { min: 1, max: 1, name: "Recruit", unitName: "Fireteam", image: "/ranks/01-recruit.png" },
  { min: 2, max: 3, name: "Initiate", unitName: "Fireteam", image: "/ranks/02-initiate.png" },
  { min: 4, max: 6, name: "Prospect", unitName: "Squad", image: "/ranks/03-prospect.png" },
  { min: 7, max: 11, name: "Operative", unitName: "Squad", image: "/ranks/04-operative.png" },
  { min: 12, max: 19, name: "Vanguard", unitName: "Platoon", image: "/ranks/05-vanguard.png" },
  { min: 20, max: 34, name: "Field Commander", unitName: "Company", image: "/ranks/06-field-commander.png" },
  { min: 35, max: 54, name: "Strategist", unitName: "Battalion", image: "/ranks/07-strategist.png" },
  { min: 55, max: 79, name: "Tactical Lead", unitName: "Regiment", image: "/ranks/08-tactical-lead.png" },
  { min: 80, max: 119, name: "Squad Leader", unitName: "Brigade", image: "/ranks/09-squad-leader.png" },
  { min: 120, max: 199, name: "Alpha Officer", unitName: "Alpha Command", image: "/ranks/10-alpha-officer.png" },
  { min: 200, max: 349, name: "Alpha Commander", unitName: "High Command", image: "/ranks/11-alpha-commander.png" },
  { min: 350, name: "Groyper Supreme Commander", unitName: "Supreme Command", image: "/ranks/12-groyper-supreme-commander.png" },
];

export function rankForCount(count: number) {
  if (count <= 0) return unranked;
  return [...ranks].reverse().find((rank) => count >= rank.min) ?? ranks[0];
}

export function nextRankForCount(count: number) {
  return ranks.find((rank) => rank.min > count);
}

