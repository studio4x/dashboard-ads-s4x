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
