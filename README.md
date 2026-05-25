# Dashboard Ads S4X

Plataforma de dashboards de marketing com ingestão via Google Sheets, snapshots de dados e compartilhamento de dashboards.

## Stack

- Next.js (App Router)
- TypeScript
- Supabase
- Vercel

## Setup local

1. Instale dependências:

```bash
npm install
```

2. Configure variáveis de ambiente em `.env.local` (base em `.env.example` e `docs/ENVIRONMENT_VARIABLES.md`).

3. Rode o projeto:

```bash
npm run dev
```

4. Acesse `http://localhost:3000`.

## Scripts

- `npm run dev` inicia ambiente local.
- `npm run build` gera build de produção.
- `npm run start` sobe build local.
- `npm run lint` executa lint do projeto.

## Documentação principal

- `docs/APP_SPEC.md`
- `docs/EXECUTION_PLAN.md`
- `docs/DATA_IMPORT_PLAN.md`
- `docs/GOOGLE_SHEETS_SETUP.md`
- `docs/DEPLOYMENT.md`
- `docs/VERCEL_SETUP.md`

## Observação sobre Next.js

Este projeto usa uma versão com mudanças relevantes.  
Antes de alterações estruturais, consulte `node_modules/next/dist/docs/` e respeite avisos de depreciação.

## Deploy

Deploy principal em Vercel: `https://dashboard-ads-s4x.vercel.app`

Para detalhes de publicação e validação, consulte:

- `docs/DEPLOYMENT.md`
- `docs/VERCEL_SETUP.md`

## Automação com n8n (Fase 1)

Fluxo recomendado atual:

1. Dashboard S4X gera/normaliza os dados.
2. Admin dispara automação manual na tela `Admin > Dashboards` (botão `Disparar Automação`).
3. Plataforma envia payload para webhook do n8n.
4. n8n gera análise com IA e envia e-mail/WhatsApp.

Variáveis necessárias:

- `N8N_REPORT_DISPATCH_WEBHOOK_URL` (obrigatória para disparo real)
- `N8N_REPORT_DISPATCH_WEBHOOK_TOKEN` (opcional, enviado em `Authorization: Bearer ...`)
- `N8N_REPORT_DISPATCH_WEBHOOK_SECRET` (opcional, assinatura HMAC SHA-256 em `X-S4X-Signature`)

Endpoint:

- `POST /api/admin/automations/report-dispatch`

Payload mínimo:

```json
{
  "dashboardId": "uuid-do-dashboard",
  "channels": ["email", "whatsapp"]
}
```

Observação:

- Nesta fase, o endpoint envia dados consolidados + link compartilhado para o n8n.
- O PDF continua sendo gerado no frontend do dashboard.
