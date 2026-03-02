-- Symphony by Interlude - Migration 005
-- Adds Notion integration fields to clients and requests
-- Run this in your Supabase SQL Editor AFTER migration 004

-- Store the Notion database ID that this client's requests sync to
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS notion_database_id TEXT;

-- Store the Notion page ID created for each request (enables updates)
ALTER TABLE requests
ADD COLUMN IF NOT EXISTS notion_page_id TEXT;
