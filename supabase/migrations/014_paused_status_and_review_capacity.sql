-- 1. Widen the requests.status CHECK constraint to allow 'paused'.
--    (Original constraint only allowed the 4 original statuses; the app
--    now offers 'paused' from the status dropdown.)
ALTER TABLE public.requests
  DROP CONSTRAINT IF EXISTS requests_status_check;

ALTER TABLE public.requests
  ADD CONSTRAINT requests_status_check
  CHECK (status IN ('in-queue', 'in-progress', 'in-review', 'paused', 'completed'));

-- 2. Rewrite the auto-promote trigger so that ONLY 'in-progress' counts
--    against the client's plan-max-active capacity.
--    'in-review' means the designer is waiting on client feedback, and
--    'paused' means the client parked the task — neither should hold the
--    slot. Auto-promotion now fires whenever a task leaves 'in-progress'
--    (moves to review, paused, or completed) and there's a queued item.
CREATE OR REPLACE FUNCTION auto_promote_from_queue()
RETURNS TRIGGER AS $$
DECLARE
  v_client_id UUID;
  v_max_active INTEGER;
  v_active_count INTEGER;
  v_next_request UUID;
BEGIN
  -- Trigger when a task LEAVES 'in-progress' (was active, no longer is).
  IF OLD.status = 'in-progress' AND NEW.status <> 'in-progress' THEN
    v_client_id := NEW.client_id;

    SELECT COALESCE(custom_max_active,
      CASE plan
        WHEN 'launch' THEN 1
        WHEN 'growth' THEN 3
        WHEN 'scale'  THEN 5
      END
    ) INTO v_max_active
    FROM clients WHERE id = v_client_id;

    SELECT COUNT(*) INTO v_active_count
    FROM requests
    WHERE client_id = v_client_id
      AND status = 'in-progress';

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
