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
