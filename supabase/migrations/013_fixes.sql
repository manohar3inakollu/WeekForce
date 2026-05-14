-- Migration 013: correctness fixes
--   1. Unique constraint on xp_events(user_id, source_id) so ON CONFLICT works
--   2. Allow 'milestone' as a valid source_type in xp_events
--   3. Add xp_awarded column to milestones (mirrors goals)
--   4. Replace calculate_rank_from_xp with calculate_rank(xp, qualifying_days)
--      so rank 10 becomes reachable and rank is computed correctly using both axes
--   5. Rewrite award_xp: query today's XP BEFORE insert, early-return on duplicate,
--      use calculate_rank instead of calculate_rank_from_xp
--   6. Update revoke_xp to use calculate_rank

-- ─── 1. Unique constraint ─────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'xp_events_user_source_unique'
  ) THEN
    ALTER TABLE public.xp_events
      ADD CONSTRAINT xp_events_user_source_unique UNIQUE (user_id, source_id);
  END IF;
END
$$;

-- ─── 2. Allow 'milestone' source_type ────────────────────────────────────────
ALTER TABLE public.xp_events
  DROP CONSTRAINT IF EXISTS xp_events_source_type_check;

ALTER TABLE public.xp_events
  ADD CONSTRAINT xp_events_source_type_check
  CHECK (source_type IN (
    'small_task','big_task','major_goal','milestone',
    'habit','streak_bonus','daily_clear'
  ));

-- ─── 3. Add xp_awarded to milestones ─────────────────────────────────────────
ALTER TABLE public.milestones
  ADD COLUMN IF NOT EXISTS xp_awarded boolean NOT NULL DEFAULT false;

-- ─── 4. calculate_rank(xp, qualifying_days) ──────────────────────────────────
-- Mirrors getRankForXP from constants/ranks.ts: returns the highest rank where
-- BOTH the XP threshold AND the qualifying_days threshold are met.
CREATE OR REPLACE FUNCTION calculate_rank(p_xp int, p_qualifying_days int)
RETURNS int
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p_xp >= 91400 AND p_qualifying_days >= 1825 THEN 25
    WHEN p_xp >= 63900 AND p_qualifying_days >= 1278 THEN 24
    WHEN p_xp >= 63500 AND p_qualifying_days >= 1200 THEN 23
    WHEN p_xp >= 58500 AND p_qualifying_days >= 1110 THEN 22
    WHEN p_xp >= 53000 AND p_qualifying_days >= 1030 THEN 21
    WHEN p_xp >= 47500 AND p_qualifying_days >= 930  THEN 20
    WHEN p_xp >= 42500 AND p_qualifying_days >= 840  THEN 19
    WHEN p_xp >= 38000 AND p_qualifying_days >= 760  THEN 18
    WHEN p_xp >= 34500 AND p_qualifying_days >= 690  THEN 17
    WHEN p_xp >= 31500 AND p_qualifying_days >= 630  THEN 16
    WHEN p_xp >= 29000 AND p_qualifying_days >= 580  THEN 15
    WHEN p_xp >= 27400 AND p_qualifying_days >= 548  THEN 14
    WHEN p_xp >= 23750 AND p_qualifying_days >= 490  THEN 13
    WHEN p_xp >= 18000 AND p_qualifying_days >= 370  THEN 12
    WHEN p_xp >= 12650 AND p_qualifying_days >= 280  THEN 11
    WHEN p_xp >= 9150  AND p_qualifying_days >= 210  THEN 10
    WHEN p_xp >= 9150  AND p_qualifying_days >= 183  THEN 9
    WHEN p_xp >= 4950  AND p_qualifying_days >= 163  THEN 8
    WHEN p_xp >= 4400  AND p_qualifying_days >= 145  THEN 7
    WHEN p_xp >= 3650  AND p_qualifying_days >= 120  THEN 6
    WHEN p_xp >= 2750  AND p_qualifying_days >= 90   THEN 5
    WHEN p_xp >= 2000  AND p_qualifying_days >= 60   THEN 4
    WHEN p_xp >= 1100  AND p_qualifying_days >= 35   THEN 3
    WHEN p_xp >= 450   AND p_qualifying_days >= 14   THEN 2
    ELSE 1
  END
$$;

