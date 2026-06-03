-- Permite que dashboards armazenem qualquer template cadastrado no catálogo
-- incluindo templates customizados criados pelo admin.

ALTER TABLE public.dashboards
DROP CONSTRAINT IF EXISTS dashboards_dashboard_type_check;

COMMENT ON COLUMN public.dashboards.dashboard_type IS
'Identificador do template usado pelo dashboard. Pode apontar para templates do sistema ou templates customizados.';
