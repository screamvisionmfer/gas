import { randomUUID } from "node:crypto";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import type { PublicCommanderProfile } from "./commander-profile-types";
import { rankSortValue, ranks } from "./ranks";

type ProfileRow = {
  id: string;
  privy_id: string;
  username: string;
  username_normalized: string;
  display_name: string;
  avatar_url: string | null;
  primary_wallet: string;
  member_since: string | Date;
  created_at: string | Date;
  updated_at: string | Date;
  published_at: string | Date;
  is_public: boolean;
  featured_soldier_mint: string | null;
  featured_soldier: unknown;
  army_size: number;
  army_snapshot: unknown;
  rank_id: string;
  rank_name: string;
  rank_unit: string | null;
  rank_insignia: string | null;
  next_rank_name: string | null;
  next_rank_soldiers_needed: number | null;
  next_rank_progress: number | null;
  groyper_balance: number | null;
  commander_score: number | null;
  profile_version: number;
  army_last_synced_at: string | Date;
};

export class CommanderProfileStoreError extends Error {
  constructor(message: string, public readonly code: "DATABASE_UNAVAILABLE" | "USERNAME_COLLISION") {
    super(message);
  }
}

let database: NeonQueryFunction<false, false> | null = null;
let schemaReady: Promise<void> | null = null;

export function getCommanderDatabase() {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) throw new CommanderProfileStoreError("Commander profile storage is not configured.", "DATABASE_UNAVAILABLE");
  database ??= neon(connectionString);
  return database;
}

