# Google Ads API — base analítica histórica

## Fluxo encontrado

O conector nativo é server-side e reutiliza `google_ads_connections`, `google_ads_sources` e `data_sources`. O OAuth guarda o refresh token no Vault; `GoogleAdsRestClient` consulta a API REST na versão configurada; `GoogleAdsService.syncSource` normaliza os dados para `google_ads_s4x_v1`, grava o snapshot em `dashboard_data_snapshots` e atualiza `import_logs`. A escolha da fonte nativa continua sendo feita pelo mecanismo de prioridade existente, mantendo Google Sheets como fallback.

## Arquitetura nova

Além do snapshot compatível com as páginas atuais, cada sincronização Google Ads grava fatos em `google_ads_analytics_rows`. A tabela usa uma chave determinística `data_source_id + dataset + row_key`, preserva `metrics` brutas, `derived_metrics`, dimensões e o `raw_row` retornado pela API. Assim, uma reimportação com conversion lag atualiza a mesma linha, enquanto novas datas e dimensões permanecem históricas.

`google_ads_config_history` guarda snapshots observados de conversões, metas, orçamentos, bidding e Quality Score. Quality Score é marcado pela data de observação; nunca é projetado retroativamente nos dias anteriores.

`google_ads_change_events` mantém permanentemente o `change_event.resource_name` com unique por fonte/customer, além de campos alterados, valores antigo/novo, tipo de recurso, operação, origem e usuário quando a API os fornece. `google_ads_analytics_runs` registra sucesso, erro, sem dados e não aplicável por dataset.

Consulta administrativa: `GET /api/admin/google-ads/sources/{id}/analytics`. Aceita `dataset`, `from`, `to`, `campaign_id`, `ad_group_id`, `device`, `network` e `limit`. `dataset=change_events` consulta a tabela de eventos; nenhuma dessas tabelas é usada por fontes Google Sheets.

## Datasets e estratégia

As consultas são independentes: campanha/granularidade diária, grupo, keyword, termos Search, termos PMax, anúncio, assets, asset groups PMax, dispositivo, rede, data/hora, localização, landing page, ação de conversão, placements, Shopping e dimensões demográficas. Queries PMax, Shopping e placements são executadas somente quando os tipos de campanha encontrados indicam aplicabilidade. Falhas secundárias viram warning/status do dataset e não descartam o snapshot principal.

O período de performance usa `history_days` na primeira sincronização e `lookback_days` na configuração operacional para a janela móvel futura. Na implementação atual o fato histórico é feito por upsert de toda a janela calculada, o que também corrige conversões atrasadas. Change Events usa overlap de segurança dentro da janela máxima da API e `LIMIT 10000`; a API oficial exige filtro temporal em janela de até 30 dias. A deduplicação própria torna a execução repetida idempotente.

## Compatibilidade v25

Os campos são separados por resource. A lista de métricas comuns é usada apenas em recursos cuja matriz v25 as expõe juntas; shares de Search, métricas de landing page e métricas de vídeo/display ficam em queries próprias ou condicionais. A API não fornece, no exemplo oficial de `change_event`, campos independentes `change_event.campaign`, `change_event.ad_group` ou `change_event.asset`; esses identificadores são derivados de `change_resource_name` quando o tipo permite, e os payloads antigo/novo permanecem preservados.

Quando uma conta não expõe um resource ou campo compatível, a consulta é registrada como `error`/`unsupported` no diagnóstico e o restante continua. Zero linhas é `no_data`, não erro.
