-- ============================================================
-- Symphony by Interlude — All Database Migrations (Combined)
-- ============================================================
-- This file concatenates all migrations 001-011 in order.
-- For a fresh Supabase project, copy this entire file into the
-- SQL Editor and run it once.
--
-- For an existing Symphony project, run only the migrations
-- that haven't been applied yet (in numeric order).
--
-- If you get "relation X does not exist", prefix table names
-- with `public.`: e.g. `ALTER TABLE public.clients ...`
-- ============================================================

-- ========================================
-- 001_initial_schema.sql
-- ========================================
-- Symphony by Interlude - Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CLIENTS TABLE
-- ============================================
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo TEXT DEFAULT '🏢',
  plan TEXT NOT NULL DEFAULT 'growth' CHECK (plan IN ('launch', 'growth', 'scale')),
  
  -- Custom plan configuration
  custom_price INTEGER, -- in dollars, e.g., 3500
  custom_max_active INTEGER,
  custom_designers TEXT,
  
  -- Access control
  access_token UUID UNIQUE DEFAULT uuid_generate_v4(), -- For client portal links
  password_hash TEXT, -- bcrypt hashed password
  password_enabled BOOLEAN DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- REQUESTS TABLE
-- ============================================
CREATE TABLE requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'in-queue' CHECK (status IN ('in-queue', 'in-progress', 'in-review', 'completed')),
  priority INTEGER DEFAULT 1,
  
  -- Timestamps for timer
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Extension tracking
  extension_requested BOOLEAN DEFAULT false,
  extension_note TEXT,
  
  -- Admin notes
  admin_notes TEXT,
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- REQUEST FILES TABLE
-- ============================================
CREATE TABLE request_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  file_type TEXT DEFAULT 'file' CHECK (file_type IN ('figma', 'file')),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ADMIN USERS TABLE (for Supabase Auth)
-- ============================================
CREATE TABLE admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_clients_access_token ON clients(access_token);
CREATE INDEX idx_clients_slug ON clients(slug);
CREATE INDEX idx_requests_client_id ON requests(client_id);
CREATE INDEX idx_requests_status ON requests(status);
CREATE INDEX idx_request_files_request_id ON request_files(request_id);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Admin users can do everything
CREATE POLICY "Admins have full access to clients"
  ON clients FOR ALL
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  );

CREATE POLICY "Admins have full access to requests"
  ON requests FOR ALL
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  );

CREATE POLICY "Admins have full access to request_files"
  ON request_files FOR ALL
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  );

CREATE POLICY "Admins can view admin_users"
  ON admin_users FOR SELECT
  USING (id = auth.uid());

-- Service role bypass for API routes (using service_role key)
-- Note: Supabase service_role key bypasses RLS by default

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER requests_updated_at
  BEFORE UPDATE ON requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Function to auto-promote from queue when capacity available
CREATE OR REPLACE FUNCTION auto_promote_from_queue()
RETURNS TRIGGER AS $$
DECLARE
  v_client_id UUID;
  v_max_active INTEGER;
  v_active_count INTEGER;
  v_next_request UUID;
BEGIN
  -- Only run when a request is marked completed
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    v_client_id := NEW.client_id;
    
    -- Get max active for this client
    SELECT COALESCE(custom_max_active, 
      CASE plan 
        WHEN 'launch' THEN 1 
        WHEN 'growth' THEN 3 
        WHEN 'scale' THEN 5 
      END
    ) INTO v_max_active
    FROM clients WHERE id = v_client_id;
    
    -- Count current active requests
    SELECT COUNT(*) INTO v_active_count
    FROM requests
    WHERE client_id = v_client_id
    AND status IN ('in-progress', 'in-review');
    
    -- If we have capacity, promote the next queued item
    IF v_active_count < v_max_active THEN
      SELECT id INTO v_next_request
      FROM requests
      WHERE client_id = v_client_id
      AND status = 'in-queue'
      ORDER BY priority ASC, created_at ASC
      LIMIT 1;
      
      IF v_next_request IS NOT NULL THEN
        UPDATE requests
        SET status = 'in-progress', started_at = NOW()
        WHERE id = v_next_request;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_promote_trigger
  AFTER UPDATE ON requests
  FOR EACH ROW
  EXECUTE FUNCTION auto_promote_from_queue();

