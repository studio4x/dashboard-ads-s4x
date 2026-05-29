# Platform Control Backlog (S4X)

Última atualização: 2026-05-29
Responsável operacional: Time S4X

## Como usar
- Marque com `OK` dentro de `[ ]` quando o item for revisado/concluído.
- Atualize este arquivo a cada entrega com commit/push/deploy.

## Backlog Prioritário
- [ ] BL-001 (P0): Validar E2E do dashboard integrado (2 planilhas + objetivos Meta + KPIs).
- [ ] BL-002 (P0): Validar regressão dos templates separados (`google_ads_s4x` e `meta_ads_s4x`).
- [ ] BL-003 (P0): Revisar segurança de acesso backend (service role e rotas admin).
- [ ] BL-004 (P0): Revisar políticas RLS multi-tenant.
- [ ] BL-005 (P1): Padronizar feedbacks admin (reduzir `alert()` e uniformizar toasts).
- [ ] BL-006 (P1): Implementar observabilidade da importação (tempo médio, falhas e warnings recorrentes).
- [ ] BL-007 (P1): Definir e aplicar política de retenção de logs de importação.
- [ ] BL-008 (P1): Ampliar cobertura de testes para importação e KPIs do consolidado.
- [ ] BL-009 (P2): Reduzir uso de `any` em páginas/admin/dashboards.
- [ ] BL-010 (P2): Avaliar e inserir botão explícito de refresh no Cockpit.

## Sprint Atual (P0)
- [ ] BL-001: Rodar checklist E2E em produção e registrar evidências.
- [ ] BL-002: Validar regressão dos templates separados.
- [ ] BL-003: Auditar rotas admin e uso de service role.
- [ ] BL-004: Auditar e testar RLS multi-tenant.

## Registro de entregas
| Data | Mudança | Commit | Deploy |
|---|---|---|---|
| 2026-05-29 | Criação do backlog de controle da plataforma | a preencher | a preencher |

## Evidências da Sprint Atual
- 2026-05-29 (BL-003): corrigido acesso sem guard em `src/app/api/admin/scheduled-tasks/route.ts` (`GET` agora exige `requireAdmin` antes de `createAdminClient`).
