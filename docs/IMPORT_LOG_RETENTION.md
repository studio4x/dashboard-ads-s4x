# Política de Retenção de Logs de Importação

## Regra
- Janela padrão: `90` dias.
- Logs com `started_at` anterior ao corte são removidos automaticamente.

## Como é aplicado
- Endpoint: `GET /api/admin/import-logs`
- Antes de retornar a lista, o backend executa limpeza automática dos logs expirados.

## Configuração
- Variável de ambiente: `IMPORT_LOG_RETENTION_DAYS`
- Valor mínimo efetivo: `1` dia.
- Se a variável não estiver definida, o sistema usa `90`.

## Objetivo operacional
- Evitar crescimento indefinido da tabela `import_logs`.
- Manter histórico recente para suporte, auditoria e diagnóstico.
