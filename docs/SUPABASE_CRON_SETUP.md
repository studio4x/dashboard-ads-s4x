# Supabase Cron Setup

Este projeto usa `pg_cron` + `pg_net` para chamar:
- `/api/cron/import-google-sheets`
- `/api/cron/report-dispatch`

O fluxo de automação funciona em duas fases:
1. o cron dispara a rota `/api/cron/report-dispatch`, que envia o payload ao n8n;
2. ao finalizar o workflow, o n8n chama `POST /api/admin/automations/report-dispatch/callback` para registrar a conclusão final na plataforma.

## 1) Criar segredo no Supabase Vault

Execute no SQL Editor do Supabase (ajuste o valor):

```sql
select vault.create_secret('SEU_CRON_SECRET_AQUI', 'CRON_SECRET');
```

Se já existir e quiser rotacionar:

```sql
select vault.create_secret('NOVO_CRON_SECRET_AQUI', 'CRON_SECRET');
```

Os jobs usam sempre o segredo mais recente (`ORDER BY created_at DESC LIMIT 1`).

## 2) Aplicar migrations

Aplicar as migrations:

- `supabase/migrations/20260601173000_migrate_crons_to_supabase.sql`
- `supabase/migrations/20260608143000_reschedule_report_dispatch_cron.sql`

## 3) Validar jobs

```sql
select jobid, jobname, schedule, active
from cron.job
where jobname in ('import-google-sheets-cron', 'report-dispatch-cron');
```

## 4) Validar execuções

```sql
select jobid, runid, status, return_message, start_time, end_time
from cron.job_run_details
order by start_time desc
limit 50;
```

## 5) Callback do n8n

O callback de conclusão deve enviar `Authorization: Bearer <CRON_SECRET>` e um payload com pelo menos:

- `dashboardId`
- `status` (`success`, `partial` ou `error`)
- `completedAt` ou `finishedAt` opcional
- `message` opcional
- `details` opcional

Exemplo:

```json
{
  "dashboardId": "uuid-do-dashboard",
  "status": "success",
  "completedAt": "2026-06-08T14:35:00.000Z",
  "message": "Disparo concluído com sucesso.",
  "details": {
    "workflowRunId": "n8n-run-123"
  }
}
```

## Frequência do dispatch

O job `report-dispatch-cron` roda a cada 5 minutos. O backend decide se o dashboard está realmente devido para disparo, respeitando o horário configurado em cada automação.

## Observação

Ao corrigir/agendar qualquer job, a plataforma deve continuar funcionando perfeitamente.
