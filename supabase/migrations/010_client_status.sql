-- Symphony by Interlude - Migration 010
-- Adds client_status to distinguish active, paused, and ended clients
-- Run this in your Supabase SQL Editor AFTER migration 009

ALTER TABLE clients
ADD COLUMN IF NOT EXISTS client_status TEXT DEFAULT NULL;

-- NULL or 'active' = active, 'paused' = paused, 'ended' = ended
