-- Add client_tag to distinguish Legacy Drip vs Symphony clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS client_tag TEXT;
