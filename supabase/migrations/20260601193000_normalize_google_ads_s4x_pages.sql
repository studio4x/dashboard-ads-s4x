-- Normaliza páginas do template Google Ads S4X para manter consistência entre criação e renderização.

WITH target_dashboards AS (
  SELECT id
  FROM public.dashboards
  WHERE dashboard_type = 'google_ads_s4x'
),
expected_pages AS (
  SELECT *
  FROM (
    VALUES
      ('executive-summary', 'Resumo Executivo', 10),
      ('campaigns', 'Campanhas', 20),
      ('ad-groups', 'Grupos de Anúncio', 30),
      ('keywords', 'Palavras-chave', 40),
      ('search-terms', 'Termos de Pesquisa', 50),
      ('ads-assets', 'Anúncios e Recursos', 60),
      ('negative-keywords', 'Palavras-chave Negativas', 70)
  ) AS t(page_key, title, sort_order)
)
INSERT INTO public.dashboard_pages (dashboard_id, page_key, title, sort_order, is_enabled)
SELECT d.id, p.page_key, p.title, p.sort_order, true
FROM target_dashboards d
CROSS JOIN expected_pages p
ON CONFLICT (dashboard_id, page_key)
DO UPDATE SET
  title = EXCLUDED.title,
  sort_order = EXCLUDED.sort_order,
  is_enabled = true;

-- Remove página legado que não faz parte do template Google Ads S4X atual.
DELETE FROM public.dashboard_pages dp
USING public.dashboards d
WHERE dp.dashboard_id = d.id
  AND d.dashboard_type = 'google_ads_s4x'
  AND dp.page_key = 'google-ads';

