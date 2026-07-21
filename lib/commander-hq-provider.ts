import { mockCommanderDashboard } from "./commander-hq-data";
import type { CommanderDashboardData } from "./commander-hq-types";

export interface CommanderDataProvider {
  getDashboard(): Promise<CommanderDashboardData>;
}

class MockCommanderDataProvider implements CommanderDataProvider {
  async getDashboard() {
    return mockCommanderDashboard;
  }
}

// Profile and intelligence panels remain replaceable simulation data.
// Army ownership is loaded independently through the existing server-side verification API.
export const commanderDataProvider: CommanderDataProvider = new MockCommanderDataProvider();
