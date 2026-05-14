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

## Vercel (Deployment)
- **VERCEL_PROJECT_ID**: ID do projeto na Vercel.
- **VERCEL_PROJECT_URL**: URL base do projeto (ex: dashboard-ads-s4x.vercel.app).
- **VERCEL_TOKEN**: Token de autenticação para o CLI (apenas local/CI).

## Notas de Segurança
- O arquivo `.env.local` deve ser ignorado pelo Git.
- Variáveis sensíveis **não** devem ter o prefixo `NEXT_PUBLIC_`.
- Na Vercel, as variáveis são configuradas via Painel de Controle ou CLI.
