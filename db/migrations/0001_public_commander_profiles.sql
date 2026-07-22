CREATE TABLE IF NOT EXISTS public_commander_profiles (
  id TEXT PRIMARY KEY,
  privy_id TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL,
  username_normalized TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  primary_wallet TEXT NOT NULL,
  member_since TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  featured_soldier_mint TEXT,
  featured_soldier JSONB,
  army_size INTEGER NOT NULL DEFAULT 0,
  army_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  rank_id TEXT NOT NULL,
  rank_name TEXT NOT NULL,
  rank_unit TEXT,
  rank_insignia TEXT,
  next_rank_name TEXT,
  next_rank_soldiers_needed INTEGER,
  next_rank_progress INTEGER,
  groyper_balance DOUBLE PRECISION,
  commander_score INTEGER,
  profile_version INTEGER NOT NULL DEFAULT 1,
  army_last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS public_commander_profiles_public_username_idx
  ON public_commander_profiles (username_normalized)
  WHERE is_public = TRUE;

CREATE TABLE IF NOT EXISTS public_commander_profile_aliases (
  username_normalized TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES public_commander_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

