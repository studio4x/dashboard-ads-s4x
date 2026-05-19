-- Atualiza a check constraint na tabela data_sources para aceitar o intervalo 'one_hour'
ALTER TABLE public.data_sources 
DROP CONSTRAINT IF EXISTS data_sources_sync_interval_check;

ALTER TABLE public.data_sources
ADD CONSTRAINT data_sources_sync_interval_check 
CHECK (sync_interval IN ('manual', 'one_hour', 'six_hours', 'twelve_hours', 'daily', 'weekly'));
