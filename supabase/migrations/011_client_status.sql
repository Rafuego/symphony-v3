-- Symphony by Interlude - Migration 011
-- Adds client_status to support pausing clients
-- Run this in your Supabase SQL Editor AFTER migration 010

ALTER TABLE clients
ADD COLUMN IF NOT EXISTS client_status TEXT DEFAULT 'active';

-- Possible values: 'active', 'paused'
-- Paused clients are hidden from the main Clients tab and excluded from MRR
