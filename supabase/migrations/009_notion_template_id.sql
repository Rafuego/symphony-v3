-- Symphony by Interlude - Migration 009
-- Adds Notion template page ID to clients for per-client template support
-- Run this in your Supabase SQL Editor AFTER migration 008

ALTER TABLE clients
ADD COLUMN IF NOT EXISTS notion_template_id TEXT;
