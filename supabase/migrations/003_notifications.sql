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
