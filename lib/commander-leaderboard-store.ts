import type {
  CommanderLeaderboardEntry,
  CommanderLeaderboardPositions,
  CommanderLeaderboardResult,
  CommanderLeaderboardSort,
} from "./commander-profile-types";
import {
  CommanderProfileStoreError,
  ensureCommanderProfileSchema,
  getCommanderDatabase,
} from "./commander-profile-store";

const PAGE_SIZE = 25;

type LeaderboardRow = {
  position: string | number;
  username: string;
  username_normalized: string;
  display_name: string;
  avatar_url: string | null;
  member_since: string | Date;
  published_at: string | Date;
  army_size: number;
  rank_id: string;
  rank_name: string;
  rank_unit: string | null;
  rank_insignia: string | null;
  rank_sort_value: number;
  featured_soldier: unknown;
  army_last_synced_at: string | Date;
};

function iso(value: string | Date) {
  return new Date(value).toISOString();
}

function rowToEntry(row: LeaderboardRow): CommanderLeaderboardEntry {
  const featured = row.featured_soldier && typeof row.featured_soldier === "object"
    ? row.featured_soldier as CommanderLeaderboardEntry["featuredSoldier"]
    : undefined;
  return {
    position: Number(row.position),
    username: row.username,
    usernameNormalized: row.username_normalized,
    displayName: row.display_name || row.username,
    avatarUrl: row.avatar_url ?? undefined,
    memberSince: iso(row.member_since),
    publishedAt: iso(row.published_at),
    armySize: row.army_size,
    rank: {
      id: row.rank_id,
      name: row.rank_name,
      unit: row.rank_unit ?? undefined,
      insignia: row.rank_insignia ?? undefined,
      sortValue: row.rank_sort_value,
    },
    featuredSoldier: featured,
    armyLastSyncedAt: iso(row.army_last_synced_at),
  };
}

async function leaderboardRows(sort: CommanderLeaderboardSort, limit: number, offset: number) {
  const db = getCommanderDatabase();
  if (sort === "rank") {
    const rows = await db`WITH ranked AS (
      SELECT ROW_NUMBER() OVER (ORDER BY rank_sort_value DESC, army_size DESC, published_at ASC, username_normalized ASC) AS position,
        username, username_normalized, display_name, avatar_url, member_since, published_at, army_size,
        rank_id, rank_name, rank_unit, rank_insignia, rank_sort_value, featured_soldier, army_last_synced_at
      FROM public_commander_profiles
      WHERE is_public = TRUE AND BTRIM(username) <> '' AND BTRIM(username_normalized) <> ''
    ) SELECT * FROM ranked ORDER BY position LIMIT ${limit} OFFSET ${offset}`;
    return rows as LeaderboardRow[];
  }
  if (sort === "newest") {
    const rows = await db`WITH ranked AS (
      SELECT ROW_NUMBER() OVER (ORDER BY published_at DESC, username_normalized ASC) AS position,
        username, username_normalized, display_name, avatar_url, member_since, published_at, army_size,
        rank_id, rank_name, rank_unit, rank_insignia, rank_sort_value, featured_soldier, army_last_synced_at
      FROM public_commander_profiles
      WHERE is_public = TRUE AND BTRIM(username) <> '' AND BTRIM(username_normalized) <> ''
    ) SELECT * FROM ranked ORDER BY position LIMIT ${limit} OFFSET ${offset}`;
    return rows as LeaderboardRow[];
  }
  const rows = await db`WITH ranked AS (
    SELECT ROW_NUMBER() OVER (ORDER BY army_size DESC, rank_sort_value DESC, published_at ASC, username_normalized ASC) AS position,
      username, username_normalized, display_name, avatar_url, member_since, published_at, army_size,
      rank_id, rank_name, rank_unit, rank_insignia, rank_sort_value, featured_soldier, army_last_synced_at
    FROM public_commander_profiles
    WHERE is_public = TRUE AND BTRIM(username) <> '' AND BTRIM(username_normalized) <> ''
  ) SELECT * FROM ranked ORDER BY position LIMIT ${limit} OFFSET ${offset}`;
  return rows as LeaderboardRow[];
}

export async function getCommanderLeaderboard(sort: CommanderLeaderboardSort, requestedPage: number): Promise<CommanderLeaderboardResult> {
  try {
    await ensureCommanderProfileSchema();
    const db = getCommanderDatabase();
    const totals = await db`SELECT COUNT(*)::int AS total FROM public_commander_profiles WHERE is_public = TRUE AND BTRIM(username) <> '' AND BTRIM(username_normalized) <> ''` as Array<{ total: number }>;
    const totalProfiles = totals[0]?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(totalProfiles / PAGE_SIZE));
    const page = Math.min(Math.max(1, requestedPage), totalPages);
    const rows = totalProfiles > 0 ? await leaderboardRows(sort, PAGE_SIZE, (page - 1) * PAGE_SIZE) : [];
    return { entries: rows.map(rowToEntry), sort, page, pageSize: PAGE_SIZE, totalProfiles, totalPages };
  } catch (error) {
    if (error instanceof CommanderProfileStoreError) throw error;
    throw new CommanderProfileStoreError("Commander leaderboard is temporarily unavailable.", "DATABASE_UNAVAILABLE");
  }
}

export async function getCommanderLeaderboardPositions(privyId: string): Promise<CommanderLeaderboardPositions> {
  try {
    await ensureCommanderProfileSchema();
    const rows = await getCommanderDatabase()`WITH public_profiles AS (
      SELECT privy_id,
        ROW_NUMBER() OVER (ORDER BY army_size DESC, rank_sort_value DESC, published_at ASC, username_normalized ASC) AS army_position,
        ROW_NUMBER() OVER (ORDER BY rank_sort_value DESC, army_size DESC, published_at ASC, username_normalized ASC) AS rank_position,
        COUNT(*) OVER () AS total_profiles
      FROM public_commander_profiles
      WHERE is_public = TRUE AND BTRIM(username) <> '' AND BTRIM(username_normalized) <> ''
    ) SELECT army_position, rank_position, total_profiles FROM public_profiles WHERE privy_id = ${privyId} LIMIT 1` as Array<{
      army_position: string | number;
      rank_position: string | number;
      total_profiles: string | number;
    }>;
    if (!rows[0]) return null;
    return { army: Number(rows[0].army_position), rank: Number(rows[0].rank_position), totalProfiles: Number(rows[0].total_profiles) };
  } catch (error) {
    if (error instanceof CommanderProfileStoreError) throw error;
    throw new CommanderProfileStoreError("Commander leaderboard is temporarily unavailable.", "DATABASE_UNAVAILABLE");
  }
}
