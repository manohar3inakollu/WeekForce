-- Migration: Add difficulty and recurrence support
-- Run this in the Supabase SQL editor: https://supabase.com/dashboard/project/_/sql

-- 1. Add difficulty to tasks
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS difficulty TEXT NOT NULL DEFAULT 'medium'
    CHECK (difficulty IN ('easy', 'medium', 'hard', 'epic'));

-- 2. Add difficulty to goals
ALTER TABLE public.goals
  ADD COLUMN IF NOT EXISTS difficulty TEXT NOT NULL DEFAULT 'medium'
    CHECK (difficulty IN ('easy', 'medium', 'hard', 'epic'));

-- 3. Add recurrence to tasks
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS recurrence_type TEXT NOT NULL DEFAULT 'none'
    CHECK (recurrence_type IN ('none', 'daily', 'weekly', 'custom'));

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS recurrence_days TEXT[] DEFAULT NULL;
