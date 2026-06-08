-- Ajusta o cron de disparo de relatórios para rodar com frequência suficiente
-- para capturar janelas configuradas no mesmo dia, como 14:00.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'report-dispatch-cron') THEN
    PERFORM cron.unschedule('report-dispatch-cron');
  END IF;
END $$;

-- Executa a cada 5 minutos, deixando a regra de "devido" no backend decidir
-- quais dashboards realmente devem disparar.
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
    )
  );
  $$
);
