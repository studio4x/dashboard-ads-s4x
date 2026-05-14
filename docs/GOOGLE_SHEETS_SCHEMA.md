# GOOGLE_SHEETS_SCHEMA.md
## Padrão de Planilhas Google Sheets — Dashboard ADS S4X

Este documento define o contrato de dados entre as planilhas Google Sheets dos clientes e a plataforma de dashboards.

---

## 1. Visão Geral

Cada cliente deve ter uma planilha no Google Sheets com abas padronizadas. A plataforma lê essas abas e renderiza os dashboards.

### Identificação
- Cada planilha representa **um cliente**
- O vínculo é feito via `spreadsheet_id` (ID da URL do Google Sheets)
- A planilha deve estar **compartilhada** com a conta de serviço da plataforma (Fase 2)

---

## 2. Abas Obrigatórias

| Aba | Finalidade | Dashboard |
|-----|-----------|-----------|
| `overview` | Métricas consolidadas de todas as fontes | Resumo Executivo |
| `google_ads` | Métricas diárias do Google Ads | Google Ads |
| `meta_ads` | Métricas diárias do Meta Ads | Meta Ads |
| `ga4_events` | Eventos e conversões do GA4 | Conversões |
| `audience` | Dados de audiência e canais | Público e Origem |
| `search_console` | Queries e métricas orgânicas | Search Console |
| `campaigns` | Detalhamento de campanhas (todos os canais) | Google Ads / Meta Ads |
| `keywords` | Palavras-chave do Google Ads | Google Ads |
| `search_terms` | Termos de pesquisa | Google Ads |
| `pages` | Páginas mais visitadas (GA4) | Conversões |
| `devices` | Desempenho por dispositivo | Público |
| `locations` | Desempenho por localização | Público |
| `insights` | Insights e recomendações manuais | Todas as páginas |

---

## 3. Schema por Aba

### 3.1 Aba `overview`

| Coluna | Tipo | Obrigatório | Exemplo |
|--------|------|-------------|---------|
| `date` | Date (YYYY-MM-DD) | ✅ | `2024-04-28` |
| `total_spend` | Number (BRL) | ✅ | `4820.00` |
| `total_revenue` | Number (BRL) | ✅ | `23140.00` |
| `total_conversions` | Integer | ✅ | `142` |
| `total_clicks` | Integer | ✅ | `4382` |
| `total_impressions` | Integer | ✅ | `98200` |
| `blended_roas` | Decimal | ✅ | `4.80` |
| `blended_cpa` | Number (BRL) | ✅ | `33.94` |
| `google_ads_spend` | Number (BRL) | ✅ | `2850.00` |
| `meta_ads_spend` | Number (BRL) | ✅ | `1970.00` |
| `organic_sessions` | Integer | ✅ | `1820` |
| `paid_sessions` | Integer | ✅ | `3100` |

**Uma linha por dia.**

---

### 3.2 Aba `campaigns`

| Coluna | Tipo | Obrigatório | Exemplo |
|--------|------|-------------|---------|
| `date` | Date (YYYY-MM-DD) | ✅ | `2024-04-28` |
| `campaign_id` | String | ✅ | `11234567890` |
| `campaign_name` | String | ✅ | `Search — Produtos Quentes` |
| `platform` | Enum: `google_ads`, `meta_ads` | ✅ | `google_ads` |
| `impressions` | Integer | ✅ | `18420` |
| `clicks` | Integer | ✅ | `842` |
| `cost` | Number (BRL) | ✅ | `1482.60` |
| `conversions` | Integer | ✅ | `48` |
| `revenue` | Number (BRL) | ✅ | `8640.00` |
| `ctr` | Decimal (%) | ✅ | `4.57` |
| `cpc` | Number (BRL) | ✅ | `1.76` |
| `cpa` | Number (BRL) | ✅ | `30.89` |
| `roas` | Decimal | ✅ | `5.83` |
| `status` | Enum: `active`, `paused`, `ended` | ✅ | `active` |
| `ad_group` | String | ❌ | `Produtos Destaque` |
| `objective` | String | ❌ | `Conversões` |

**Uma linha por campanha por dia.**

---

### 3.3 Aba `keywords`

| Coluna | Tipo | Obrigatório | Exemplo |
|--------|------|-------------|---------|
| `date` | Date | ✅ | `2024-04-28` |
| `keyword` | String | ✅ | `comprar tênis online` |
| `match_type` | Enum: `exact`, `phrase`, `broad` | ✅ | `exact` |
| `campaign_name` | String | ✅ | `Search — Produtos Quentes` |
| `ad_group` | String | ✅ | `Calçados` |
| `impressions` | Integer | ✅ | `3200` |
| `clicks` | Integer | ✅ | `182` |
| `cost` | Number (BRL) | ✅ | `320.32` |
| `conversions` | Integer | ✅ | `12` |
| `ctr` | Decimal (%) | ✅ | `5.69` |
| `cpc` | Number (BRL) | ✅ | `1.76` |
| `quality_score` | Integer (1-10) | ❌ | `8` |
| `position` | Decimal | ❌ | `1.2` |

---

### 3.4 Aba `ga4_events`

