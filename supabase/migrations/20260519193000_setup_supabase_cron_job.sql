-- Habilita as extensões necessárias
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove o job antigo se existir para evitar duplicidade
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'cron' AND table_name = 'job'
  ) THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'import-google-sheets-cron') THEN
      PERFORM cron.unschedule('import-google-sheets-cron');
    END IF;
  END IF;
END $$;

-- Agenda a requisição HTTP POST para o endpoint da Vercel a cada hora
SELECT cron.schedule(
  'import-google-sheets-cron',
  '0 * * * *', -- Executa a cada hora cheia
  $$
  SELECT net.http_post(
    url := 'https://dashboard-ads-s4x.vercel.app/api/cron/import-google-sheets',
    headers := '{"Authorization": "Bearer d6tjM_P^=pSLe1JKXO]g\\yriDxH>Yzuk2o:9s7qnABf@vha;[RTI5FG8<EmQ0ZwC"}'::jsonb
  );
  $$
);
