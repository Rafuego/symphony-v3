-- Symphony by Interlude - Migration 012
-- Adds client account/profile fields surfaced in the redesigned Settings > Account tab
-- Run this in your Supabase SQL Editor AFTER migration 011
--
-- DATA-SAFE: additive only. No existing column is dropped or retyped.
-- The existing emoji `logo` column is left untouched; `logo_url` is added alongside it
-- so current portal headers that render {client.logo} keep working.

ALTER TABLE clients
ADD COLUMN IF NOT EXISTS website TEXT;

ALTER TABLE clients
ADD COLUMN IF NOT EXISTS description TEXT;

-- Point of contact: { name, title, email, phone }
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS point_of_contact JSONB DEFAULT '{}'::jsonb;

-- Uploaded logo image URL (keeps the existing emoji `logo` column intact)
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS logo_url TEXT;
