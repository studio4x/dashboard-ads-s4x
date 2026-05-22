export interface MetaAdsS4XMeta {
  accountName?: string | null;
  accountId?: string | null;
  periodToken?: string | null;
  dateStart?: string | null; // YYYY-MM-DD
  dateEnd?: string | null;   // YYYY-MM-DD
  queryCondition?: string | null;
  executedAt?: string | null;
  timezone?: string | null;
}

export interface MetaAdsS4XConfig {
  templateId: string;
  templateLabel: string;
  templateVersion: string;
  source: string;
  periodToken?: string | null;
  dateStart?: string | null;
  dateEnd?: string | null;
  notes?: string | null;
  metaObjectives?: string[];
  metaPrimaryObjective?: string | null;
}

export interface MetaAdsS4XSummary {
  impressions: number | null;
  clicks: number | null;
  cost: number | null;
  conversions: number | null; // Messaging Conversations Started
  ctr: number | null;
  avgCpc: number | null;
  cpa: number | null; // Cost per Messaging Conversations Started
  reach: number | null;
  frequency: number | null;
  cpm: number | null;
  postEngagement: number | null;
  postComments: number | null;
  postReactions: number | null;
  postShares: number | null;
}

export interface MetaAdsS4XDailyPerformance {
  date: string; // Day
  campaignName: string;
  adSetName: string;
  adName: string;
  reach: number | null;
  impressions: number | null;
  frequency: number | null;
  cost: number | null; // Amount Spent
  cpm: number | null; // CPM
  clicks: number | null; // Link Clicks
  cpc: number | null; // CPC (All)
  ctr: number | null; // CTR (All)
  conversions: number | null; // Messaging Conversations Started
  costPerConversion: number | null; // Cost per Messaging Conversations Started
  postEngagement: number | null;
  postComments: number | null;
  postReactions: number | null;
  postShares: number | null;
}

export interface MetaAdsS4XDiagnostics {
  templateValidation: any;
  schemaValidation: any;
  warnings: any[];
  errors: any[];
  exportLogs?: any[];
  rowCounts: Record<string, number>;
  ignoredRows: number;
  sourceSpreadsheetId: string;
  importedAt: string;
  snapshotVersion: string;
}

export interface MetaAdsS4XPayload {
  meta: MetaAdsS4XMeta;
  config: MetaAdsS4XConfig;
  summary: MetaAdsS4XSummary;
  dailyPerformance: MetaAdsS4XDailyPerformance[];
  diagnostics: MetaAdsS4XDiagnostics;
  metaObjectives?: string[];
  metaPrimaryObjective?: string | null;
  metaValidationStatus?: "not_configured" | "ok" | "missing_metrics";
  metaValidationNotes?: Record<string, unknown>;
}
