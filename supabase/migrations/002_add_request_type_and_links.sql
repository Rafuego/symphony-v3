-- Symphony by Interlude - Migration 002
-- Adds request_type, links, and attachments fields to requests table
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

-- Update the index for filtering by type
CREATE INDEX IF NOT EXISTS idx_requests_type ON requests(request_type);
