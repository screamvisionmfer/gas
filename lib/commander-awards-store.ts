import { randomUUID } from "node:crypto";
import type { CommanderAwardId } from "./commander-awards-types";
import { CommanderProfileStoreError, ensureCommanderProfileSchema, getCommanderDatabase } from "./commander-profile-store";

type AwardRow = { award_id: string; unlocked_at: string | Date };

let awardsSchemaReady: Promise<void> | null = null;

export async function ensureCommanderAwardsSchema() {
  if (awardsSchemaReady) return awardsSchemaReady;
  awardsSchemaReady = (async () => {
    await ensureCommanderProfileSchema();
    const db = getCommanderDatabase();
    await db`CREATE TABLE IF NOT EXISTS commander_awards (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL REFERENCES public_commander_profiles(id) ON DELETE CASCADE,
      award_id TEXT NOT NULL,
      award_type TEXT NOT NULL CHECK (award_type IN ('permanent', 'status')),
      unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      metadata JSONB,
      UNIQUE (profile_id, award_id)
    )`;
    await db`CREATE INDEX IF NOT EXISTS commander_awards_profile_idx ON commander_awards (profile_id)`;
    await db`CREATE INDEX IF NOT EXISTS commander_awards_award_idx ON commander_awards (award_id)`;
    await db`INSERT INTO commander_awards (id, profile_id, award_id, award_type, unlocked_at, last_evaluated_at)
      SELECT id || ':FIRST_DEPLOYMENT', id, 'FIRST_DEPLOYMENT', 'permanent', published_at, NOW()
      FROM public_commander_profiles
      ON CONFLICT (profile_id, award_id) DO NOTHING`;
    await db`INSERT INTO commander_awards (id, profile_id, award_id, award_type, unlocked_at, last_evaluated_at)
      SELECT id || ':' || milestone.award_id, id, milestone.award_id, 'permanent', published_at, NOW()
      FROM public_commander_profiles
      CROSS JOIN (VALUES (5, 'ARMY_5'), (10, 'ARMY_10'), (25, 'ARMY_25'), (50, 'ARMY_50'), (100, 'ARMY_100')) AS milestone(minimum, award_id)
      WHERE army_size >= milestone.minimum
      ON CONFLICT (profile_id, award_id) DO NOTHING`;
    await db`INSERT INTO commander_awards (id, profile_id, award_id, award_type, unlocked_at, last_evaluated_at)
      SELECT id || ':OLD_GUARD', id, 'OLD_GUARD', 'permanent', published_at, NOW()
      FROM (
        SELECT id, published_at, ROW_NUMBER() OVER (ORDER BY published_at ASC, id ASC) AS publication_position
        FROM public_commander_profiles
      ) pioneers WHERE publication_position <= 25
      ON CONFLICT (profile_id, award_id) DO NOTHING`;
    await db`INSERT INTO commander_awards (id, profile_id, award_id, award_type, unlocked_at, last_evaluated_at)
      SELECT id || ':RARE_ASSET', id, 'RARE_ASSET', 'permanent', published_at, NOW()
      FROM public_commander_profiles
      WHERE featured_soldier IS NOT NULL
        AND COALESCE(featured_soldier->>'rarity', '') ~ '^#[0-9]+$'
        AND SUBSTRING(featured_soldier->>'rarity' FROM 2)::INTEGER <= 77
      ON CONFLICT (profile_id, award_id) DO NOTHING`;
  })().catch((error) => {
    awardsSchemaReady = null;
    if (error instanceof CommanderProfileStoreError) throw error;
    throw new CommanderProfileStoreError("Commander service record is temporarily unavailable.", "DATABASE_UNAVAILABLE");
  });
  return awardsSchemaReady;
}

export async function unlockCommanderAwards(profileId: string, awardIds: CommanderAwardId[]) {
  await ensureCommanderAwardsSchema();
  const db = getCommanderDatabase();
  for (const awardId of awardIds) {
    await db`INSERT INTO commander_awards (id, profile_id, award_id, award_type, unlocked_at, last_evaluated_at)
      VALUES (${randomUUID()}, ${profileId}, ${awardId}, 'permanent', NOW(), NOW())
      ON CONFLICT (profile_id, award_id) DO UPDATE SET last_evaluated_at = NOW()`;
  }
}

export async function getCommanderPermanentAwardRows(profileId: string) {
  await ensureCommanderAwardsSchema();
  const rows = await getCommanderDatabase()`SELECT award_id, unlocked_at FROM commander_awards WHERE profile_id = ${profileId} AND award_type = 'permanent' ORDER BY unlocked_at ASC`;
  return rows as AwardRow[];
}

export async function getCommanderPublicationPosition(profileId: string) {
  await ensureCommanderAwardsSchema();
  const rows = await getCommanderDatabase()`WITH publications AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY published_at ASC, id ASC) AS position
    FROM public_commander_profiles
  ) SELECT position FROM publications WHERE id = ${profileId} LIMIT 1` as Array<{ position: string | number }>;
  return rows[0] ? Number(rows[0].position) : null;
}