-- ============================================
-- SEED DATA (Optional - remove in production)
-- ============================================

-- Insert a sample client (uncomment to use)
-- INSERT INTO clients (name, slug, logo, plan, custom_price, custom_max_active, custom_designers)
-- VALUES ('Raspberry AI', 'raspberry-ai', '🍓', 'growth', 3500, 3, '2');

-- ========================================
-- 002_add_request_type_and_links.sql
-- ========================================
-- Symphony by Interlude - Migration 002
-- Adds request_type, links, attachments, and extension_hours fields to requests table
-- Run this in your Supabase SQL Editor AFTER the initial schema

-- Add request_type column
ALTER TABLE requests 
ADD COLUMN IF NOT EXISTS request_type TEXT DEFAULT 'misc' 
CHECK (request_type IN ('brand', 'site', 'deck', 'product', 'marketing', 'misc'));

-- Add links column (stores JSON array of links)
ALTER TABLE requests 
ADD COLUMN IF NOT EXISTS links JSONB DEFAULT '[]'::jsonb;

-- Add attachments column (stores JSON array of uploaded files)
ALTER TABLE requests 
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Add extension_hours column (total hours of extensions added)
ALTER TABLE requests 
ADD COLUMN IF NOT EXISTS extension_hours INTEGER DEFAULT 0;

-- Update the index for filtering by type
CREATE INDEX IF NOT EXISTS idx_requests_type ON requests(request_type);

-- ========================================
-- 003_notifications.sql
-- ========================================
-- Symphony by Interlude - Migration 003
-- Adds notifications table for admin alerts
-- Run this in your Supabase SQL Editor AFTER migrations 001 and 002

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('new_request', 'status_change', 'extension_request', 'client_created')),
  title TEXT NOT NULL,
  message TEXT,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  request_id UUID REFERENCES requests(id) ON DELETE CASCADE,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations for service role (admin)
CREATE POLICY "Service role full access to notifications" ON notifications
  FOR ALL USING (true);

-- ========================================
-- 004_brand_assets_deliverables.sql
-- ========================================
-- Symphony by Interlude - Migration 004
-- Adds brand_assets to clients and deliverables to requests
-- Run this in your Supabase SQL Editor

-- Add brand_assets column to clients (for logos, fonts, guidelines, etc.)
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS brand_assets JSONB DEFAULT '[]'::jsonb;

-- Add deliverables column to requests (for final files after completion)
ALTER TABLE requests 
ADD COLUMN IF NOT EXISTS deliverables JSONB DEFAULT '[]'::jsonb;

-- ========================================
-- 005_notion_integration.sql
-- ========================================
-- Symphony by Interlude - Migration 005
-- Adds Notion integration fields to clients and requests
-- Run this in your Supabase SQL Editor AFTER migration 004

-- Store the Notion database ID that this client's requests sync to
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS notion_database_id TEXT;

-- Store the Notion page ID created for each request (enables updates)
ALTER TABLE requests
ADD COLUMN IF NOT EXISTS notion_page_id TEXT;

-- ========================================
-- 006_notion_project_id.sql
-- ========================================
-- Add Notion project page ID to clients table
-- This maps a Symphony client to a page in the Notion Projects database,
-- so the "Client" relation property gets filled correctly on task creation.
ALTER TABLE clients ADD COLUMN IF NOT EXISTS notion_project_id TEXT;

-- ========================================
-- 007_client_tag.sql
-- ========================================
-- Add client_tag to distinguish Legacy Drip vs Symphony clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS client_tag TEXT;

