-- Add Notion project page ID to clients table
-- This maps a Symphony client to a page in the Notion Projects database,
-- so the "Client" relation property gets filled correctly on task creation.
ALTER TABLE clients ADD COLUMN IF NOT EXISTS notion_project_id TEXT;
