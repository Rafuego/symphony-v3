-- Symphony by Interlude - Migration 010
-- Adds tentative/requested due date to requests
-- Run this in your Supabase SQL Editor AFTER migration 009

ALTER TABLE requests
ADD COLUMN IF NOT EXISTS requested_due_date DATE;
