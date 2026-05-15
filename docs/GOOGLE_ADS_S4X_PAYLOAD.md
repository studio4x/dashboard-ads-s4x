# Google Ads S4X — Estrutura do Payload (Snapshot)

Contrato de dados armazenado no banco de dados (Supabase) como JSONB.

## Estrutura `GoogleAdsS4XPayload`

```typescript
interface GoogleAdsS4XPayload {
  meta: any;                // Dados da aba Meta
  config: any;              // Dados da aba Dashboard_Config
  summary: {                // KPIs Consolidados
    cost: number;
    clicks: number;
    impressions: number;
    conversions: number;
    conversionValue: number;
    ctr: number;
    avgCpc: number;
    cpa: number;
    roas: number;
  };
  dailyPerformance: any[];  // Série temporal (Timeline)
  campaigns: any[];         // Lista de campanhas
  adGroups: any[];          // Lista de grupos
  keywords: any[];          // Lista de palavras-chave
  searchTerms: any[];       // Lista de termos de pesquisa
  negativeKeywords: any[];  // Lista de negativas
  adsAndAssets: any[];      // Lista de anúncios/recursos
  diagnostics: {            // Metadados técnicos
    importedAt: string;
    snapshotVersion: "google_ads_s4x_v1";
    validationWarnings: string[];
  };
}
```

## Versionamento
O `snapshotVersion` atual é `google_ads_s4x_v1`.
O `DashboardDataProvider` usa este campo para decidir como processar o sumário e aplicar fallbacks.

## Métricas Derivadas
O importador calcula automaticamente durante a criação do payload:
- `CTR` = Cliques / Impressões
- `CPC` = Custo / Cliques
- `CPA` = Custo / Conversões
- `ROAS` = Valor Conv. / Custo
