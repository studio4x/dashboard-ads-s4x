import { SheetNormalizer } from "./sheet-normalizer";
import { SheetValidator } from "./sheet-validator";
import { NormalizedSheetData } from "@/types/google-sheets";
import { 
  GoogleAdsS4XDailyPerformance, 
  GoogleAdsS4XCampaign, 
  GoogleAdsS4XAdGroup, 
  GoogleAdsS4XKeyword, 
  GoogleAdsS4XSearchTerm, 
  GoogleAdsS4XNegativeKeyword, 
  GoogleAdsS4XAdAsset 
} from "@/types/google-ads-s4x";
import { GOOGLE_ADS_S4X_SCHEMA } from "./schemas/google-ads-s4x";

/**
 * Mapeia as colunas da planilha para o objeto do sistema.
 */
function mapRowToModel<T>(headers: string[], row: any[], mapper: (data: Record<string, any>) => T): T {
  const obj: Record<string, any> = {};
  headers.forEach((header, index) => {
    obj[header] = row[index];
  });
  return mapper(obj);
}

export const SheetTabReader = {
  /**
   * Aba: overview
   */
  readOverview(rows: any[][]): NormalizedSheetData<any> {
    const tabName = "overview";
    const validator = new SheetValidator(tabName);
    
    if (rows.length === 0) return { tabName, data: [], errors: [{ level: "error", message: "Aba vazia", tab: tabName }] };

    const headers = rows[0];
    const required = ["date", "total_spend", "total_revenue"];
    validator.validateHeaders(headers, required);

    const data = rows.slice(1)
      .filter(row => row[0] && row[0] !== "Sim" && !row[0].toString().includes("Date"))
      .map((row, index) => {
      const rowIndex = index + 2;
      return mapRowToModel(headers, row, (raw) => ({
        date: SheetNormalizer.toDate(raw.date),
        total_spend: SheetNormalizer.toNumber(raw.total_spend),
        total_revenue: SheetNormalizer.toNumber(raw.total_revenue),
        total_conversions: SheetNormalizer.toInteger(raw.total_conversions),
        total_clicks: SheetNormalizer.toInteger(raw.total_clicks),
        total_impressions: SheetNormalizer.toInteger(raw.total_impressions),
        blended_roas: SheetNormalizer.toNumber(raw.blended_roas),
        blended_cpa: SheetNormalizer.toNumber(raw.blended_cpa),
        google_ads_spend: SheetNormalizer.toNumber(raw.google_ads_spend),
        meta_ads_spend: SheetNormalizer.toNumber(raw.meta_ads_spend),
        organic_sessions: SheetNormalizer.toInteger(raw.organic_sessions),
        paid_sessions: SheetNormalizer.toInteger(raw.paid_sessions),
      }));
    });

    return { tabName, data, errors: validator.getErrors() };
  },

  /**
   * Aba: google_ads
   */
  readGoogleAds(rows: any[][]): NormalizedSheetData<any> {
    const tabName = "google_ads";
    const validator = new SheetValidator(tabName);
    
    if (rows.length === 0) return { tabName, data: [], errors: [{ level: "error", message: "Aba vazia", tab: tabName }] };

    const headers = rows[0].map((h: any) => String(h).trim());
    
    // Suporte a aliases (Português/Inglês)
    const data = rows.slice(1)
      .filter(row => row[0] && !SheetNormalizer.shouldIgnoreRow(row[0]))
      .map((row) => {
      return mapRowToModel(headers, row, (raw) => ({
        date: SheetNormalizer.toDate(raw["Data"] || raw["date"]),
        cost: SheetNormalizer.toNumber(raw["Custo (R$)"] || raw["cost"]),
        impressions: SheetNormalizer.toInteger(raw["Impressões"] || raw["impressions"]),
        clicks: SheetNormalizer.toInteger(raw["Cliques"] || raw["clicks"]),
        conversions: SheetNormalizer.toInteger(raw["Conversões"] || raw["conversions"]),
        revenue: SheetNormalizer.toNumber(raw["Valor das Conversões (R$)"] || raw["revenue"]),
        chave_ia: SheetNormalizer.toString(raw["Chave_IA"]),
      }));
    });

    return { tabName, data, errors: validator.getErrors() };
  },

  /**
   * Aba: campaigns
   */
  readCampaigns(rows: any[][]): NormalizedSheetData<any> {
    const tabName = "campaigns";
    const validator = new SheetValidator(tabName);
    
    if (rows.length === 0) return { tabName, data: [], errors: [{ level: "error", message: "Aba vazia", tab: tabName }] };

    const headers = rows[0].map((h: any) => String(h).trim());

    const data = rows.slice(1)
      .filter(row => row[0] && !SheetNormalizer.shouldIgnoreRow(row[0]))
      .map((row) => {
      return mapRowToModel(headers, row, (raw) => ({
        campaign_name: SheetNormalizer.toString(raw["Campanha"] || raw["campaign_name"]),
        platform: SheetNormalizer.toString(raw["Tipo de Canal"] || raw["platform"]),
        status: SheetNormalizer.toString(raw["Status da Campanha"] || raw["status"]),
        impressions: SheetNormalizer.toInteger(raw["Impressões"] || raw["impressions"]),
        clicks: SheetNormalizer.toInteger(raw["Cliques"] || raw["clicks"]),
        cost: SheetNormalizer.toNumber(raw["Custo (R$)"] || raw["cost"]),
        conversions: SheetNormalizer.toInteger(raw["Conversões"] || raw["conversions"]),
        revenue: SheetNormalizer.toNumber(raw["Valor das Conversões (R$)"] || raw["revenue"]),
        ctr: SheetNormalizer.toPercent(raw["CTR"] || raw["ctr"]),
        cpc: SheetNormalizer.toNumber(raw["CPC Médio (R$)"] || raw["cpc"]),
        cpa: SheetNormalizer.toNumber(raw["Custo por Conversão (R$)"] || raw["cpa"]),
        roas: SheetNormalizer.toNumber(raw["ROAS"] || raw["roas"]),
        chave_ia: SheetNormalizer.toString(raw["Chave_IA"]),
      }));
    });

    return { tabName, data, errors: validator.getErrors() };
  },

  /**
   * Aba: meta_ads
   */
  readMetaAds(rows: any[][]): NormalizedSheetData<any> {
    const tabName = "meta_ads";
    const validator = new SheetValidator(tabName);
    if (rows.length === 0) return { tabName, data: [], errors: [{ level: "error", message: "Aba vazia", tab: tabName }] };
    const headers = rows[0];
    const data = rows.slice(1)
      .filter(row => row[0] && !SheetNormalizer.shouldIgnoreRow(row[0]) && !row[0].toString().includes("Date"))
      .map((row) => mapRowToModel(headers, row, (raw) => ({
      date: SheetNormalizer.toDate(raw.date),
      value: SheetNormalizer.toNumber(raw.cost),
      impressions: SheetNormalizer.toInteger(raw.impressions),
      clicks: SheetNormalizer.toInteger(raw.clicks),
      conversions: SheetNormalizer.toInteger(raw.conversions),
      revenue: SheetNormalizer.toNumber(raw.revenue),
    })));
    return { tabName, data, errors: validator.getErrors() };
  },

  /**
   * Aba: ga4_events
   */
  readGa4Events(rows: any[][]): NormalizedSheetData<any> {
    const tabName = "ga4_events";
    const validator = new SheetValidator(tabName);
    if (rows.length === 0) return { tabName, data: [], errors: [] };
    const headers = rows[0];
    const data = rows.slice(1)
      .filter(row => row[0] && !SheetNormalizer.shouldIgnoreRow(row[0]) && !row[0].toString().includes("String"))
      .map((row) => mapRowToModel(headers, row, (raw) => ({
      event_name: SheetNormalizer.toString(raw.event_name),
      event_count: SheetNormalizer.toInteger(raw.event_count),
      users: SheetNormalizer.toInteger(raw.users),
    })));
    return { tabName, data, errors: validator.getErrors() };
  },

  /**
   * Aba: search_console
   */
  readSearchConsole(rows: any[][]): NormalizedSheetData<any> {
    const tabName = "search_console";
    const validator = new SheetValidator(tabName);
    if (rows.length === 0) return { tabName, data: [], errors: [] };
    const headers = rows[0];
    const data = rows.slice(1)
      .filter(row => row[0] && !SheetNormalizer.shouldIgnoreRow(row[0]) && !row[0].toString().includes("String"))
      .map((row) => mapRowToModel(headers, row, (raw) => ({
      query: SheetNormalizer.toString(raw.query),
      clicks: SheetNormalizer.toInteger(raw.clicks),
      impressions: SheetNormalizer.toInteger(raw.impressions),
      ctr: SheetNormalizer.toPercent(raw.ctr),
      position: SheetNormalizer.toNumber(raw.position),
      device: SheetNormalizer.toString(raw.device),
    })));
    return { tabName, data, errors: validator.getErrors() };
  },

  /**
   * Aba: audience
   */
  readAudience(rows: any[][]): NormalizedSheetData<any> {
    const tabName = "audience";
    const validator = new SheetValidator(tabName);
    if (rows.length === 0) return { tabName, data: [], errors: [] };
    const headers = rows[0];
    const data = rows.slice(1)
      .filter(row => row[0] && !SheetNormalizer.shouldIgnoreRow(row[0]) && !row[0].toString().includes("Enum"))
      .map((row) => mapRowToModel(headers, row, (raw) => ({
      dimension: SheetNormalizer.toString(raw.dimension),
      dimension_value: SheetNormalizer.toString(raw.dimension_value),
      sessions: SheetNormalizer.toInteger(raw.sessions),
      conversions: SheetNormalizer.toInteger(raw.conversions),
      revenue: SheetNormalizer.toNumber(raw.revenue),
    })));
    return { tabName, data, errors: validator.getErrors() };
  },

  /**
   * Aba: keywords
   */
  readKeywords(rows: any[][]): NormalizedSheetData<any> {
    const tabName = "keywords";
    const validator = new SheetValidator(tabName);
    if (rows.length === 0) return { tabName, data: [], errors: [] };
    const headers = rows[0].map((h: any) => String(h).trim());

    const data = rows.slice(1)
      .filter(row => row[0] && !SheetNormalizer.shouldIgnoreRow(row[0]))
      .map((row) => {
      return mapRowToModel(headers, row, (raw) => ({
        keyword: SheetNormalizer.toString(raw["Palavra-chave"] || raw["keyword"]),
        match_type: SheetNormalizer.toString(raw["Tipo de Correspondência"] || raw["match_type"]),
        status: SheetNormalizer.toString(raw["Status"] || raw["status"]),
        impressions: SheetNormalizer.toInteger(raw["Impressões"] || raw["impressions"]),
        clicks: SheetNormalizer.toInteger(raw["Cliques"] || raw["clicks"]),
        cost: SheetNormalizer.toNumber(raw["Custo (R$)"] || raw["cost"]),
        conversions: SheetNormalizer.toInteger(raw["Conversões"] || raw["conversions"]),
        revenue: SheetNormalizer.toNumber(raw["Valor das Conversões (R$)"] || raw["revenue"]),
        quality_score: SheetNormalizer.toInteger(raw["Índice de Qualidade"] || raw["quality_score"]),
        chave_ia: SheetNormalizer.toString(raw["Chave_IA"]),
      }));
    });
    return { tabName, data, errors: validator.getErrors() };
  },

  /**
   * Aba: insights
   */
  readInsights(rows: any[][]): NormalizedSheetData<any> {
    const tabName = "insights";
    const validator = new SheetValidator(tabName);
    if (rows.length === 0) return { tabName, data: [], errors: [] };
    const headers = rows[0];
    const data = rows.slice(1)
      .filter(row => row[0] && row[0] !== "Sim" && !row[0].toString().includes("Enum:"))
      .map((row) => mapRowToModel(headers, row, (raw) => ({
      insight_type: SheetNormalizer.toString(raw.insight_type) as any,
      title: SheetNormalizer.toString(raw.title),
      description: SheetNormalizer.toString(raw.description),
      source: SheetNormalizer.toString(raw.source),
      priority: SheetNormalizer.toInteger(raw.priority),
    })));
    return { tabName, data, errors: validator.getErrors() };
  },
  /**
   * Aba: ad_groups
   */
  readAdGroups(rows: any[][]): NormalizedSheetData<any> {
    const tabName = "Grupos de Anúncios";
    const validator = new SheetValidator(tabName);
    if (rows.length === 0) return { tabName, data: [], errors: [] };
    const headers = rows[0];
    const data = rows.slice(1)
      .filter(row => row[0] && !SheetNormalizer.shouldIgnoreRow(row[0]))
      .map((row) => mapRowToModel(headers, row, (raw) => ({
      campaign: SheetNormalizer.toString(raw["Campanha"]),
      ad_group: SheetNormalizer.toString(raw["Grupo de Anúncios"]),
      status: SheetNormalizer.toString(raw["Status do Grupo"]),
      impressions: SheetNormalizer.toInteger(raw["Impressões"]),
      clicks: SheetNormalizer.toInteger(raw["Cliques"]),
      cost: SheetNormalizer.toNumber(raw["Custo (R$)"]),
      conversions: SheetNormalizer.toInteger(raw["Conversões"]),
      revenue: SheetNormalizer.toNumber(raw["Valor das Conversões (R$)"]),
      chave_ia: SheetNormalizer.toString(raw["Chave_IA"]),
    })));
    return { tabName, data, errors: validator.getErrors() };
  },

  /**
   * Aba: search_terms
   */
  readSearchTerms(rows: any[][]): NormalizedSheetData<any> {
    const tabName = "Termos de Pesquisa";
    const validator = new SheetValidator(tabName);
    if (rows.length === 0) return { tabName, data: [], errors: [] };
    const headers = rows[0];
    const data = rows.slice(1)
      .filter(row => row[0] && !SheetNormalizer.shouldIgnoreRow(row[0]))
      .map((row) => mapRowToModel(headers, row, (raw) => ({
      campaign: SheetNormalizer.toString(raw["Campanha"]),
      ad_group: SheetNormalizer.toString(raw["Grupo de Anúncios"]),
      search_term: SheetNormalizer.toString(raw["Termo de Pesquisa"]),
      impressions: SheetNormalizer.toInteger(raw["Impressões"]),
      clicks: SheetNormalizer.toInteger(raw["Cliques"]),
      cost: SheetNormalizer.toNumber(raw["Custo (R$)"]),
      conversions: SheetNormalizer.toInteger(raw["Conversões"]),
      revenue: SheetNormalizer.toNumber(raw["Valor das Conversões (R$)"]),
      chave_ia: SheetNormalizer.toString(raw["Chave_IA"]),
    })));
    return { tabName, data, errors: validator.getErrors() };
  },

  /**
   * Aba: negative_keywords
   */
  readNegativeKeywords(rows: any[][]): NormalizedSheetData<any> {
    const tabName = "Palavras-Chave Negativas";
    const validator = new SheetValidator(tabName);
    if (rows.length === 0) return { tabName, data: [], errors: [] };
    const headers = rows[0];
    const data = rows.slice(1)
      .filter(row => row[0] && !SheetNormalizer.shouldIgnoreRow(row[0]))
      .map((row) => mapRowToModel(headers, row, (raw) => ({
      campaign: SheetNormalizer.toString(raw["Campanha"]),
      keyword: SheetNormalizer.toString(raw["Palavra-Chave Negativa"]),
      match_type: SheetNormalizer.toString(raw["Tipo de Correspondência"]),
      chave_ia: SheetNormalizer.toString(raw["Chave_IA"]),
    })));
    return { tabName, data, errors: validator.getErrors() };
  },

  /**
   * Aba: ads_assets
   */
  readAdsAssets(rows: any[][]): NormalizedSheetData<any> {
    const tabName = "Anúncios (Recursos)";
    const validator = new SheetValidator(tabName);
    if (rows.length === 0) return { tabName, data: [], errors: [] };
    const headers = rows[0];
    const data = rows.slice(1)
      .filter(row => row[0] && !SheetNormalizer.shouldIgnoreRow(row[0]))
      .map((row) => mapRowToModel(headers, row, (raw) => ({
      campaign: SheetNormalizer.toString(raw["Campanha"]),
      ad_group: SheetNormalizer.toString(raw["Grupo de Anúncios"]),
      asset_type: SheetNormalizer.toString(raw["Tipo de Recurso"]),
      asset_text: SheetNormalizer.toString(raw["Recurso (Texto)"]),
      metrics_source: SheetNormalizer.toString(raw["Origem das Métricas"]),
      impressions: SheetNormalizer.toInteger(raw["Impressões"]),
      clicks: SheetNormalizer.toInteger(raw["Cliques"]),
      cost: SheetNormalizer.toNumber(raw["Custo (R$)"]),
      conversions: SheetNormalizer.toInteger(raw["Conversões"]),
      chave_ia: SheetNormalizer.toString(raw["Chave_IA"]),
    })));
    return { tabName, data, errors: validator.getErrors() };
  },

  /**
   * Aba: Meta (Key-Value)
   */
  readMeta(rows: any[][]): NormalizedSheetData<any> {
    return this.readKeyValueTab(rows, "Meta");
  },

  /**
   * Aba: Dashboard_Config (Key-Value)
   */
  readConfig(rows: any[][]): NormalizedSheetData<any> {
    return this.readKeyValueTab(rows, "Dashboard_Config");
  },

  /**
   * Utilitário para abas formato Chave/Valor
   */
  readKeyValueTab(rows: any[][], tabName: string): NormalizedSheetData<any> {
    const validator = new SheetValidator(tabName);
    if (rows.length === 0) return { tabName, data: [], errors: [{ level: "error", message: "Aba vazia", tab: tabName }] };
    
    const data: Record<string, any> = {};
    const presentKeys: string[] = [];

    rows.forEach(row => {
      if (row[0] !== undefined && row[0] !== null) {
        const key = SheetNormalizer.toString(row[0]) || "";
        data[key] = SheetNormalizer.toString(row[1]);
        presentKeys.push(key);
      }
    });

    // Valida chaves críticas se houver schema
    const tabSchema = GOOGLE_ADS_S4X_SCHEMA.tabs[tabName];
    if (tabSchema?.criticalKeys) {
      tabSchema.criticalKeys.forEach(key => {
        if (!presentKeys.includes(key)) {
          validator.addError("error", `Chave crítica ausente na aba ${tabName}: ${key}`, undefined, "Chave");
        }
      });
    }

    return { tabName, data: [data], errors: validator.getErrors() };
  },

  /**
   * Aba: Performance Diária (S4X)
   */
  readPerformanceDailyS4X(rows: any[][]): NormalizedSheetData<GoogleAdsS4XDailyPerformance> {
    const tabName = "Performance Diária";
    const validator = new SheetValidator(tabName);
    if (rows.length === 0) return { tabName, data: [], errors: [] };
    const headers = rows[0].map((h: any) => String(h).trim());
    const data = rows.slice(1)
      .filter(row => row[0] && !SheetNormalizer.shouldIgnoreRow(row[0]))
      .map((row) => mapRowToModel(headers, row, (raw) => ({
        date: SheetNormalizer.toDate(raw["Data"]) || "",
        campaignName: SheetNormalizer.toString(raw["Campanha"]) || "",
        campaignStatus: SheetNormalizer.toString(raw["Status da Campanha"]) || "",
        channelType: SheetNormalizer.toString(raw["Tipo de Canal"]) || "",
        aggregationScope: SheetNormalizer.toString(raw["Escopo_Agregacao"]),
        impressions: SheetNormalizer.toInteger(raw["Impressões"]),
        clicks: SheetNormalizer.toInteger(raw["Cliques"]),
        ctr: SheetNormalizer.toPercent(raw["CTR"]),
        avgCpc: SheetNormalizer.toNumber(raw["CPC Médio (R$)"]),
        cost: SheetNormalizer.toNumber(raw["Custo (R$)"]),
        conversions: SheetNormalizer.toNumber(raw["Conversões"]),
        conversionValue: SheetNormalizer.toNumber(raw["Valor das Conversões (R$)"]),
        costPerConversion: SheetNormalizer.toNumber(raw["Custo por Conversão (R$)"]),
        allConversions: SheetNormalizer.toNumber(raw["Todas as Conversões"]),
        allConversionsValue: SheetNormalizer.toNumber(raw["Valor Total Conversões (R$)"]),
        avgCpm: SheetNormalizer.toNumber(raw["CPM Médio (R$)"]),
        conversionRate: SheetNormalizer.toPercent(raw["Taxa de Conversão"]),
        roas: SheetNormalizer.toNumber(raw["ROAS"]),
        aiKey: SheetNormalizer.toString(raw["Chave_IA"]),
      })));
    return { tabName, data, errors: validator.getErrors() };
  },

  /**
   * Aba: Campanhas (S4X)
   */
  readCampaignsS4X(rows: any[][]): NormalizedSheetData<GoogleAdsS4XCampaign> {
    const tabName = "Campanhas";
    const validator = new SheetValidator(tabName);
    if (rows.length === 0) return { tabName, data: [], errors: [] };
    const headers = rows[0].map((h: any) => String(h).trim());
    const data = rows.slice(1)
      .filter(row => row[0] && !SheetNormalizer.shouldIgnoreRow(row[0]))
      .map((row) => mapRowToModel(headers, row, (raw) => ({
        campaignName: SheetNormalizer.toString(raw["Campanha"]) || "",
        campaignStatus: SheetNormalizer.toString(raw["Status da Campanha"]) || "",
        channelType: SheetNormalizer.toString(raw["Tipo de Canal"]) || "",
        aggregationScope: SheetNormalizer.toString(raw["Escopo_Agregacao"]),
        impressions: SheetNormalizer.toInteger(raw["Impressões"]),
        clicks: SheetNormalizer.toInteger(raw["Cliques"]),
        ctr: SheetNormalizer.toPercent(raw["CTR"]),
        avgCpc: SheetNormalizer.toNumber(raw["CPC Médio (R$)"]),
        cost: SheetNormalizer.toNumber(raw["Custo (R$)"]),
        conversions: SheetNormalizer.toNumber(raw["Conversões"]),
        conversionValue: SheetNormalizer.toNumber(raw["Valor das Conversões (R$)"]),
        costPerConversion: SheetNormalizer.toNumber(raw["Custo por Conversão (R$)"]),
        allConversions: SheetNormalizer.toNumber(raw["Todas as Conversões"]),
        allConversionsValue: SheetNormalizer.toNumber(raw["Valor Total Conversões (R$)"]),
        interactionRate: SheetNormalizer.toPercent(raw["Taxa de Interação"]),
        interactions: SheetNormalizer.toInteger(raw["Interações"]),
        searchImpressionShare: SheetNormalizer.toPercent(raw["Parcela de impr. da rede de pesquisa"]),
        searchRankLostImpressionShare: SheetNormalizer.toPercent(raw["Perda por Rank (Search)"]),
        searchBudgetLostImpressionShare: SheetNormalizer.toPercent(raw["Perda por Orçamento (Search)"]),
        avgCpm: SheetNormalizer.toNumber(raw["CPM Médio (R$)"]),
        conversionRate: SheetNormalizer.toPercent(raw["Taxa de Conversão"]),
        roas: SheetNormalizer.toNumber(raw["ROAS"]),
        aiKey: SheetNormalizer.toString(raw["Chave_IA"]),
      })));
    return { tabName, data, errors: validator.getErrors() };
  },

  /**
   * Aba: Grupos de Anúncios (S4X)
   */
  readAdGroupsS4X(rows: any[][]): NormalizedSheetData<GoogleAdsS4XAdGroup> {
    const tabName = "Grupos de Anúncios";
    const validator = new SheetValidator(tabName);
    if (rows.length === 0) return { tabName, data: [], errors: [] };
    const headers = rows[0].map((h: any) => String(h).trim());
    const data = rows.slice(1)
      .filter(row => row[0] && !SheetNormalizer.shouldIgnoreRow(row[0]))
      .map((row) => mapRowToModel(headers, row, (raw) => ({
        campaignName: SheetNormalizer.toString(raw["Campanha"]) || "",
        adGroupName: SheetNormalizer.toString(raw["Grupo de Anúncios"]) || "",
        adGroupStatus: SheetNormalizer.toString(raw["Status do Grupo"]) || "",
        aggregationScope: SheetNormalizer.toString(raw["Escopo_Agregacao"]),
        impressions: SheetNormalizer.toInteger(raw["Impressões"]),
        clicks: SheetNormalizer.toInteger(raw["Cliques"]),
        ctr: SheetNormalizer.toPercent(raw["CTR"]),
        avgCpc: SheetNormalizer.toNumber(raw["CPC Médio (R$)"]),
        cost: SheetNormalizer.toNumber(raw["Custo (R$)"]),
        conversions: SheetNormalizer.toNumber(raw["Conversões"]),
        conversionValue: SheetNormalizer.toNumber(raw["Valor das Conversões (R$)"]),
        costPerConversion: SheetNormalizer.toNumber(raw["Custo por Conversão (R$)"]),
        allConversions: SheetNormalizer.toNumber(raw["Todas as Conversões"]),
        allConversionsValue: SheetNormalizer.toNumber(raw["Valor Total Conversões (R$)"]),
        interactions: SheetNormalizer.toInteger(raw["Interações"]),
        interactionRate: SheetNormalizer.toPercent(raw["Taxa de Interação"]),
        avgCost: SheetNormalizer.toNumber(raw["Custo Médio (R$)"]),
        avgCpm: SheetNormalizer.toNumber(raw["CPM Médio (R$)"]),
        conversionRate: SheetNormalizer.toPercent(raw["Taxa de Conversão"]),
        roas: SheetNormalizer.toNumber(raw["ROAS"]),
        aiKey: SheetNormalizer.toString(raw["Chave_IA"]),
      })));
    return { tabName, data, errors: validator.getErrors() };
  },

  /**
   * Aba: Palavras-Chave (S4X)
   */
  readKeywordsS4X(rows: any[][]): NormalizedSheetData<GoogleAdsS4XKeyword> {
    const tabName = "Palavras-Chave";
    const validator = new SheetValidator(tabName);
    if (rows.length === 0) return { tabName, data: [], errors: [] };
    const headers = rows[0].map((h: any) => String(h).trim());
    const data = rows.slice(1)
      .filter(row => row[0] && !SheetNormalizer.shouldIgnoreRow(row[0]))
      .map((row) => mapRowToModel(headers, row, (raw) => ({
        campaignName: SheetNormalizer.toString(raw["Campanha"]) || "",
        adGroupName: SheetNormalizer.toString(raw["Grupo de Anúncios"]) || "",
        keyword: SheetNormalizer.toString(raw["Palavra-chave"]) || "",
        matchType: SheetNormalizer.toString(raw["Tipo de Correspondência"]) || "",
        status: SheetNormalizer.toString(raw["Status"]) || "",
        aggregationScope: SheetNormalizer.toString(raw["Escopo_Agregacao"]),
        qualityScore: SheetNormalizer.toInteger(raw["Índice de Qualidade"]),
        creativeQualityScore: SheetNormalizer.toString(raw["Qualidade Criativa"]),
        postClickQualityScore: SheetNormalizer.toString(raw["Qualidade Pós-clique"]),
        searchPredictedCtr: SheetNormalizer.toString(raw["CTR Previsto (Search)"]),
        impressions: SheetNormalizer.toInteger(raw["Impressões"]),
        clicks: SheetNormalizer.toInteger(raw["Cliques"]),
        ctr: SheetNormalizer.toPercent(raw["CTR"]),
        avgCpc: SheetNormalizer.toNumber(raw["CPC Médio (R$)"]),
        cost: SheetNormalizer.toNumber(raw["Custo (R$)"]),
        conversions: SheetNormalizer.toNumber(raw["Conversões"]),
        conversionValue: SheetNormalizer.toNumber(raw["Valor das Conversões (R$)"]),
        costPerConversion: SheetNormalizer.toNumber(raw["Custo por Conversão (R$)"]),
        allConversions: SheetNormalizer.toNumber(raw["Todas as Conversões"]),
        allConversionsValue: SheetNormalizer.toNumber(raw["Valor Total Conversões (R$)"]),
        conversionRate: SheetNormalizer.toPercent(raw["Taxa de Conversão"]),
        roas: SheetNormalizer.toNumber(raw["ROAS"]),
        aiKey: SheetNormalizer.toString(raw["Chave_IA"]),
      })));
    return { tabName, data, errors: validator.getErrors() };
  },

  /**
   * Aba: Termos de Pesquisa (S4X)
   */
  readSearchTermsS4X(rows: any[][]): NormalizedSheetData<GoogleAdsS4XSearchTerm> {
    const tabName = "Termos de Pesquisa";
    const validator = new SheetValidator(tabName);
    if (rows.length === 0) return { tabName, data: [], errors: [] };
    const headers = rows[0].map((h: any) => String(h).trim());
    const data = rows.slice(1)
      .filter(row => row[0] && !SheetNormalizer.shouldIgnoreRow(row[0]))
      .map((row) => mapRowToModel(headers, row, (raw) => ({
        campaignName: SheetNormalizer.toString(raw["Campanha"]) || "",
        adGroupName: SheetNormalizer.toString(raw["Grupo de Anúncios"]) || "",
        termMatchType: SheetNormalizer.toString(raw["Tipo de Correspondência (Termo)"]) || "",
        searchTerm: SheetNormalizer.toString(raw["Termo de Pesquisa"]) || "",
        termStatus: SheetNormalizer.toString(raw["Status do Termo"]) || "",
        aggregationScope: SheetNormalizer.toString(raw["Escopo_Agregacao"]),
        impressions: SheetNormalizer.toInteger(raw["Impressões"]),
        clicks: SheetNormalizer.toInteger(raw["Cliques"]),
        ctr: SheetNormalizer.toPercent(raw["CTR"]),
        avgCpc: SheetNormalizer.toNumber(raw["CPC Médio (R$)"]),
        cost: SheetNormalizer.toNumber(raw["Custo (R$)"]),
        conversions: SheetNormalizer.toNumber(raw["Conversões"]),
        conversionValue: SheetNormalizer.toNumber(raw["Valor das Conversões (R$)"]),
        costPerConversion: SheetNormalizer.toNumber(raw["Custo por Conversão (R$)"]),
        allConversions: SheetNormalizer.toNumber(raw["Todas as Conversões"]),
        allConversionsValue: SheetNormalizer.toNumber(raw["Valor Total Conversões (R$)"]),
        avgCpm: SheetNormalizer.toNumber(raw["CPM Médio (R$)"]),
        conversionRate: SheetNormalizer.toPercent(raw["Taxa de Conversão"]),
        roas: SheetNormalizer.toNumber(raw["ROAS"]),
        aiKey: SheetNormalizer.toString(raw["Chave_IA"]),
      })));
    return { tabName, data, errors: validator.getErrors() };
  },

  /**
   * Aba: Palavras-Chave Negativas (S4X)
   */
  readNegativeKeywordsS4X(rows: any[][]): NormalizedSheetData<GoogleAdsS4XNegativeKeyword> {
    const tabName = "Palavras-Chave Negativas";
    const validator = new SheetValidator(tabName);
    if (rows.length === 0) return { tabName, data: [], errors: [] };
    const headers = rows[0].map((h: any) => String(h).trim());
    const data = rows.slice(1)
      .filter(row => row[0] && !SheetNormalizer.shouldIgnoreRow(row[0]))
      .map((row) => mapRowToModel(headers, row, (raw) => ({
        campaignName: SheetNormalizer.toString(raw["Campanha"]) || "",
        negativeOrigin: SheetNormalizer.toString(raw["Origem da Negativa"]) || "",
        negativeList: SheetNormalizer.toString(raw["Lista Negativa"]) || "",
        negativeKeyword: SheetNormalizer.toString(raw["Palavra-Chave Negativa"]) || "",
        matchType: SheetNormalizer.toString(raw["Tipo de Correspondência"]) || "",
        aiKey: SheetNormalizer.toString(raw["Chave_IA"]),
      })));
    return { tabName, data, errors: validator.getErrors() };
  },

  /**
   * Aba: Anúncios (Recursos) (S4X)
   */
  readAdsAssetsS4X(rows: any[][]): NormalizedSheetData<GoogleAdsS4XAdAsset> {
    const tabName = "Anúncios (Recursos)";
    const validator = new SheetValidator(tabName);
    if (rows.length === 0) return { tabName, data: [], errors: [] };
    const headers = rows[0].map((h: any) => String(h).trim());
    const data = rows.slice(1)
      .filter(row => row[0] && !SheetNormalizer.shouldIgnoreRow(row[0]))
      .map((row) => mapRowToModel(headers, row, (raw) => ({
        campaignName: SheetNormalizer.toString(raw["Campanha"]) || "",
        adGroupName: SheetNormalizer.toString(raw["Grupo de Anúncios"]) || "",
        adStatus: SheetNormalizer.toString(raw["Status do Anúncio"]) || "",
        assetType: SheetNormalizer.toString(raw["Tipo de Recurso"]) || "",
        assetText: SheetNormalizer.toString(raw["Recurso (Texto)"]) || "",
        metricsOrigin: SheetNormalizer.toString(raw["Origem das Métricas"]) || "",
        aggregationScope: SheetNormalizer.toString(raw["Escopo_Agregacao"]),
        impressions: SheetNormalizer.toInteger(raw["Impressões"]),
        clicks: SheetNormalizer.toInteger(raw["Cliques"]),
        ctr: SheetNormalizer.toPercent(raw["CTR"]),
        avgCpc: SheetNormalizer.toNumber(raw["CPC Médio (R$)"]),
        cost: SheetNormalizer.toNumber(raw["Custo (R$)"]),
        conversions: SheetNormalizer.toNumber(raw["Conversões"]),
        conversionValue: SheetNormalizer.toNumber(raw["Valor das Conversões (R$)"]),
        costPerConversion: SheetNormalizer.toNumber(raw["Custo por Conversão (R$)"]),
        allConversions: SheetNormalizer.toNumber(raw["Todas as Conversões"]),
        allConversionsValue: SheetNormalizer.toNumber(raw["Valor Total Conversões (R$)"]),
        avgCpm: SheetNormalizer.toNumber(raw["CPM Médio (R$)"]),
        conversionRate: SheetNormalizer.toPercent(raw["Taxa de Conversão"]),
        roas: SheetNormalizer.toNumber(raw["ROAS"]),
        aiKey: SheetNormalizer.toString(raw["Chave_IA"]),
        isAggregatable: false,
      })));
    return { tabName, data, errors: validator.getErrors() };
  }
};
