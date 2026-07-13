# Variáveis de Ambiente - Dashboard ADS S4X

Este documento lista as variáveis de ambiente necessárias para o funcionamento da plataforma.

## Supabase (Auth & Database)
- **NEXT_PUBLIC_SUPABASE_URL**: URL da API do Supabase.
- **NEXT_PUBLIC_SUPABASE_ANON_KEY**: Chave anônima pública.
- **SUPABASE_SERVICE_ROLE_KEY**: Chave de serviço (privada, bypass RLS).
- **SUPABASE_PROJECT_ID**: ID de referência do projeto.
- **SUPABASE_DB_PASSWORD**: Senha do banco de dados PostgreSQL.
- **SUPABASE_ACCESS_TOKEN**: Token de acesso para CLI/Deploy.

## Google Sheets (Data Source)
- **GOOGLE_SERVICE_ACCOUNT_EMAIL**: E-mail da Service Account do Google Cloud.
- **GOOGLE_PRIVATE_KEY**: Chave privada RSA (completa).
- **GOOGLE_PROJECT_ID**: ID do projeto no Google Cloud.
- **GOOGLE_SHEETS_USE_MOCKS**: `true` usa dados mockados, `false` usa API real.

- **VERCEL_TOKEN**: Token de autenticação para o CLI (apenas local/CI).

## Automação (Cron)
- **CRON_SECRET**: Segredo para autenticação dos endpoints `/api/cron/*`.
  - Deve existir no ambiente da aplicação (Vercel).
  - Deve existir também no Supabase Vault com `name = 'CRON_SECRET'` para os jobs do `pg_cron` enviarem o header `Authorization`.

## Automação (n8n)
- **N8N_REPORT_DISPATCH_WEBHOOK_URL**: Webhook de produção usado pelos disparos reais e pelos cron jobs.
- **N8N_REPORT_DISPATCH_WEBHOOK_TEST_URL**: Webhook de teste usado durante homologação e validação manual no n8n.
- **N8N_REPORT_DISPATCH_WEBHOOK_TOKEN**: Token opcional para autenticação do webhook.
- **N8N_REPORT_DISPATCH_HMAC_SECRET**: Segredo opcional para assinatura HMAC do payload enviado ao n8n.
- O workflow do n8n deve chamar o callback `POST /api/admin/automations/report-dispatch/callback` ao finalizar.
- Esse callback usa autenticação Bearer baseada em `CRON_SECRET` e recebe o estado final da execução (`success`, `partial` ou `error`).

## IA (Análises Automáticas)
- **OPENAI_API_KEY**: Chave usada como primeira opção para gerar as análises automáticas dos relatórios.
- **GEMINI_API_KEY**: Chave usada como fallback quando a OpenAI não responder ou estiver indisponível.
- As credenciais podem ser atualizadas pela página `/admin/settings`, que grava as variáveis criptografadas na Vercel.

## Notas de Segurança
- O arquivo `.env.local` deve ser ignorado pelo Git.
- Variáveis sensíveis **não** devem ter o prefixo `NEXT_PUBLIC_`.
- Na Vercel, as variáveis são configuradas via Painel de Controle ou CLI.
