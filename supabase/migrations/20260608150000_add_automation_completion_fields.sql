-- Track the final execution result reported back from n8n after the workflow finishes.
ALTER TABLE public.dashboards
  ADD COLUMN IF NOT EXISTS automation_last_completed_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS automation_last_completion_status TEXT NULL,
  ADD COLUMN IF NOT EXISTS automation_last_completion_message TEXT NULL,
  ADD COLUMN IF NOT EXISTS automation_last_completion_details JSONB NULL;

COMMENT ON COLUMN public.dashboards.automation_last_completed_at IS 'Última conclusão final informada pelo n8n após terminar o workflow.';
COMMENT ON COLUMN public.dashboards.automation_last_completion_status IS 'Status final da automação após o workflow do n8n concluir (success, partial ou error).';
COMMENT ON COLUMN public.dashboards.automation_last_completion_message IS 'Mensagem final opcional retornada pelo n8n ao concluir a automação.';
COMMENT ON COLUMN public.dashboards.automation_last_completion_details IS 'Detalhes estruturados da última conclusão final da automação.';
