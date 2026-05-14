# Guia de Deployment - Dashboard ADS S4X

Guia rápido para realizar deploys da plataforma.

## Ambientes

### 1. Local
Para rodar o projeto localmente conectado ao Supabase remoto:
```bash
npm run dev
```

### 2. Produção (Vercel)
O deploy para o domínio principal [dashboard-ads-s4x.vercel.app](https://dashboard-ads-s4x.vercel.app) ocorre via Vercel.

#### Comandos de Deploy
Se precisar disparar um deploy manual:
```bash
npx vercel --prod
```

## Checklist de Deploy
- [x] Rodar `npm run build` localmente para validar tipos e estrutura.
- [x] Garantir que as migrations do Supabase foram aplicadas (`npx supabase db push`).
- [x] Verificar se as Environment Variables estão sincronizadas na Vercel.
- [x] Validar que `GOOGLE_SHEETS_USE_MOCKS` está de acordo com o desejado (true para testes, false para real).

## Resolução de Problemas
- **Erro de Build**: Verifique se todas as variáveis `NEXT_PUBLIC_*` estão configuradas na Vercel.
- **Erro de Auth**: Verifique se a URL do site na Vercel está listada nos "Redirect URLs" do Supabase Auth.
