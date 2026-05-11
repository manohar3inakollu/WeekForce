-- Migration: Fix xp_events source_id type + allow goal-less tasks
-- Run this in the Supabase SQL editor: https://supabase.com/dashboard/project/_/sql

-- 1. Change source_id from uuid to text so habit completions can use "taskId_dateStr"
ALTER TABLE public.xp_events
  ALTER COLUMN source_id TYPE TEXT USING source_id::TEXT;

-- 2. Allow tasks without a goal (habits don't always belong to a goal)
ALTER TABLE public.tasks
  ALTER COLUMN goal_id DROP NOT NULL;
