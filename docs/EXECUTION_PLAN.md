# EXECUTION_PLAN.md
## Plano de Execução — Dashboard ADS S4X

---

## Visão das Fases

| Fase | Escopo | Prazo Estimado | Status |
|------|--------|----------------|--------|
| **Fase 1** | Fundação visual + mocks | Concluída | ✅ |
| **Fase 2** | Conexão real Google Sheets API | A definir | 🔒 |
| **Fase 3** | Autenticação Supabase + multi-usuário | A definir | 🔒 |
| **Fase 4** | Banco de dados Supabase + CRUD real | A definir | 🔒 |
| **Fase 5** | Integrações diretas (Google Ads, Meta, GA4, SC) | A definir | 🔒 |

---

## Fase 1 — Concluída ✅

### Entregáveis
- [x] Projeto Next.js com App Router + TypeScript + Tailwind v4
- [x] Dependências: recharts, lucide-react, date-fns, clsx, tailwind-merge
- [x] Sistema de design: globals.css com variáveis CSS e utilitários
- [x] Tipos TypeScript: sheet-rows.ts, data-sources.ts, entities.ts
- [x] Dados mock: 10 arquivos simulando abas do Google Sheets
- [x] Biblioteca: utils.ts, formatters.ts, constants.ts
- [x] Componentes dashboard: MetricCard, ChartCard, LineChartWidget, BarChartWidget, DonutChartWidget, DataTableWidget, InsightCard, DashboardTabs, DashboardHeader, DashboardPageShell
- [x] Componentes admin: AdminSidebar, ImportStatusBadge, GoogleSheetSourceCard
- [x] Rotas públicas: /, /login
- [x] Rotas cliente: /app/dashboards, /app/dashboards/[id]/executive-summary, google-ads, meta-ads, conversions, audience, search-console
- [x] Rotas admin: /admin, /admin/clients, /admin/dashboards, /admin/data-sources, /admin/google-sheets, /admin/templates, /admin/import-logs, /admin/settings
- [x] Documentação /docs: 12 arquivos

---

## Fase 2 — Conexão Google Sheets API

### Escopo
- Configurar Google Cloud Project + Service Account
- Implementar cliente da Google Sheets API no servidor (Next.js Server Actions ou Route Handlers)
- Substituir mocks pelos dados reais da planilha
- Adicionar cache com revalidação por tempo (ISR)
- Implementar campo de spreadsheet_id por cliente no admin
- Implementar sync manual e agendado

### Arquivos a criar/modificar
- `src/lib/google-sheets.ts` — cliente da API
- `src/lib/sheet-parser.ts` — parser de abas → tipos TypeScript
- `src/app/api/sync/route.ts` — endpoint de sincronização
- `src/app/admin/google-sheets/page.tsx` — UI de vinculação real
- Adicionar env vars: `GOOGLE_SERVICE_ACCOUNT_KEY`, `GOOGLE_SHEETS_SCOPE`

---

## Fase 3 — Autenticação Supabase

### Escopo
- Configurar projeto Supabase
- Implementar Auth com email/senha e magic link
- Criar middleware de proteção de rotas
- Implementar área pública × cliente × admin
- Criar sistema de convite de usuário por cliente

### Arquivos a criar/modificar
- `src/middleware.ts` — proteção de rotas
- `src/lib/supabase/client.ts` e `server.ts`
- `src/app/login/page.tsx` — auth real
- `src/app/admin/users/` — gerenciamento de usuários

---

## Fase 4 — Banco de Dados Supabase

### Escopo
- Criar schema PostgreSQL (ver DATABASE.md)
- Migrar mocks para tabelas reais
- Implementar CRUD de clientes, dashboards e fontes
- Implementar logs de importação reais
- Adicionar storage para logos de clientes

### Migrations a criar
- `clients`, `dashboards`, `dashboard_pages`, `dashboard_widgets`
- `data_sources`, `google_sheet_sources`, `sheet_tabs`
- `import_logs`, `users`, `client_users`, `templates`

---

## Fase 5 — Integrações Diretas

### Escopo
- Google Ads API — campanhas, grupos, palavras-chave
- Meta Marketing API — campanhas, conjuntos, criativos
- Google Analytics Data API — eventos, sessões, conversões
- Google Search Console API — queries, posições
- Para cada integração: connector, sync job, cache layer

Ver `INTEGRATIONS_PLAN.md` para detalhes técnicos.
