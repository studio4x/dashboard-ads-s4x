# Configuração Vercel - Dashboard ADS S4X

Este documento descreve a configuração do projeto na Vercel para a plataforma Dashboard ADS S4X.

## Detalhes do Projeto
- **Project ID**: `prj_ItBuzwCzFtKw36WXgZtHxsrXxHfF`
- **URL de Produção**: [https://dashboard-ads-s4x.vercel.app](https://dashboard-ads-s4x.vercel.app)
- **Framework Preset**: Next.js
- **Build Command**: `npm run build`
- **Install Command**: `npm install`
- **Output Directory**: Padrão (.next)

## Configuração de Variáveis de Ambiente
As variáveis de ambiente foram configuradas para os ambientes de **Production**, **Preview** e **Development** via Vercel CLI.

### Supabase
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_PROJECT_ID`
- `SUPABASE_PROJECT_NAME`
- `SUPABASE_DB_PASSWORD`
- `SUPABASE_ACCESS_TOKEN`

### Google Sheets
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `GOOGLE_PROJECT_ID`
- `GOOGLE_SHEETS_USE_MOCKS` (Definido inicialmente como `true`)

## Fluxo de Deploy
O deploy é realizado automaticamente via integração com o GitHub ou manualmente via Vercel CLI:

```bash
# Deploy manual para produção
npx vercel --prod
```

## Notas de Segurança
- Nunca adicione `VERCEL_TOKEN` ou `SUPABASE_SERVICE_ROLE_KEY` em arquivos que não estejam no `.gitignore`.
- Variáveis sensíveis não possuem o prefixo `NEXT_PUBLIC_`.
