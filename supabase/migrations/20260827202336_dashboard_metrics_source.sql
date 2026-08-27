-- Define qual fonte conectada fornece as métricas atuais de cada dashboard.
-- A seleção é opcional para preservar dashboards sem fontes durante a migração.
ALTER TABLE public.dashboards
  ADD COLUMN IF NOT EXISTS metrics_source_id UUID
    REFERENCES public.data_sources(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_dashboards_metrics_source_id
  ON public.dashboards(metrics_source_id);

-- Mantém como fonte selecionada aquela que já alimentava o dashboard antes
-- deste controle existir, escolhendo o snapshot mais recente.
UPDATE public.dashboards AS dashboard
SET metrics_source_id = (
  SELECT snapshot.data_source_id
  FROM public.dashboard_data_snapshots AS snapshot
  WHERE snapshot.dashboard_id = dashboard.id
    AND snapshot.data_source_id IS NOT NULL
  ORDER BY COALESCE(snapshot.imported_at, snapshot.created_at) DESC, snapshot.created_at DESC
  LIMIT 1
)
WHERE dashboard.metrics_source_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.dashboard_data_snapshots AS snapshot
    WHERE snapshot.dashboard_id = dashboard.id
      AND snapshot.data_source_id IS NOT NULL
  );

COMMENT ON COLUMN public.dashboards.metrics_source_id IS
  'Fonte conectada selecionada para fornecer as métricas do dashboard.';
