-- Evita que o pg_net encerre o processamento do dispatch antes de a API
-- concluir geração de análise, PDF e envio ao n8n.

CREATE TABLE IF NOT EXISTS public.automation_cron_locks (
  lock_name text PRIMARY KEY,
  lock_token text,
  locked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.automation_cron_locks (lock_name)
VALUES ('report-dispatch')
ON CONFLICT (lock_name) DO NOTHING;

ALTER TABLE public.automation_cron_locks ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.acquire_automation_cron_lock(
  p_lock_name text,
  p_ttl_seconds integer DEFAULT 330
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lock_token text;
BEGIN
  IF p_ttl_seconds < 30 OR p_ttl_seconds > 3600 THEN
    RAISE EXCEPTION 'Invalid lock TTL';
  END IF;

  WITH claimed AS (
    UPDATE public.automation_cron_locks
    SET lock_token = gen_random_uuid()::text,
        locked_until = now() + make_interval(secs => p_ttl_seconds),
        updated_at = now()
    WHERE lock_name = p_lock_name
      AND (locked_until IS NULL OR locked_until < now())
    RETURNING lock_token
  )
  SELECT lock_token INTO v_lock_token FROM claimed;

  RETURN v_lock_token;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_automation_cron_lock(
  p_lock_name text,
  p_lock_token text
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.automation_cron_locks
  SET lock_token = NULL,
      locked_until = NULL,
      updated_at = now()
  WHERE lock_name = p_lock_name
    AND lock_token = p_lock_token;
$$;

REVOKE ALL ON FUNCTION public.acquire_automation_cron_lock(text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_automation_cron_lock(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_automation_cron_lock(text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_automation_cron_lock(text, text) TO service_role;

-- Recria somente o job de relatórios, preservando a frequência atual e
-- tornando o timeout explícito (o default do pg_net é 5000 ms).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'report-dispatch-cron') THEN
    PERFORM cron.unschedule('report-dispatch-cron');
  END IF;
END $$;

SELECT cron.schedule(
  'report-dispatch-cron',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://dashboard-ads-s4x.vercel.app/api/cron/report-dispatch',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (
        SELECT decrypted_secret
        FROM vault.decrypted_secrets
        WHERE name = 'CRON_SECRET'
        ORDER BY created_at DESC
        LIMIT 1
      )
    ),
    timeout_milliseconds := 300000
  );
  $$
);
