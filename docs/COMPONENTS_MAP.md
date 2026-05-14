# Components Map - Dashboard ADS S4X

## UI Components (`/src/components/ui`)
- **Skeleton.tsx**: Base para estados de carregamento.
- **EmptyState.tsx**: Componente genérico para estados vazios.
- **Toast.tsx**: Sistema de feedback em tempo real.

## Dashboard Components (`/src/components/dashboard`)
- **DashboardPageShell.tsx**: Estrutura principal das páginas do dashboard.
- **DashboardSkeleton.tsx**: Layout de carregamento do dashboard.
- **DashboardDataContext.tsx**: Provedor de dados e estados (loading, error).
- **MetricCard.tsx**: Card de KPI.
- **ChartCard.tsx**: Wrapper para gráficos.
- **Widgets**: `BarChartWidget`, `DataTableWidget`, `DonutChartWidget`, `LineChartWidget`, `InsightCard`.

## Admin Components (`/src/components/admin`)
- **AdminSidebar.tsx**: Navegação lateral do admin.
- **GoogleSheetSourceCard.tsx**: Card de gerenciamento de fonte.
- **ImportStatusBadge.tsx**: Badge de status de importação (Running, Success, etc).
- **AdminListSkeleton.tsx**: Skeletons para listas administrativas.
