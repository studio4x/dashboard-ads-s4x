export type GoogleAdsConnectionStatus = "pending" | "active" | "expired" | "revoked" | "error";

export type GoogleAdsErrorClassification = "developer_token_production_access_required";

export interface GoogleAdsDiscoveryDiagnostic {
  operation: "customer" | "hierarchy";
  customerId: string;
  loginCustomerId: string | null;
  statusCode: number | null;
  apiStatus: string | null;
  errorCode: string | null;
  errorCodes: string[];
  requestId: string | null;
  classification: GoogleAdsErrorClassification | null;
  message: string;
}

export type GoogleAdsSyncInterval = "manual" | "one_hour" | "six_hours" | "twelve_hours" | "daily" | "weekly";

export interface GoogleAdsSettings {
  id: "default";
  client_id: string | null;
  api_version: string;
  default_history_days: number;
  default_lookback_days: number;
  default_sync_interval: GoogleAdsSyncInterval;
}

export interface GoogleAdsConnection {
  id: string;
  name: string;
  google_user_id: string;
  google_user_email: string | null;
  granted_scopes: string[];
  status: GoogleAdsConnectionStatus;
  last_validated_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface GoogleAdsAccessibleAccount {
  customerId: string;
  formattedCustomerId: string;
  descriptiveName: string;
  manager: boolean;
  testAccount: boolean | null;
  currencyCode: string | null;
  timeZone: string | null;
  status: string | null;
  level: number | null;
  parentManagerCustomerId: string | null;
  parentManagerName: string | null;
  loginCustomerId: string | null;
  loginCustomerName: string | null;
  directlyAccessible: boolean;
}

export interface GoogleAdsApiRow {
  customer?: Record<string, unknown>;
  customerClient?: Record<string, unknown>;
  campaign?: Record<string, unknown>;
  adGroup?: Record<string, unknown>;
  adGroupCriterion?: Record<string, unknown>;
  searchTermView?: Record<string, unknown>;
  campaignCriterion?: Record<string, unknown>;
  sharedCriterion?: Record<string, unknown>;
  sharedSet?: Record<string, unknown>;
  campaignSharedSet?: Record<string, unknown>;
  adGroupAd?: Record<string, unknown>;
  adGroupAdAssetView?: Record<string, unknown>;
  asset?: Record<string, unknown>;
  assetGroup?: Record<string, unknown>;
  assetGroupAsset?: Record<string, unknown>;
  accountBudget?: Record<string, unknown>;
  segments?: Record<string, unknown>;
  metrics?: Record<string, unknown>;
}

export interface GoogleAdsQueryResult {
  rows: GoogleAdsApiRow[];
  requestIds: string[];
}
