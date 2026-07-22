CREATE TABLE IF NOT EXISTS commander_awards (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES public_commander_profiles(id) ON DELETE CASCADE,
  award_id TEXT NOT NULL,
  award_type TEXT NOT NULL CHECK (award_type IN ('permanent', 'status')),
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB,
  UNIQUE (profile_id, award_id)
);

CREATE INDEX IF NOT EXISTS commander_awards_profile_idx ON commander_awards (profile_id);
CREATE INDEX IF NOT EXISTS commander_awards_award_idx ON commander_awards (award_id);

INSERT INTO commander_awards (id, profile_id, award_id, award_type, unlocked_at, last_evaluated_at)
SELECT profile_id || ':FIRST_DEPLOYMENT', profile_id, 'FIRST_DEPLOYMENT', 'permanent', published_at, NOW()
FROM (SELECT id AS profile_id, published_at FROM public_commander_profiles) profiles
ON CONFLICT (profile_id, award_id) DO NOTHING;

INSERT INTO commander_awards (id, profile_id, award_id, award_type, unlocked_at, last_evaluated_at)
SELECT id || ':RARE_ASSET', id, 'RARE_ASSET', 'permanent', published_at, NOW()
FROM public_commander_profiles
WHERE featured_soldier IS NOT NULL
  AND COALESCE(featured_soldier->>'rarity', '') ~ '^#[0-9]+$'
  AND SUBSTRING(featured_soldier->>'rarity' FROM 2)::INTEGER <= 77
ON CONFLICT (profile_id, award_id) DO NOTHING;

INSERT INTO commander_awards (id, profile_id, award_id, award_type, unlocked_at, last_evaluated_at)
SELECT id || ':' || milestone.award_id, id, milestone.award_id, 'permanent', published_at, NOW()
FROM public_commander_profiles
CROSS JOIN (VALUES (5, 'ARMY_5'), (10, 'ARMY_10'), (25, 'ARMY_25'), (50, 'ARMY_50'), (100, 'ARMY_100')) AS milestone(minimum, award_id)
WHERE army_size >= milestone.minimum
ON CONFLICT (profile_id, award_id) DO NOTHING;

INSERT INTO commander_awards (id, profile_id, award_id, award_type, unlocked_at, last_evaluated_at)
SELECT id || ':OLD_GUARD', id, 'OLD_GUARD', 'permanent', published_at, NOW()
FROM (
  SELECT id, published_at, ROW_NUMBER() OVER (ORDER BY published_at ASC, id ASC) AS publication_position
  FROM public_commander_profiles
) pioneers
WHERE publication_position <= 25
ON CONFLICT (profile_id, award_id) DO NOTHING;
