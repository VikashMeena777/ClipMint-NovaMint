-- ============================================================================
-- ClipMint — Notification Settings Migration
-- ============================================================================
-- Add notification preference columns to profiles table.
-- Run this in Supabase SQL Editor.
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notify_email BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_discord BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_job_complete BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_job_failed BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_weekly_report BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS discord_webhook_url TEXT;
