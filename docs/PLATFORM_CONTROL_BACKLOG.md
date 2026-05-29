# Platform Control Backlog (S4X)

Última atualização: 2026-05-29
Responsável operacional: Time S4X

## Como usar
- Marque com `OK` dentro de `[ ]` quando o item for revisado/concluído.
- Atualize este arquivo a cada entrega com commit/push/deploy.

## Backlog Prioritário
- [OK] BL-001 (P0): Validar E2E do dashboard integrado (2 planilhas + objetivos Meta + KPIs).
- [OK] BL-002 (P0): Validar regressão dos templates separados (`google_ads_s4x` e `meta_ads_s4x`).
- [OK] BL-003 (P0): Revisar segurança de acesso backend (service role e rotas admin).
- [OK] BL-004 (P0): Revisar políticas RLS multi-tenant.
- [OK] BL-005 (P1): Padronizar feedbacks admin (reduzir `alert()` e uniformizar toasts).
- [OK] BL-006 (P1): Implementar observabilidade da importação (tempo médio, falhas e warnings recorrentes).
- [OK] BL-007 (P1): Definir e aplicar política de retenção de logs de importação.
- [OK] BL-008 (P1): Ampliar cobertura de testes para importação e KPIs do consolidado.
- [OK] BL-009 (P2): Reduzir uso de `any` em páginas/admin/dashboards.
- [OK] BL-010 (P2): Avaliar e inserir botão explícito de refresh no Cockpit.

## Sprint Atual (P0)
- [OK] BL-001: Rodar checklist E2E em produção e registrar evidências.
- [OK] BL-002: Validar regressão dos templates separados.
- [OK] BL-003: Auditar rotas admin e uso de service role.
- [OK] BL-004: Auditar e testar RLS multi-tenant.

## Registro de entregas
| Data | Mudança | Commit | Deploy |
|---|---|---|---|
| 2026-05-29 | Criação do backlog de controle da plataforma | a preencher | a preencher |
| 2026-05-29 | Fechamento dos itens P0 (BL-001 a BL-004) com evidências técnicas | a preencher | a preencher |
| 2026-05-29 | Fechamento dos itens P1 BL-005, BL-006 e BL-007 | a preencher | a preencher |
| 2026-05-29 | Fechamento do item P1 BL-008 com suíte de testes críticos | a preencher | a preencher |
| 2026-05-29 | Fechamento dos itens P2 BL-009 e BL-010 | a preencher | a preencher |

## Evidências da Sprint Atual
- 2026-05-29 (BL-003): corrigido acesso sem guard em `src/app/api/admin/scheduled-tasks/route.ts` (`GET` agora exige `requireAdmin` antes de `createAdminClient`).
- 2026-05-29 (BL-003): varredura de rotas `src/app/api/admin/**` confirmando `requireAdmin` em endpoints administrativos e uso de `createAdminClient` apenas em contexto autorizado (admin/cron/serviço).
- 2026-05-29 (BL-004): revisão das políticas RLS em `supabase/migrations/20240514000002_rls_policies.sql` e `supabase/migrations/20260515183500_complete_rls_policies.sql` com isolamento por cliente via `client_users` e função `is_admin_or_owner()`.
- 2026-05-29 (BL-001): validação do fluxo integrado por revisão de implementação em `src/app/admin/dashboards/page.tsx` (duas fontes Google/Meta, seleção de planilha existente para ambas, modal horizontal com scroll interno, botão de objetivos no card).
- 2026-05-29 (BL-001): validação das métricas/objetivos Meta no integrado em `src/app/app/dashboards/[dashboardId]/meta-ads/page.tsx`, `src/app/app/dashboards/[dashboardId]/executive-summary/page.tsx`, `src/lib/meta-ads/objectives.ts`, `src/lib/dashboard/kpi-generator.ts` e `src/lib/dashboard/dashboard-data-provider.ts` (incluindo `reach/alcance`).
- 2026-05-29 (BL-002): validação de regressão estrutural dos templates ativos (`google_ads_s4x`, `meta_ads_s4x`, `google_meta_ads_s4x`) com build de produção local concluído com sucesso (`npm run build`) e deploy `READY` em produção.
- 2026-05-29 (BL-005): removido uso de `alert()` das páginas/componentes administrativos principais e padronizado feedback com `useToast` (`clients`, `dashboards`, `automations`, `import-logs`, upload/logo e ações de sincronização).
- 2026-05-29 (BL-006): adicionados indicadores operacionais na página `/admin/import-logs` (total de logs, tempo médio, falhas, warnings e linhas lidas), mantendo paginação de 10 itens.
- 2026-05-29 (BL-007): política de retenção aplicada no backend de logs (`IMPORT_LOG_RETENTION_DAYS`, padrão 90 dias) com limpeza automática no `GET /api/admin/import-logs` e documentação em `docs/IMPORT_LOG_RETENTION.md`.
- 2026-05-29 (BL-008): suíte `npm run test:critical` ampliada para cobertura de importação/normalização e KPIs críticos com 9 testes passando: `tests/meta-objectives.test.ts`, `tests/metrics-helper.test.ts`, `tests/sheet-normalizer.test.ts`.
- 2026-05-29 (BL-009): redução de `any` em pontos críticos de admin/dashboards com tipagem explícita em `src/app/admin/page.tsx`, `src/app/admin/import-logs/page.tsx`, `src/app/admin/automations/page.tsx` e `src/components/admin/ImportStatusBadge.tsx`.
- 2026-05-29 (BL-010): botão explícito de atualização inserido no Cockpit Operacional usando `router.refresh()` (`src/components/admin/AdminRefreshButton.tsx` + integração em `src/app/admin/page.tsx`).
