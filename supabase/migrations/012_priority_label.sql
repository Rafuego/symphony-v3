-- Add explicit priority label (High/Medium/Low) per request.
-- This is separate from `priority` which is the numeric queue position.

ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS priority_label text
    CHECK (priority_label IN ('high', 'medium', 'low') OR priority_label IS NULL);

COMMENT ON COLUMN public.requests.priority_label IS
  'High / Medium / Low label set by admin or client. Independent of queue position.';

-- Backfill from the Highrise/ARK bulk-import descriptions which include
-- the pattern "**Priority (from import):** High|Medium|Low".
UPDATE public.requests
   SET priority_label = 'high'
 WHERE priority_label IS NULL
   AND description ILIKE '%Priority (from import):** High%';

UPDATE public.requests
   SET priority_label = 'medium'
 WHERE priority_label IS NULL
   AND description ILIKE '%Priority (from import):** Medium%';

UPDATE public.requests
   SET priority_label = 'low'
 WHERE priority_label IS NULL
   AND description ILIKE '%Priority (from import):** Low%';