-- ========================================
-- 008_pending_deals.sql
-- ========================================
-- Pending deals table for tracking prospects not yet closed
CREATE TABLE IF NOT EXISTS pending_deals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  plan TEXT DEFAULT 'growth',
  estimated_price INTEGER,
  notes TEXT,
  status TEXT DEFAULT 'lead',  -- lead, proposal, negotiation, verbal
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 009_notion_template_id.sql
-- ========================================
-- Symphony by Interlude - Migration 009
-- Adds Notion template page ID to clients for per-client template support
-- Run this in your Supabase SQL Editor AFTER migration 008

ALTER TABLE clients
ADD COLUMN IF NOT EXISTS notion_template_id TEXT;

-- ========================================
-- 010_requested_due_date.sql
-- ========================================
-- Symphony by Interlude - Migration 010
-- Adds tentative/requested due date to requests
-- Run this in your Supabase SQL Editor AFTER migration 009

ALTER TABLE requests
ADD COLUMN IF NOT EXISTS requested_due_date DATE;

-- ========================================
-- 011_client_status.sql
-- ========================================
-- Symphony by Interlude - Migration 011
-- Adds client_status to support pausing clients
-- Run this in your Supabase SQL Editor AFTER migration 010

ALTER TABLE clients
ADD COLUMN IF NOT EXISTS client_status TEXT DEFAULT 'active';

-- Possible values: 'active', 'paused'
-- Paused clients are hidden from the main Clients tab and excluded from MRR

-- ========================================
-- 012_client_account_fields.sql
-- ========================================
-- Symphony by Interlude - Migration 012
-- Adds client account/profile fields surfaced in the redesigned Settings > Account tab
-- Run this in your Supabase SQL Editor AFTER migration 011
--
-- DATA-SAFE: additive only. No existing column is dropped or retyped.
-- The existing emoji `logo` column is left untouched; `logo_url` is added alongside it.

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

-- ========================================
-- 013_request_updates.sql
-- ========================================
-- Symphony by Interlude - Migration 013
-- Adds the Request Detail Drawer's "Updates" feed + request assignment, and widens the
-- request_type CHECK to allow the new 'animation' type.
-- Run this in your Supabase SQL Editor AFTER migration 012
--
-- DATA-SAFE: additive only. No rows are rewritten. The request_type CHECK is WIDENED
-- (all 6 existing ids kept, 'animation' added). New tables are independent.
--
-- NOTE before running on production: confirm the live constraint name is
-- 'requests_request_type_check' (run: \d requests). If it differs, the DROP below
-- silently no-ops and the ADD will collide with the old constraint.

ALTER TABLE requests DROP CONSTRAINT IF EXISTS requests_request_type_check;
ALTER TABLE requests ADD CONSTRAINT requests_request_type_check
  CHECK (request_type IN ('brand', 'site', 'deck', 'product', 'marketing', 'misc', 'animation'));

ALTER TABLE requests ADD COLUMN IF NOT EXISTS assignee_name TEXT;
ALTER TABLE requests ADD COLUMN IF NOT EXISTS assignee_id UUID;

CREATE TABLE IF NOT EXISTS request_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'comment'
    CHECK (kind IN ('comment', 'new_requirement', 'changes', 'system')),
  event_type TEXT
    CHECK (event_type IN ('created', 'status_changed', 'assigned', 'file_uploaded', 'file_removed')),
  event_meta JSONB DEFAULT '{}'::jsonb,
  author_type TEXT NOT NULL DEFAULT 'system'
    CHECK (author_type IN ('client', 'admin', 'system')),
  author_name TEXT,
  author_id UUID,
  body TEXT,
  links JSONB DEFAULT '[]'::jsonb,
  files JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_request_updates_request_id
  ON request_updates(request_id, created_at DESC);

CREATE TABLE IF NOT EXISTS request_update_reads (
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  viewer_side TEXT NOT NULL CHECK (viewer_side IN ('client', 'admin')),
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (request_id, viewer_side)
);

