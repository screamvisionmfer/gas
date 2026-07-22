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
  dataMode: "hybrid",
};
