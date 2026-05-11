-- Migration: Add onboarded flag to users
-- Run in Supabase SQL editor: https://supabase.com/dashboard/project/_/sql

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS onboarded BOOLEAN NOT NULL DEFAULT FALSE;
