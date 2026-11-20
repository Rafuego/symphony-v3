-- Owner-only account planning (/owner).
--
-- Two tables that only the server (service role) can touch:
--   owner_settings  one row holding the owner passcode hash + session signing secret
--   account_plans   the owner's keep / part-ways decision and note per client
--
-- RLS is enabled with NO policies and the anon/authenticated grants are revoked,
-- so nothing using the public anon key can read or write either table. Access
-- happens only through /api/owner/*, which checks the owner session cookie.

CREATE TABLE IF NOT EXISTS public.owner_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  passcode_hash text,
  session_secret text,
  failed_attempts integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.account_plans (
  client_id uuid PRIMARY KEY REFERENCES public.clients(id) ON DELETE CASCADE,
  decision text CHECK (decision IN ('keep', 'part')),
  note text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.owner_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_plans ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.owner_settings FROM anon, authenticated;
REVOKE ALL ON TABLE public.account_plans FROM anon, authenticated;
