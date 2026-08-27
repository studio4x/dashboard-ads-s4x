# INTEGRATIONS_PLAN.md
## Plano de Integrações — Dashboard ADS S4X

### Fase 2 — Google Sheets API
- OAuth 2.0 Service Account
- Escopos: spreadsheets.readonly
- Rate limit: 100 requests/100s por usuário
- Cache: ISR de 1h (revalidateTag)

### Implementado — Google Ads API
- OAuth 2.0 Web com acesso offline e escopo `adwords`.
- Refresh token criptografado no Supabase Vault; Client Secret e Developer Token somente server-side.
- REST oficial Google Ads API `v25`, centralizada e configurável; `googleapis` é usado apenas no fluxo OAuth.
- Descoberta via `ListAccessibleCustomers`, hierarquia `customer_client`, MCC e `login-customer-id` separados do Customer ID alvo.
- GAQL para performance diária, campanhas, grupos, keywords, termos de pesquisa, negativas, anúncios e assets.
- Normalização compatível com `GoogleAdsS4XPayload`, incluindo IDs estáveis, `aiKey`, `metricsOrigin` e `isAggregatable`.
- Sincronização manual e automática por `pg_cron`, com reconsulta do período completo para evitar merge incorreto de coleções agregadas.
- Prioridade nativa por papel com fallback para Google Sheets e comparação administrativa de paridade.

### Implementado — Meta Marketing API
- OAuth com Facebook Login for Business e permissões somente leitura (`ads_read` e `business_management`).
- App ID e Login Configuration ID configuráveis no painel; App Secret somente na Vercel.
- Tokens OAuth criptografados no Supabase Vault.
- Descoberta de negócios, contas próprias, contas de clientes compartilhadas e contas acessíveis diretamente ao usuário.
- Insights diários no nível de anúncio, com histórico inicial e janela móvel de reprocessamento configuráveis.
- Sincronização manual e automática por `pg_cron`; Graph API configurável (`v26.0` por padrão).
- Payload compatível com os dashboards `meta_ads_s4x` e `google_meta_ads_s4x`.

### Fase 5 — Google Analytics Data API
- Service Account (mesma da Sheets)
- Escopos: analytics.readonly
- Reports: runReport (events, sessions, users)

### Fase 5 — Search Console API
- Service Account (mesma da Sheets)
- Escopos: webmasters.readonly
- Query: searchAnalytics.query

### Arquitetura de Conectores
- `src/lib/meta-marketing/*` e `src/services/meta-marketing-service.ts`
- OAuth e operações administrativas em `src/app/api/admin/meta/*`
- sincronização automática em `src/app/api/cron/sync-meta-ads`
- `src/lib/google-ads-api/*` e `src/services/google-ads-service.ts`
- src/connectors/ga4.ts
- src/connectors/search-console.ts
- src/connectors/google-sheets.ts
- Cada conector exporta: connect(), fetchData(), parseRows()
