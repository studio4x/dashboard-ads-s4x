# ROUTES_AND_PAGES.md
## Rotas e Páginas — Dashboard ADS S4X

---

## Rotas Públicas

| Rota | Arquivo | Descrição |
|------|---------|-----------|
| `/` | `src/app/page.tsx` | Landing page |
| `/login` | `src/app/login/page.tsx` | Login |
| `/share/[token]` | `src/app/share/[token]/page.tsx` | Visualização pública de Dashboard (via Hash) |

---

## Área do Cliente

| Rota | Arquivo | Descrição |
|------|---------|-----------|
| `/app` | `src/app/app/page.tsx` | Redirect para /app/dashboards |
| `/app/dashboards` | `src/app/app/dashboards/page.tsx` | Lista de dashboards |
| `/app/dashboards/[id]` | `src/app/app/dashboards/[dashboardId]/page.tsx` | Redirect para executive-summary |
| `/app/dashboards/[id]/executive-summary` | `...executive-summary/page.tsx` | Resumo Executivo |
| `/app/dashboards/[id]/google-ads` | `...google-ads/page.tsx` | Google Ads |
| `/app/dashboards/[id]/meta-ads` | `...meta-ads/page.tsx` | Meta Ads |
| `/app/dashboards/[id]/conversions` | `...conversions/page.tsx` | Conversões e Comportamento |
| `/app/dashboards/[id]/audience` | `...audience/page.tsx` | Público e Origem |
| `/app/dashboards/[id]/search-console` | `...search-console/page.tsx` | Search Console |

### Layout do Dashboard
`src/app/app/dashboards/[dashboardId]/layout.tsx` — inclui:
- DashboardHeader (fixo no topo)
- DashboardTabs (tabs de navegação)
- Área de conteúdo (`{children}`)

---

## Área Admin

| Rota | Arquivo | Descrição |
|------|---------|-----------|
| `/admin` | `src/app/admin/page.tsx` | Visão geral |
| `/admin/clients` | `src/app/admin/clients/page.tsx` | Lista de clientes |
| `/admin/clients/[clientId]` | `src/app/admin/clients/[clientId]/page.tsx` | Detalhe do cliente |
| `/admin/dashboards` | `src/app/admin/dashboards/page.tsx` | Todos os dashboards |
| `/admin/data-sources` | `src/app/admin/data-sources/page.tsx` | Fontes de dados |
| `/admin/google-sheets` | `src/app/admin/google-sheets/page.tsx` | Planilhas vinculadas |
| `/admin/templates` | `src/app/admin/templates/page.tsx` | Templates |
| `/admin/import-logs` | `src/app/admin/import-logs/page.tsx` | Logs de importação |
| `/admin/settings` | `src/app/admin/settings/page.tsx` | Configurações |

### Layout Admin
`src/app/admin/layout.tsx` — inclui:
- AdminSidebar (fixa, 260px)
- Área de conteúdo principal

---

## Hierarquia de Layouts

```
RootLayout (src/app/layout.tsx)
├── / (landing)
├── /login
├── /share/[token] (somente leitura)
├── /app/
│   └── DashboardsLayout (sem layout especial)
│       └── /app/dashboards/[dashboardId]/
│           └── DashboardLayout (header + tabs)
│               ├── /executive-summary
│               ├── /google-ads
│               ├── /meta-ads
│               ├── /conversions
│               ├── /audience
│               └── /search-console
└── /admin/
    └── AdminLayout (sidebar)
        ├── /admin (overview)
        ├── /admin/clients
        ├── /admin/dashboards
        ├── /admin/data-sources
        ├── /admin/google-sheets
        ├── /admin/templates
        ├── /admin/import-logs
        └── /admin/settings
```
