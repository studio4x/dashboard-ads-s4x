import { SheetNormalizer } from "./sheet-normalizer";
import { SheetValidator } from "./sheet-validator";
import { NormalizedSheetData } from "@/types/google-sheets";

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

    const data = rows.slice(1).map((row, index) => {
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

    const headers = rows[0];
    const required = ["date", "cost", "conversions"];
    validator.validateHeaders(headers, required);

    const data = rows.slice(1).map((row, index) => {
      return mapRowToModel(headers, row, (raw) => ({
        date: SheetNormalizer.toDate(raw.date),
        value: SheetNormalizer.toNumber(raw.cost), // valor diário
        impressions: SheetNormalizer.toInteger(raw.impressions),
        clicks: SheetNormalizer.toInteger(raw.clicks),
        conversions: SheetNormalizer.toInteger(raw.conversions),
        revenue: SheetNormalizer.toNumber(raw.revenue),
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

    const headers = rows[0];
    const required = ["campaign_name", "platform", "cost"];
    validator.validateHeaders(headers, required);

    const data = rows.slice(1).map((row, index) => {
      return mapRowToModel(headers, row, (raw) => ({
        campaign_name: SheetNormalizer.toString(raw.campaign_name),
        platform: SheetNormalizer.toString(raw.platform),
        impressions: SheetNormalizer.toInteger(raw.impressions),
        clicks: SheetNormalizer.toInteger(raw.clicks),
        cost: SheetNormalizer.toNumber(raw.cost),
        conversions: SheetNormalizer.toInteger(raw.conversions),
        revenue: SheetNormalizer.toNumber(raw.revenue),
        ctr: SheetNormalizer.toPercent(raw.ctr),
        cpc: SheetNormalizer.toNumber(raw.cpc),
        cpa: SheetNormalizer.toNumber(raw.cpa),
        roas: SheetNormalizer.toNumber(raw.roas),
        status: SheetNormalizer.toString(raw.status),
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
    const data = rows.slice(1).map((row) => mapRowToModel(headers, row, (raw) => ({
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
    const data = rows.slice(1).map((row) => mapRowToModel(headers, row, (raw) => ({
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
    const data = rows.slice(1).map((row) => mapRowToModel(headers, row, (raw) => ({
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
    const data = rows.slice(1).map((row) => mapRowToModel(headers, row, (raw) => ({
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
    const headers = rows[0];
    const data = rows.slice(1).map((row) => mapRowToModel(headers, row, (raw) => ({
      keyword: SheetNormalizer.toString(raw.keyword),
      match_type: SheetNormalizer.toString(raw.match_type),
      clicks: SheetNormalizer.toInteger(raw.clicks),
      impressions: SheetNormalizer.toInteger(raw.impressions),
      cost: SheetNormalizer.toNumber(raw.cost),
      conversions: SheetNormalizer.toInteger(raw.conversions),
      quality_score: SheetNormalizer.toInteger(raw.quality_score),
    })));
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
    const data = rows.slice(1).map((row) => mapRowToModel(headers, row, (raw) => ({
      insight_type: SheetNormalizer.toString(raw.insight_type) as any,
      title: SheetNormalizer.toString(raw.title),
      description: SheetNormalizer.toString(raw.description),
      source: SheetNormalizer.toString(raw.source),
      priority: SheetNormalizer.toInteger(raw.priority),
    })));
    return { tabName, data, errors: validator.getErrors() };
  }
};

