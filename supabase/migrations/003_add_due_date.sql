-- Symphony by Interlude - Migration 003
-- Adds due_date field to requests table for custom deadlines
-- Run this in your Supabase SQL Editor AFTER migration 002

-- Add due_date column (optional custom deadline set by admin/client)
ALTER TABLE requests
ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;

-- Create index for filtering/sorting by due date
CREATE INDEX IF NOT EXISTS idx_requests_due_date ON requests(due_date);
