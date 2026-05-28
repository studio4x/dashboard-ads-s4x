-- Permite reutilizar o mesmo Google Sheets em múltiplos dashboards.
-- Remove restrições de unicidade em spreadsheet_id (quando existirem)
-- e mantém um índice não-único para consultas.

ALTER TABLE public.google_sheet_sources
  DROP CONSTRAINT IF EXISTS google_sheet_sources_spreadsheet_id_key;

DROP INDEX IF EXISTS public.google_sheet_sources_spreadsheet_id_key;
DROP INDEX IF EXISTS public.idx_google_sheet_sources_spreadsheet_id_unique;

CREATE INDEX IF NOT EXISTS idx_google_sheet_sources_spreadsheet_id
  ON public.google_sheet_sources(spreadsheet_id);
