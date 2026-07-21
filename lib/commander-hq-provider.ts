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

// Replace this provider with a Privy + Helius implementation without changing the UI components.
export const commanderDataProvider: CommanderDataProvider = new MockCommanderDataProvider();

