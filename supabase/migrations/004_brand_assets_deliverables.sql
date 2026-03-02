-- Symphony by Interlude - Migration 004
-- Adds brand_assets to clients and deliverables to requests
-- Run this in your Supabase SQL Editor

-- Add brand_assets column to clients (for logos, fonts, guidelines, etc.)
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS brand_assets JSONB DEFAULT '[]'::jsonb;

-- Add deliverables column to requests (for final files after completion)
ALTER TABLE requests 
ADD COLUMN IF NOT EXISTS deliverables JSONB DEFAULT '[]'::jsonb;
