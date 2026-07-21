import { mockCommanderDashboard } from "./commander-hq-data";
import type { CommanderDashboardData, CommanderIdentity } from "./commander-hq-types";

export interface CommanderDataProvider {
  getDashboard(identity?: CommanderIdentity): Promise<CommanderDashboardData>;
}

class MockCommanderDataProvider implements CommanderDataProvider {
  async getDashboard(identity?: CommanderIdentity) {
    return identity ? { ...mockCommanderDashboard, identity } : mockCommanderDashboard;
  }
}

// Profile and intelligence panels remain replaceable simulation data.
// Army ownership is loaded independently through the existing server-side verification API.
export const commanderDataProvider: CommanderDataProvider = new MockCommanderDataProvider();
