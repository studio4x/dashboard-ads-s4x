# Variáveis de Ambiente - Dashboard ADS S4X

Este documento lista as variáveis de ambiente necessárias para o funcionamento da plataforma.

## Supabase (Auth & Database)
- **NEXT_PUBLIC_SUPABASE_URL**: URL da API do Supabase.
- **NEXT_PUBLIC_SUPABASE_ANON_KEY**: Chave anônima pública.
- **NEXT_PUBLIC_SITE_URL**: URL canônica pública da plataforma (`https://dashboardads.studio4x.com.br`).
- **SUPABASE_SERVICE_ROLE_KEY**: Chave de serviço (privada, bypass RLS).
- **SUPABASE_PROJECT_ID**: ID de referência do projeto.
- **SUPABASE_DB_PASSWORD**: Senha do banco de dados PostgreSQL.
- **SUPABASE_ACCESS_TOKEN**: Token de acesso para CLI/Deploy.

## Google Sheets (Data Source)
- **GOOGLE_SERVICE_ACCOUNT_EMAIL**: E-mail da Service Account do Google Cloud.
- **GOOGLE_PRIVATE_KEY**: Chave privada RSA (completa).
- **GOOGLE_PROJECT_ID**: ID do projeto no Google Cloud.
- **GOOGLE_SHEETS_USE_MOCKS**: `true` usa dados mockados, `false` usa API real.

## Meta Marketing API (Data Source)
- **META_APP_SECRET**: segredo do aplicativo Meta. Obrigatório, exclusivamente server-side e configurado na Vercel; nunca usar prefixo `NEXT_PUBLIC_`.
- **META_APP_ID**: fallback opcional para o App ID. Normalmente o App ID não sensível é informado em `/admin/meta-marketing`.
- **META_GRAPH_API_VERSION**: fallback opcional da versão da Graph API. A configuração persistida pelo painel tem precedência (`v26.0` por padrão).
- Tokens OAuth dos usuários Meta não são variáveis de ambiente: são gravados criptografados no Supabase Vault pela aplicação.
- A URI de redirecionamento exibida pelo painel deve ser cadastrada exatamente no Facebook Login for Business.

## Google Ads API (Data Source)
- **GOOGLE_ADS_CLIENT_SECRET**: segredo do OAuth Client Web. Obrigatório, exclusivamente server-side e sem prefixo `NEXT_PUBLIC_`.
- **GOOGLE_ADS_DEVELOPER_TOKEN**: token obtido na API Center de uma conta Google Ads Manager. Obrigatório e exclusivamente server-side.
- **GOOGLE_ADS_CLIENT_ID**: fallback opcional para o OAuth Client ID. Normalmente o valor não sensível é informado em `/admin/google-ads-api`.
- **GOOGLE_ADS_API_VERSION**: fallback opcional da versão REST, `v25` por padrão. A configuração persistida no painel tem precedência.
- Refresh tokens não são variáveis de ambiente: são gravados criptografados no Supabase Vault.
- Redirect URI de produção: `https://dashboardads.studio4x.com.br/api/admin/google-ads/oauth/callback`.

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
- Se a chave do Gemini usar restrição por HTTP referrer, inclua o origin canônico da plataforma (`https://dashboardads.studio4x.com.br`).
- Se o Gemini responder `Lightning dunning decision is deny`, o bloqueio costuma estar no billing/estado do projeto Google Cloud e não na URL da aplicação.
- As credenciais podem ser atualizadas pela página `/admin/settings`, que grava as variáveis criptografadas na Vercel.

## Notas de Segurança
- O arquivo `.env.local` deve ser ignorado pelo Git.
- Variáveis sensíveis **não** devem ter o prefixo `NEXT_PUBLIC_`.
- Na Vercel, as variáveis são configuradas via Painel de Controle ou CLI.
