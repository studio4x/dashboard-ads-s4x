# Supabase Cron Setup

Este projeto usa `pg_cron` + `pg_net` para chamar:
- `/api/cron/import-google-sheets`
- `/api/cron/report-dispatch`

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

Aplicar a migration:

- `supabase/migrations/20260601173000_migrate_crons_to_supabase.sql`

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

## Observação

Ao corrigir/agendar qualquer job, a plataforma deve continuar funcionando perfeitamente.
