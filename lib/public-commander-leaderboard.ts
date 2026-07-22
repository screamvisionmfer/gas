import { unstable_cache } from "next/cache";
import type { CommanderLeaderboardSort } from "./commander-profile-types";
import { getCommanderLeaderboard } from "./commander-leaderboard-store";

export const getCachedCommanderLeaderboard = unstable_cache(
  async (sort: CommanderLeaderboardSort, page: number) => getCommanderLeaderboard(sort, page),
  ["commander-leaderboard"],
  { revalidate: 300, tags: ["commander-leaderboard"] },
);
