import type { CommanderDashboardData } from "./commander-hq-types";

export const mockCommanderDashboard: CommanderDashboardData = {
  commander: {
    displayName: "Scream Vision",
    username: "scream_vision",
    rank: "Awaiting Scan",
    rankImage: "/logo.png",
    rankUnit: "Unassigned",
    armySize: 0,
    commanderScore: 9320,
    memberSince: "21 Jul 2026",
    nextRank: "Recruit",
    soldiersNeeded: 1,
    rankProgress: 0,
  },
  soldiers: [],
  treasury: {
    totalValueUsd: 42930.71,
    change24hUsd: 8230.45,
    change24hPercent: 8.23,
    investedUsd: 22608.26,
    realizedPnlUsd: 12430.12,
    unrealizedPnlUsd: 7892.33,
    // Simulation-only portfolio input. This is not derived from the connected wallet yet.
    averageBuyPriceUsd: 0.01723,
  },
  medals: [
    { id: "first-wave", name: "First Wave", code: "01", unlocked: true },
    { id: "army-builder", name: "Army Builder", code: "10", unlocked: true },
    { id: "diamond-hands", name: "Diamond Hands", code: "30", unlocked: true },
    { id: "signal-corps", name: "Signal Corps", code: "X", unlocked: true },
    { id: "high-command", name: "High Command", code: "HC", unlocked: false },
  ],
  achievements: [
    { id: "early", name: "Early Recruit", description: "Joined among the first 100 commanders", state: "unlocked" },
    { id: "diamond", name: "Diamond Hands", description: "Held $GROYPER for 30 days", state: "unlocked" },
    { id: "builder", name: "Army Builder", description: "Own 10+ GAS soldiers", state: "progress", progress: 82 },
    { id: "supreme", name: "Supreme Command", description: "Reach the highest collection rank", state: "locked" },
    { id: "classified", name: "Classified Operation", description: "Hidden achievement", state: "hidden" },
  ],
  dataMode: "hybrid",
};
