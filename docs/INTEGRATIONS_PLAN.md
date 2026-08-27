# INTEGRATIONS_PLAN.md
## Plano de Integrações — Dashboard ADS S4X

### Fase 2 — Google Sheets API
- OAuth 2.0 Service Account
- Escopos: spreadsheets.readonly
- Rate limit: 100 requests/100s por usuário
- Cache: ISR de 1h (revalidateTag)

### Fase 5 — Google Ads API
- OAuth 2.0 + Developer Token
- Biblioteca: google-ads-api (npm)
- Reports: campaigns, ad_groups, keywords, search_terms

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
- src/connectors/google-ads.ts
- src/connectors/ga4.ts
- src/connectors/search-console.ts
- src/connectors/google-sheets.ts
- Cada conector exporta: connect(), fetchData(), parseRows()
