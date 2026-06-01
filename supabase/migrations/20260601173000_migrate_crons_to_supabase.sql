-- Migra os agendamentos de cron para o Supabase (pg_cron + pg_net) sem segredo hardcoded.
-- Requer criar um segredo no Vault com name='CRON_SECRET' contendo o mesmo valor usado pela API.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS vault;

DO $$
BEGIN
  -- Remove jobs legados para evitar duplicidade.
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'import-google-sheets-cron') THEN
    PERFORM cron.unschedule('import-google-sheets-cron');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'report-dispatch-cron') THEN
    PERFORM cron.unschedule('report-dispatch-cron');
  END IF;
END $$;

-- Importação horária de Google Sheets.
SELECT cron.schedule(
  'import-google-sheets-cron',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://dashboard-ads-s4x.vercel.app/api/cron/import-google-sheets',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (
        SELECT decrypted_secret
        FROM vault.decrypted_secrets
        WHERE name = 'CRON_SECRET'
        ORDER BY created_at DESC
        LIMIT 1
      )
    )
  );
  $$
);

-- Disparo diário da automação de relatórios (02:55 UTC = 23:55 America/Sao_Paulo em UTC-3).
SELECT cron.schedule(
  'report-dispatch-cron',
  '55 2 * * *',
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
    )
  );
  $$
);