export async function ensureCommanderProfileSchema() {
  if (schemaReady) return schemaReady;
  schemaReady = (async () => {
    const db = getCommanderDatabase();
    await db`CREATE TABLE IF NOT EXISTS public_commander_profiles (
      id TEXT PRIMARY KEY, privy_id TEXT NOT NULL UNIQUE, username TEXT NOT NULL,
      username_normalized TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL, avatar_url TEXT,
      primary_wallet TEXT NOT NULL, member_since TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), is_public BOOLEAN NOT NULL DEFAULT FALSE,
      featured_soldier_mint TEXT, featured_soldier JSONB, army_size INTEGER NOT NULL DEFAULT 0,
      army_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb, rank_id TEXT NOT NULL, rank_name TEXT NOT NULL,
      rank_unit TEXT, rank_insignia TEXT, next_rank_name TEXT, next_rank_soldiers_needed INTEGER,
      next_rank_progress INTEGER, groyper_balance DOUBLE PRECISION, commander_score INTEGER,
      profile_version INTEGER NOT NULL DEFAULT 1, army_last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      rank_sort_value INTEGER NOT NULL DEFAULT 0
    )`;
    await db`ALTER TABLE public_commander_profiles ADD COLUMN IF NOT EXISTS rank_sort_value INTEGER NOT NULL DEFAULT 0`;
    const backfill = await db`SELECT COUNT(*)::int AS count FROM public_commander_profiles WHERE rank_sort_value = 0 AND rank_name <> 'Unranked'` as Array<{ count: number }>;
    if ((backfill[0]?.count ?? 0) > 0) {
      for (const [index, rank] of ranks.entries()) {
        await db`UPDATE public_commander_profiles SET rank_sort_value = ${index + 1} WHERE LOWER(rank_name) = ${rank.name.toLowerCase()} AND rank_sort_value <> ${index + 1}`;
      }
    }
    await db`CREATE INDEX IF NOT EXISTS public_commander_profiles_public_username_idx ON public_commander_profiles (username_normalized) WHERE is_public = TRUE`;
    await db`CREATE INDEX IF NOT EXISTS public_commander_profiles_public_army_idx ON public_commander_profiles (army_size DESC, rank_sort_value DESC, published_at ASC, username_normalized ASC) WHERE is_public = TRUE`;
    await db`CREATE INDEX IF NOT EXISTS public_commander_profiles_public_rank_idx ON public_commander_profiles (rank_sort_value DESC, army_size DESC, published_at ASC, username_normalized ASC) WHERE is_public = TRUE`;
    await db`CREATE INDEX IF NOT EXISTS public_commander_profiles_public_newest_idx ON public_commander_profiles (published_at DESC, username_normalized ASC) WHERE is_public = TRUE`;
    await db`CREATE TABLE IF NOT EXISTS public_commander_profile_aliases (
      username_normalized TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL REFERENCES public_commander_profiles(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  })().catch((error) => {
    schemaReady = null;
    if (error instanceof CommanderProfileStoreError) throw error;
    throw new CommanderProfileStoreError("Commander profile storage is temporarily unavailable.", "DATABASE_UNAVAILABLE");
  });
  return schemaReady;
}

function iso(value: string | Date) {
  return new Date(value).toISOString();
}

function rowToProfile(row: ProfileRow): PublicCommanderProfile {
  const army = Array.isArray(row.army_snapshot) ? row.army_snapshot : [];
  const featured = row.featured_soldier && typeof row.featured_soldier === "object" ? row.featured_soldier : undefined;
  return {
    id: row.id,
    username: row.username,
    usernameNormalized: row.username_normalized,
    displayName: row.display_name,
    avatarUrl: row.avatar_url ?? undefined,
    primaryWallet: row.primary_wallet,
    memberSince: iso(row.member_since),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    publishedAt: iso(row.published_at),
    isPublic: row.is_public,
    featuredSoldierMint: row.featured_soldier_mint ?? undefined,
    featuredSoldier: featured as PublicCommanderProfile["featuredSoldier"],
    army: army as PublicCommanderProfile["army"],
    armySize: row.army_size,
    rank: { id: row.rank_id, name: row.rank_name, unit: row.rank_unit ?? undefined, insignia: row.rank_insignia ?? undefined },
    nextRank: row.next_rank_name && row.next_rank_soldiers_needed !== null && row.next_rank_progress !== null
      ? { name: row.next_rank_name, soldiersNeeded: row.next_rank_soldiers_needed, progress: row.next_rank_progress }
      : undefined,
    groyperBalance: row.groyper_balance ?? undefined,
    commanderScore: row.commander_score ?? undefined,
    profileVersion: row.profile_version,
    armyLastSyncedAt: iso(row.army_last_synced_at),
  };
}

export async function getCommanderProfileByPrivyId(privyId: string) {
  await ensureCommanderProfileSchema();
  const rows = await getCommanderDatabase()`SELECT * FROM public_commander_profiles WHERE privy_id = ${privyId} LIMIT 1` as ProfileRow[];
  return rows[0] ? rowToProfile(rows[0]) : null;
}

export async function getPublicCommanderProfile(usernameNormalized: string) {
  await ensureCommanderProfileSchema();
  const rows = await getCommanderDatabase()`SELECT * FROM public_commander_profiles WHERE username_normalized = ${usernameNormalized} AND is_public = TRUE LIMIT 1` as ProfileRow[];
  return rows[0] ? rowToProfile(rows[0]) : null;
}

export async function getCommanderAlias(usernameNormalized: string) {
  await ensureCommanderProfileSchema();
  const rows = await getCommanderDatabase()`SELECT p.username_normalized FROM public_commander_profile_aliases a JOIN public_commander_profiles p ON p.id = a.profile_id WHERE a.username_normalized = ${usernameNormalized} AND p.is_public = TRUE LIMIT 1` as Array<{ username_normalized: string }>;
  return rows[0]?.username_normalized ?? null;
}

export type ProfileSnapshotInput = Omit<PublicCommanderProfile, "id" | "createdAt" | "updatedAt" | "publishedAt" | "profileVersion"> & {
  privyId: string;
};

export async function upsertCommanderProfile(input: ProfileSnapshotInput) {
  await ensureCommanderProfileSchema();
  const db = getCommanderDatabase();
  const current = await getCommanderProfileByPrivyId(input.privyId);
  const collision = await db`SELECT privy_id FROM public_commander_profiles WHERE username_normalized = ${input.usernameNormalized} AND privy_id <> ${input.privyId} LIMIT 1` as Array<{ privy_id: string }>;
  if (collision[0]) throw new CommanderProfileStoreError("That X username is already assigned to another Commander file.", "USERNAME_COLLISION");
  const aliasCollision = await db`SELECT p.privy_id FROM public_commander_profile_aliases a JOIN public_commander_profiles p ON p.id = a.profile_id WHERE a.username_normalized = ${input.usernameNormalized} AND p.privy_id <> ${input.privyId} LIMIT 1` as Array<{ privy_id: string }>;
  if (aliasCollision[0]) throw new CommanderProfileStoreError("That X username is reserved by another Commander file.", "USERNAME_COLLISION");

  if (current && current.usernameNormalized !== input.usernameNormalized) {
    await db`INSERT INTO public_commander_profile_aliases (username_normalized, profile_id) VALUES (${current.usernameNormalized}, ${current.id}) ON CONFLICT (username_normalized) DO NOTHING`;
  }

  const id = current?.id ?? randomUUID();
  const army = JSON.stringify(input.army);
  const featured = input.featuredSoldier ? JSON.stringify(input.featuredSoldier) : null;
  const rows = await db`INSERT INTO public_commander_profiles (
    id, privy_id, username, username_normalized, display_name, avatar_url, primary_wallet, member_since,
    published_at, is_public, featured_soldier_mint, featured_soldier, army_size, army_snapshot,
    rank_id, rank_name, rank_unit, rank_insignia, next_rank_name, next_rank_soldiers_needed,
    next_rank_progress, groyper_balance, commander_score, profile_version, army_last_synced_at, rank_sort_value
  ) VALUES (
    ${id}, ${input.privyId}, ${input.username}, ${input.usernameNormalized}, ${input.displayName}, ${input.avatarUrl ?? null},
    ${input.primaryWallet}, ${input.memberSince}, NOW(), ${input.isPublic}, ${input.featuredSoldierMint ?? null},
    ${featured}::jsonb, ${input.armySize}, ${army}::jsonb, ${input.rank.id}, ${input.rank.name}, ${input.rank.unit ?? null},
    ${input.rank.insignia ?? null}, ${input.nextRank?.name ?? null}, ${input.nextRank?.soldiersNeeded ?? null},
    ${input.nextRank?.progress ?? null}, ${input.groyperBalance ?? null}, ${input.commanderScore ?? null},
    ${current ? current.profileVersion + 1 : 1}, ${input.armyLastSyncedAt}, ${rankSortValue(input.rank.name)}
  ) ON CONFLICT (privy_id) DO UPDATE SET
    username = EXCLUDED.username, username_normalized = EXCLUDED.username_normalized,
    display_name = EXCLUDED.display_name, avatar_url = EXCLUDED.avatar_url,
    primary_wallet = EXCLUDED.primary_wallet, member_since = EXCLUDED.member_since,
    updated_at = NOW(), published_at = CASE WHEN public_commander_profiles.is_public THEN public_commander_profiles.published_at ELSE NOW() END,
    is_public = EXCLUDED.is_public, featured_soldier_mint = EXCLUDED.featured_soldier_mint,
    featured_soldier = EXCLUDED.featured_soldier, army_size = EXCLUDED.army_size,
    army_snapshot = EXCLUDED.army_snapshot, rank_id = EXCLUDED.rank_id, rank_name = EXCLUDED.rank_name,
    rank_unit = EXCLUDED.rank_unit, rank_insignia = EXCLUDED.rank_insignia,
    next_rank_name = EXCLUDED.next_rank_name, next_rank_soldiers_needed = EXCLUDED.next_rank_soldiers_needed,
    next_rank_progress = EXCLUDED.next_rank_progress, groyper_balance = EXCLUDED.groyper_balance,
    commander_score = EXCLUDED.commander_score, profile_version = EXCLUDED.profile_version,
    army_last_synced_at = EXCLUDED.army_last_synced_at, rank_sort_value = EXCLUDED.rank_sort_value
  RETURNING *` as ProfileRow[];
  return rowToProfile(rows[0]);
}

export async function unpublishCommanderProfile(privyId: string) {
  await ensureCommanderProfileSchema();
  const rows = await getCommanderDatabase()`UPDATE public_commander_profiles SET is_public = FALSE, updated_at = NOW(), profile_version = profile_version + 1 WHERE privy_id = ${privyId} RETURNING *` as ProfileRow[];
  return rows[0] ? rowToProfile(rows[0]) : null;
}

export async function setCommanderFeaturedSoldier(privyId: string, mint: string, soldier: PublicCommanderProfile["featuredSoldier"]) {
  await ensureCommanderProfileSchema();
  const featured = soldier ? JSON.stringify(soldier) : null;
  const rows = await getCommanderDatabase()`UPDATE public_commander_profiles SET featured_soldier_mint = ${mint}, featured_soldier = ${featured}::jsonb, updated_at = NOW(), profile_version = profile_version + 1 WHERE privy_id = ${privyId} RETURNING *` as ProfileRow[];
  return rows[0] ? rowToProfile(rows[0]) : null;
}