| Coluna | Tipo | Obrigatório | Exemplo |
|--------|------|-------------|---------|
| `date` | Date | ✅ | `2024-04-28` |
| `event_name` | String | ✅ | `purchase` |
| `event_count` | Integer | ✅ | `297` |
| `users` | Integer | ✅ | `280` |
| `sessions` | Integer | ✅ | `297` |
| `conversions` | Integer | ✅ | `297` |
| `source` | String | ❌ | `google` |
| `medium` | String | ❌ | `cpc` |
| `campaign` | String | ❌ | `Search Produtos` |

---

### 3.5 Aba `audience`

| Coluna | Tipo | Obrigatório | Exemplo |
|--------|------|-------------|---------|
| `date` | Date | ✅ | `2024-04-28` |
| `dimension` | Enum: `age_group`, `gender`, `interest`, `channel`, `source` | ✅ | `age_group` |
| `dimension_value` | String | ✅ | `25-34` |
| `sessions` | Integer | ✅ | `8940` |
| `users` | Integer | ✅ | `7820` |
| `new_users` | Integer | ✅ | `4920` |
| `conversions` | Integer | ✅ | `242` |
| `revenue` | Number (BRL) | ❌ | `43560.00` |

---

### 3.6 Aba `search_console`

| Coluna | Tipo | Obrigatório | Exemplo |
|--------|------|-------------|---------|
| `date` | Date | ✅ | `2024-04-28` |
| `query` | String | ✅ | `tênis feminino barato` |
| `page` | URL | ✅ | `https://lojaxyz.com.br/produtos` |
| `country` | ISO 3166-1 alpha-3 | ✅ | `BRA` |
| `device` | Enum: `MOBILE`, `DESKTOP`, `TABLET` | ✅ | `MOBILE` |
| `impressions` | Integer | ✅ | `12840` |
| `clicks` | Integer | ✅ | `684` |
| `ctr` | Decimal (%) | ✅ | `5.32` |
| `position` | Decimal | ✅ | `3.2` |

---

### 3.7 Aba `insights`

| Coluna | Tipo | Obrigatório | Exemplo |
|--------|------|-------------|---------|
| `date` | Date | ✅ | `2024-04-28` |
| `insight_type` | Enum: `positive`, `warning`, `alert`, `info` | ✅ | `positive` |
| `title` | String (max 100 chars) | ✅ | `ROAS do Shopping acima da meta` |
| `description` | String | ✅ | `A campanha atingiu ROAS de 8,24x...` |
| `metric` | String | ❌ | `roas` |
| `value` | Number | ❌ | `8.24` |
| `comparison_value` | Number | ❌ | `6.0` |
| `source` | String | ✅ | `google_ads` |
| `priority` | Integer (1-3) | ✅ | `1` |

---

## 4. Regras Gerais

### Valores Vazios
- Células vazias são tratadas como `null`/`0` dependendo do tipo
- Nunca deixar células de colunas obrigatórias vazias
- Para valores monetários sem dado: usar `0` (não deixar em branco)

### Períodos
- Usar sempre o formato `YYYY-MM-DD` na coluna `date`
- A plataforma filtra por período com base nessa coluna
- Nunca mesclar células de data

### Comparação com Período Anterior
- A plataforma calcula automaticamente a variação percentual
- Para isso, precisa de dados dos dois períodos na mesma aba
- Recomendado: manter pelo menos 90 dias de histórico

### Formato Numérico
- Usar ponto (.) como separador decimal, não vírgula
- Não incluir símbolos de moeda nas células (R$, %)
- Percentuais devem ser valores decimais: `4.57` para 4,57%
- ROAS deve ser o multiplicador: `4.80` para 4,80x

### Identificação do Cliente
- A identificação é feita via vínculo no sistema (spreadsheet_id → client_id)
- Não é necessário incluir coluna de cliente_id na planilha

---

## 5. Mapeamento Aba → Página do Dashboard

| Aba | Página |
|-----|--------|
| `overview` | Resumo Executivo |
| `google_ads` | Google Ads |
| `meta_ads` | Meta Ads |
| `campaigns` | Google Ads + Meta Ads |
| `keywords` | Google Ads |
| `ga4_events` | Conversões e Comportamento |
| `pages` | Conversões e Comportamento |
| `audience` | Público e Origem |
| `search_console` | Search Console |
| `insights` | Todas as páginas (painel lateral) |

---

## 6. Fluxo de Dados

```
Google Ads API → Planilha (aba: google_ads, campaigns, keywords)
Meta Ads API   → Planilha (aba: meta_ads, campaigns)
GA4 API        → Planilha (aba: ga4_events, pages, audience)
Search Console → Planilha (aba: search_console)
                      ↓
              Google Sheets API
                      ↓
              Plataforma (Fase 2)
                      ↓
                 Dashboard
```

No MVP (Fase 1), os dados mock em `src/data/mock-sheet-*.ts` simulam exatamente esse formato.

---

## 7. Checklist de Validação

Antes de vincular uma planilha, verifique:

- [ ] Todas as abas obrigatórias estão criadas com os nomes exatos
- [ ] A linha 1 de cada aba contém os cabeçalhos das colunas
- [ ] Os dados começam na linha 2
- [ ] A coluna `date` está no formato `YYYY-MM-DD`
- [ ] Valores numéricos não contêm símbolos (R$, %, etc.)
- [ ] A planilha está compartilhada com a conta de serviço
- [ ] Pelo menos 30 dias de dados históricos disponíveis
