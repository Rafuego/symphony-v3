-- Symphony by Interlude - Migration 013
-- Adds the Request Detail Drawer's "Updates" feed + request assignment, and widens the
-- request_type CHECK to allow the new 'animation' type.
-- Run this in your Supabase SQL Editor AFTER migration 012
--
-- DATA-SAFE: additive only. No rows are rewritten.
--   - The request_type CHECK is WIDENED (all 6 existing ids kept, 'animation' added).
--   - New columns are nullable; new tables are independent (not auto-joined by the app).
--
-- NOTE before running on production: confirm the live constraint name is
-- 'requests_request_type_check' (run: \d requests). If it differs, the DROP below
-- silently no-ops and the ADD will collide with the old constraint.

-- ============================================
-- 1. Widen request_type to allow 'animation'
-- ============================================
ALTER TABLE requests DROP CONSTRAINT IF EXISTS requests_request_type_check;
ALTER TABLE requests ADD CONSTRAINT requests_request_type_check
  CHECK (request_type IN ('brand', 'site', 'deck', 'product', 'marketing', 'misc', 'animation'));

-- ============================================
-- 2. Request assignment (designer)
-- ============================================
-- Denormalized snapshot — no per-client user table exists, so we store a display name.
-- assignee_id is nullable and reserved for a future link to admin_users.
ALTER TABLE requests ADD COLUMN IF NOT EXISTS assignee_name TEXT;
ALTER TABLE requests ADD COLUMN IF NOT EXISTS assignee_id UUID;

-- ============================================
-- 3. Updates feed (threaded activity log per request)
-- ============================================
-- Mixes typed user posts (comment / new_requirement / changes) and system events
-- (created / status_changed / assigned / file_uploaded / file_removed).
-- Author is attributed via a denormalized snapshot (no client-user identity exists).
CREATE TABLE IF NOT EXISTS request_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,

  -- Discriminator for the kind of entry
  kind TEXT NOT NULL DEFAULT 'comment'
    CHECK (kind IN ('comment', 'new_requirement', 'changes', 'system')),

  -- Populated only for kind = 'system'
  event_type TEXT
    CHECK (event_type IN ('created', 'status_changed', 'assigned', 'file_uploaded', 'file_removed')),
  event_meta JSONB DEFAULT '{}'::jsonb, -- e.g. { from, to, assignee, file, target }

  -- Author snapshot (no dependency on a user table)
  author_type TEXT NOT NULL DEFAULT 'system'
    CHECK (author_type IN ('client', 'admin', 'system')),
  author_name TEXT,
  author_id UUID, -- nullable, optional future link to admin_users

  -- Body + attached content for typed posts
  body TEXT,
  links JSONB DEFAULT '[]'::jsonb,
  files JSONB DEFAULT '[]'::jsonb, -- [{ name, url, type, size }]

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_request_updates_request_id
  ON request_updates(request_id, created_at DESC);

-- ============================================
-- 4. Read / unread tracking (per request, per side)
-- ============================================
-- There is no per-user identity (clients share a portal password), so read state is
-- tracked per request per viewer side. An update is "unread" for a side when its
-- created_at is later than that side's last_read_at for the request.
CREATE TABLE IF NOT EXISTS request_update_reads (
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  viewer_side TEXT NOT NULL CHECK (viewer_side IN ('client', 'admin')),
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (request_id, viewer_side)
);
