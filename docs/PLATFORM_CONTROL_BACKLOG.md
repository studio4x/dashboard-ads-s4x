# Platform Control Backlog (S4X)

Última atualização: 2026-05-29
Responsável operacional: Time S4X

## Como usar
- Status: `todo`, `in_progress`, `blocked`, `done`
- Prioridade:
  - `P0`: bloqueia operação/qualidade essencial
  - `P1`: melhora robustez/escala
  - `P2`: melhoria incremental
- Atualize este arquivo a cada entrega com commit/push/deploy.

## Backlog Prioritário
| ID | Prioridade | Item | Status | Dono | Critério de aceite |
|---|---|---|---|---|---|
| BL-001 | P0 | Validação E2E do dashboard integrado (2 planilhas + objetivos Meta + KPIs) | todo | Time S4X | Checklist executado em produção sem erro crítico |
| BL-002 | P0 | Regressão dos templates separados (`google_ads_s4x` e `meta_ads_s4x`) | todo | Time S4X | Abas e KPIs principais sem regressão funcional |
| BL-003 | P0 | Revisão de segurança de acesso backend (service role e rotas admin) | todo | Time S4X | Rotas sensíveis exigem autenticação/autorização correta |
| BL-004 | P0 | Revisão final de políticas RLS multi-tenant | todo | Time S4X | Usuário não acessa dados de outro cliente |
| BL-005 | P1 | Padronizar feedbacks admin (reduzir `alert()` e uniformizar toasts) | todo | Time S4X | Ações principais com feedback visual consistente |
| BL-006 | P1 | Observabilidade da importação (tempo médio, falhas, warnings recorrentes) | todo | Time S4X | Painel/log com indicadores operacionais mínimos |
| BL-007 | P1 | Política de retenção de logs de importação | todo | Time S4X | Regra documentada e aplicada no backend |
| BL-008 | P1 | Cobertura de testes para importação e KPIs do consolidado | todo | Time S4X | Suíte cobrindo casos críticos do integrado |
| BL-009 | P2 | Redução progressiva de `any` em páginas/admin/dashboards | todo | Time S4X | Tipagem mais estrita sem quebrar build |
| BL-010 | P2 | Botão explícito de refresh no Cockpit (se necessário após uso real) | todo | Time S4X | Usuário percebe atualização imediata dos indicadores |

## Sprint Atual (P0)
| Ordem | ID | Ação | Status |
|---|---|---|---|
| 1 | BL-001 | Rodar checklist E2E em produção e registrar evidências | todo |
| 2 | BL-002 | Validar regressão templates separados | todo |
| 3 | BL-003 | Auditar rotas admin/service role | todo |
| 4 | BL-004 | Auditar e testar RLS multi-tenant | todo |

## Registro de entregas
| Data | Mudança | Commit | Deploy |
|---|---|---|---|
| 2026-05-29 | Criação do backlog de controle da plataforma | a preencher | a preencher |
