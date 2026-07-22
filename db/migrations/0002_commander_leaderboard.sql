ALTER TABLE public_commander_profiles
  ADD COLUMN IF NOT EXISTS rank_sort_value INTEGER NOT NULL DEFAULT 0;

UPDATE public_commander_profiles
SET rank_sort_value = CASE LOWER(rank_name)
  WHEN 'recruit' THEN 1
  WHEN 'initiate' THEN 2
  WHEN 'prospect' THEN 3
  WHEN 'operative' THEN 4
  WHEN 'vanguard' THEN 5
  WHEN 'field commander' THEN 6
  WHEN 'strategist' THEN 7
  WHEN 'tactical lead' THEN 8
  WHEN 'squad leader' THEN 9
  WHEN 'alpha officer' THEN 10
  WHEN 'alpha commander' THEN 11
  WHEN 'groyper supreme commander' THEN 12
  ELSE 0
END;

CREATE INDEX IF NOT EXISTS public_commander_profiles_public_army_idx
  ON public_commander_profiles (army_size DESC, rank_sort_value DESC, published_at ASC, username_normalized ASC)
  WHERE is_public = TRUE;

CREATE INDEX IF NOT EXISTS public_commander_profiles_public_rank_idx
  ON public_commander_profiles (rank_sort_value DESC, army_size DESC, published_at ASC, username_normalized ASC)
  WHERE is_public = TRUE;

CREATE INDEX IF NOT EXISTS public_commander_profiles_public_newest_idx
  ON public_commander_profiles (published_at DESC, username_normalized ASC)
  WHERE is_public = TRUE;
