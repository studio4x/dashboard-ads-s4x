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

### Fase 5 — Meta Marketing API
- App ID + App Secret + Access Token
- Versão: v19.0+
- Insights: campaigns, adsets, ads

### Fase 5 — Google Analytics Data API
- Service Account (mesma da Sheets)
- Escopos: analytics.readonly
- Reports: runReport (events, sessions, users)

### Fase 5 — Search Console API
- Service Account (mesma da Sheets)
- Escopos: webmasters.readonly
- Query: searchAnalytics.query

### Arquitetura de Conectores
- src/connectors/google-ads.ts
- src/connectors/meta-ads.ts
- src/connectors/ga4.ts
- src/connectors/search-console.ts
- src/connectors/google-sheets.ts
- Cada conector exporta: connect(), fetchData(), parseRows()