-- ─── 5. award_xp (fixed) ──────────────────────────────────────────────────────
-- Key fixes vs 012:
--   a) today's XP is queried BEFORE the insert (so v_today_xp_before doesn't
--      include the new event — the old code queried after, causing double-count
--      in the qualifying_days threshold check)
--   b) GET DIAGNOSTICS detects a no-op insert; if duplicate, we return early
--      without touching xp_total or rank_id
--   c) rank is computed via calculate_rank(xp, qualifying_days) so rank 10
--      becomes reachable
CREATE OR REPLACE FUNCTION award_xp(
  p_user_id     uuid,
  p_source_type text,
  p_source_id   text,
  p_xp_amount   int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_xp            int;
  v_new_xp            int;
  v_old_rank          int;
  v_new_rank          int;
  v_qualifying_days   int;
  v_daily_target      text;
  v_daily_target_xp   int;
  v_today_xp_before   int;
  v_today_xp_after    int;
  v_today             date := CURRENT_DATE;
  v_rows_inserted     int;
BEGIN
  -- Lock user row to serialize concurrent completions
  SELECT xp_total, rank_id, qualifying_days_total, daily_xp_target
  INTO v_old_xp, v_old_rank, v_qualifying_days, v_daily_target
  FROM users WHERE id = p_user_id FOR UPDATE;

  -- Query today's XP BEFORE inserting so the threshold comparison is correct
  SELECT COALESCE(SUM(xp_amount), 0) INTO v_today_xp_before
  FROM xp_events
  WHERE user_id = p_user_id
    AND created_at >= v_today
    AND created_at <  v_today + INTERVAL '1 day';

  -- Insert XP event; unique constraint on (user_id, source_id) makes this idempotent
  INSERT INTO xp_events (user_id, source_type, source_id, xp_amount)
  VALUES (p_user_id, p_source_type, p_source_id, p_xp_amount)
  ON CONFLICT (user_id, source_id) DO NOTHING;

  GET DIAGNOSTICS v_rows_inserted = ROW_COUNT;

  -- Duplicate award — return current state unchanged
  IF v_rows_inserted = 0 THEN
    RETURN jsonb_build_object(
      'new_xp',   v_old_xp,
      'old_rank', v_old_rank,
      'new_rank', v_old_rank
    );
  END IF;

  v_new_xp         := v_old_xp + p_xp_amount;
  v_today_xp_after := v_today_xp_before + p_xp_amount;

  -- Map daily_xp_target label to numeric threshold
  v_daily_target_xp := CASE v_daily_target
    WHEN 'casual'   THEN 20
    WHEN 'regular'  THEN 50
    WHEN 'active'   THEN 100
    WHEN 'hardcore' THEN 200
    ELSE 50
  END;

  -- Increment qualifying_days if daily target crossed for the first time today
  IF v_today_xp_before < v_daily_target_xp AND v_today_xp_after >= v_daily_target_xp THEN
    v_qualifying_days := v_qualifying_days + 1;
  END IF;

  -- Use both XP and qualifying_days so rank 10 is reachable
  v_new_rank := calculate_rank(v_new_xp, v_qualifying_days);

  UPDATE users SET
    xp_total              = v_new_xp,
    rank_id               = v_new_rank,
    qualifying_days_total = v_qualifying_days
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'new_xp',   v_new_xp,
    'old_rank', v_old_rank,
    'new_rank', v_new_rank
  );
END;
$$;

-- ─── 6. revoke_xp (use calculate_rank) ───────────────────────────────────────
CREATE OR REPLACE FUNCTION revoke_xp(
  p_user_id   uuid,
  p_source_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_xp_amount       int;
  v_old_xp          int;
  v_new_xp          int;
  v_old_rank        int;
  v_new_rank        int;
  v_qualifying_days int;
BEGIN
  -- Lock user row
  SELECT xp_total, rank_id, qualifying_days_total
  INTO v_old_xp, v_old_rank, v_qualifying_days
  FROM users WHERE id = p_user_id FOR UPDATE;

  -- Find and delete the event
  DELETE FROM xp_events
  WHERE user_id = p_user_id AND source_id = p_source_id
  RETURNING xp_amount INTO v_xp_amount;

  -- No event found — nothing to revoke
  IF v_xp_amount IS NULL THEN
    RETURN jsonb_build_object(
      'new_xp',   v_old_xp,
      'old_rank', v_old_rank,
      'new_rank', v_old_rank
    );
  END IF;

  v_new_xp   := GREATEST(0, v_old_xp - v_xp_amount);
  v_new_rank := calculate_rank(v_new_xp, v_qualifying_days);

  UPDATE users SET xp_total = v_new_xp, rank_id = v_new_rank
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'new_xp',   v_new_xp,
    'old_rank', v_old_rank,
    'new_rank', v_new_rank
  );
END;
$$;
