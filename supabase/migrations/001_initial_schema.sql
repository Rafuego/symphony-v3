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
