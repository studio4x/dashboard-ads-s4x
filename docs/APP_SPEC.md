# APP_SPEC.md
## Especificação do Sistema — Dashboard ADS S4X

### Stack
- Next.js 16 + App Router + TypeScript
- Tailwind CSS v4
- Recharts (gráficos)
- Lucide React (ícones)
- Supabase (Fase 3+)

### Áreas do Sistema
1. Pública: landing + login
2. Cliente: /app/dashboards — listagem e visualização
3. Admin: /admin — gerenciamento completo

### Fontes de Dados
- MVP: Google Sheets (mocks na Fase 1)
- Futuro: Google Ads API, Meta API, GA4 API, Search Console API

### Páginas do Dashboard
1. Resumo Executivo — KPIs consolidados + gráficos + insights
2. Google Ads — campanhas, palavras-chave, evolução
3. Meta Ads — campanhas, conjuntos, desempenho
4. Conversões — eventos GA4, funil, páginas
5. Público e Origem — demografias, canais
6. Search Console — queries orgânicas, posições
