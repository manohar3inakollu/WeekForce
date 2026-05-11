-- Migration: Per-date completion tracking for recurring tasks
-- Run this in the Supabase SQL editor: https://supabase.com/dashboard/project/_/sql

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS completed_dates TEXT[] DEFAULT '{}';
