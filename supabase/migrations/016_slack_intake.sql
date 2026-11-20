-- Slack intake: tag the Symphony bot on a client's Slack message to turn it
-- into a request (POST /api/slack/events).
--
--   slack_channels  which client a Slack channel belongs to. A client can have
--                   several channels (#interlude-<client>, #int-<client>);
--                   a channel belongs to exactly one client.
--   slack_intake    one row per bot mention. The (channel, message) primary key
--                   is the lock that stops a repeated Slack delivery, or two
--                   overlapping ones, from creating the same request twice.
--
-- Both tables are server-only, like the owner tables in 015: RLS is enabled
-- with NO policies and the anon/authenticated grants are revoked, so only the
-- service role (the API routes) can read or write them.

CREATE TABLE IF NOT EXISTS public.slack_channels (
  channel_id text PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  channel_name text,
  linked_by text,                          -- 'auto' (matched by name) or a Slack user id
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS slack_channels_client_id_idx ON public.slack_channels (client_id);

CREATE TABLE IF NOT EXISTS public.slack_intake (
  channel_id text NOT NULL,
  message_ts text NOT NULL,                -- the message that tagged the bot
  thread_ts text,                          -- the message the request was taken from
  slack_user_id text,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  request_id uuid REFERENCES public.requests(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'done', 'replied', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (channel_id, message_ts)
);

CREATE INDEX IF NOT EXISTS slack_intake_thread_idx ON public.slack_intake (channel_id, thread_ts);
CREATE INDEX IF NOT EXISTS slack_intake_request_id_idx ON public.slack_intake (request_id);
CREATE INDEX IF NOT EXISTS slack_intake_client_id_idx ON public.slack_intake (client_id);

ALTER TABLE public.slack_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slack_intake ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.slack_channels FROM anon, authenticated;
REVOKE ALL ON TABLE public.slack_intake FROM anon, authenticated;
