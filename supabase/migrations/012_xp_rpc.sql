-- Helper: calculate rank from XP total (mirrors constants/xp.ts calcRankFromXP)
CREATE OR REPLACE FUNCTION calculate_rank_from_xp(p_xp int)
RETURNS int
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p_xp >= 91400 THEN 25
    WHEN p_xp >= 63900 THEN 24
    WHEN p_xp >= 63500 THEN 23
    WHEN p_xp >= 58500 THEN 22
    WHEN p_xp >= 53000 THEN 21
    WHEN p_xp >= 47500 THEN 20
    WHEN p_xp >= 42500 THEN 19
    WHEN p_xp >= 38000 THEN 18
    WHEN p_xp >= 34500 THEN 17
    WHEN p_xp >= 31500 THEN 16
    WHEN p_xp >= 29000 THEN 15
    WHEN p_xp >= 27400 THEN 14
    WHEN p_xp >= 23750 THEN 13
    WHEN p_xp >= 18000 THEN 12
    WHEN p_xp >= 12650 THEN 11
    WHEN p_xp >= 9150  THEN 9
    WHEN p_xp >= 4950  THEN 8
    WHEN p_xp >= 4400  THEN 7
    WHEN p_xp >= 3650  THEN 6
    WHEN p_xp >= 2750  THEN 5
    WHEN p_xp >= 2000  THEN 4
    WHEN p_xp >= 1100  THEN 3
    WHEN p_xp >= 450   THEN 2
    ELSE 1
  END
$$;

-- Atomically award XP: inserts event, updates xp_total + rank_id, increments
-- qualifying_days_total if today's XP crosses the user's daily target.
-- Uses FOR UPDATE to prevent concurrent writes clobbering each other.
-- Returns { new_xp, old_rank, new_rank }.
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
BEGIN
  -- Lock user row to serialize concurrent completions
  SELECT xp_total, rank_id, qualifying_days_total, daily_xp_target
  INTO v_old_xp, v_old_rank, v_qualifying_days, v_daily_target
  FROM users WHERE id = p_user_id FOR UPDATE;

  -- Insert XP event (idempotent if unique index on (user_id, source_id) exists)
  INSERT INTO xp_events (user_id, source_type, source_id, xp_amount)
  VALUES (p_user_id, p_source_type, p_source_id, p_xp_amount)
  ON CONFLICT DO NOTHING;

  v_new_xp := v_old_xp + p_xp_amount;
  v_new_rank := calculate_rank_from_xp(v_new_xp);

  -- Map daily_xp_target to numeric threshold
  v_daily_target_xp := CASE v_daily_target
    WHEN 'casual'   THEN 20
    WHEN 'regular'  THEN 50
    WHEN 'active'   THEN 100
    WHEN 'hardcore' THEN 200
    ELSE 50
  END;

  -- Today's XP before and after this event
  SELECT COALESCE(SUM(xp_amount), 0) INTO v_today_xp_before
  FROM xp_events
  WHERE user_id = p_user_id
    AND created_at >= v_today
    AND created_at <  v_today + INTERVAL '1 day';

  v_today_xp_after := v_today_xp_before + p_xp_amount;

  -- Increment qualifying_days if daily target was just crossed for the first time today
  IF v_today_xp_before < v_daily_target_xp AND v_today_xp_after >= v_daily_target_xp THEN
    v_qualifying_days := v_qualifying_days + 1;
  END IF;

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

-- Atomically revoke XP: deletes the event by source_id, subtracts XP, recalculates rank.
-- Returns { new_xp, old_rank, new_rank }.
CREATE OR REPLACE FUNCTION revoke_xp(
  p_user_id   uuid,
  p_source_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_xp_amount   int;
  v_old_xp      int;
  v_new_xp      int;
  v_old_rank    int;
  v_new_rank    int;
BEGIN
  -- Lock user row
  SELECT xp_total, rank_id INTO v_old_xp, v_old_rank
  FROM users WHERE id = p_user_id FOR UPDATE;

  -- Find and delete the event
  DELETE FROM xp_events
  WHERE user_id = p_user_id AND source_id = p_source_id
  RETURNING xp_amount INTO v_xp_amount;

  -- If no event found, nothing to revoke
  IF v_xp_amount IS NULL THEN
    RETURN jsonb_build_object('new_xp', v_old_xp, 'old_rank', v_old_rank, 'new_rank', v_old_rank);
  END IF;

  v_new_xp   := GREATEST(0, v_old_xp - v_xp_amount);
  v_new_rank := calculate_rank_from_xp(v_new_xp);

  UPDATE users SET xp_total = v_new_xp, rank_id = v_new_rank
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'new_xp',   v_new_xp,
    'old_rank', v_old_rank,
    'new_rank', v_new_rank
  );
END;
$$;
