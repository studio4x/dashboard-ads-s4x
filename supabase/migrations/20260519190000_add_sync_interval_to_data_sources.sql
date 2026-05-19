-- Adiciona a coluna sync_interval na tabela data_sources para controlar a frequência da sincronização automática
ALTER TABLE public.data_sources 
ADD COLUMN IF NOT EXISTS sync_interval TEXT DEFAULT 'daily' 
CHECK (sync_interval IN ('manual', 'six_hours', 'twelve_hours', 'daily', 'weekly'));

-- Adiciona um comentário na coluna explicando o funcionamento
COMMENT ON COLUMN public.data_sources.sync_interval IS 'Intervalo de sincronização automática da fonte de dados (manual, six_hours, twelve_hours, daily, weekly)';
