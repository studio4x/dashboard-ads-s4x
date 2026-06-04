import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TEMPLATE_ID = "g_ads_e_m_ads";
const VISIBLE_PAGES = ["executive-summary", "google-ads", "meta-ads"];

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias.");
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function metric(key, order, options = {}) {
  return {
    key,
    label: options.label,
    preview: options.preview,
    kind: options.kind || "standard",
    sourcePlatform: options.sourcePlatform || "mixed",
    primarySourcePlatform: options.primarySourcePlatform,
    secondarySourcePlatform: options.secondarySourcePlatform,
    compositeType: options.compositeType || "sum",
    primaryMetricKey: options.primaryMetricKey,
    secondaryMetricKey: options.secondaryMetricKey,
    enabled: options.enabled ?? true,
    displayMode: options.displayMode || "card",
    order,
    recommended: options.recommended ?? false,
  };
}

const MIXED_TEMPLATE_CONFIG = {
  version: 1,
  templateId: TEMPLATE_ID,
  objectives: [],
  primaryObjective: null,
  sections: {
    "executive-summary": {
      key: "executive-summary",
      label: "Resumo Executivo",
      metrics: [
        metric("cost_total", 10, {
          label: "Investimento Total",
          kind: "composite",
          sourcePlatform: "mixed",
          primarySourcePlatform: "google_ads",
          secondarySourcePlatform: "meta_ads",
          primaryMetricKey: "google_cost",
          secondaryMetricKey: "meta_cost",
          compositeType: "sum",
          displayMode: "card",
        }),
        metric("revenue", 20, { label: "Receita", sourcePlatform: "mixed", displayMode: "card" }),
        metric("impressions", 30, { label: "Impressões", sourcePlatform: "mixed", displayMode: "card" }),
        metric("clicks", 40, { label: "Cliques", sourcePlatform: "mixed", displayMode: "card" }),
        metric("reach", 50, { label: "Alcance", sourcePlatform: "mixed", displayMode: "card" }),
        metric("frequency", 60, { label: "Frequência", sourcePlatform: "mixed", displayMode: "text" }),
        metric("conversions", 70, { label: "Conversões", sourcePlatform: "mixed", displayMode: "card" }),
        metric("cpa", 80, { label: "CPA", sourcePlatform: "mixed", displayMode: "card" }),
        metric("roas", 90, { label: "ROAS", sourcePlatform: "mixed", displayMode: "card" }),
      ],
    },
    "google-ads": {
      key: "google-ads",
      label: "Google Ads",
      metrics: [
        metric("google_cost", 10, { label: "Investimento Google Ads", sourcePlatform: "google_ads", displayMode: "card", recommended: true }),
        metric("google_impressions", 20, { label: "Impressões Google Ads", sourcePlatform: "google_ads", displayMode: "text", recommended: true }),
        metric("google_clicks", 30, { label: "Cliques Google Ads", sourcePlatform: "google_ads", displayMode: "text", recommended: true }),
        metric("google_ctr", 40, { label: "CTR Google Ads", sourcePlatform: "google_ads", displayMode: "text", recommended: true }),
        metric("google_cpc", 50, { label: "CPC Google Ads", sourcePlatform: "google_ads", displayMode: "text", recommended: true }),
        metric("google_cpa", 60, { label: "CPA Google Ads", sourcePlatform: "google_ads", displayMode: "card", recommended: true }),
        metric("google_roas", 70, { label: "ROAS Google Ads", sourcePlatform: "google_ads", displayMode: "card", recommended: true }),
        metric("google_conversions", 80, { label: "Conversões Google Ads", sourcePlatform: "google_ads", displayMode: "card", recommended: true }),
      ],
    },
    "meta-ads": {
      key: "meta-ads",
      label: "Meta Ads",
      metrics: [
        metric("meta_cost", 10, { label: "Investimento Meta Ads", sourcePlatform: "meta_ads", displayMode: "card", recommended: true }),
        metric("meta_impressions", 20, { label: "Impressões Meta Ads", sourcePlatform: "meta_ads", displayMode: "text", recommended: true }),
        metric("meta_reach", 30, { label: "Alcance Meta Ads", sourcePlatform: "meta_ads", displayMode: "card", recommended: true }),
        metric("meta_clicks", 40, { label: "Cliques Meta Ads", sourcePlatform: "meta_ads", displayMode: "text", recommended: true }),
        metric("meta_ctr", 50, { label: "CTR Meta Ads", sourcePlatform: "meta_ads", displayMode: "text", recommended: true }),
        metric("meta_cpc", 60, { label: "CPC Meta Ads", sourcePlatform: "meta_ads", displayMode: "text", recommended: true }),
        metric("meta_cpa", 70, { label: "CPA Meta Ads", sourcePlatform: "meta_ads", displayMode: "card", recommended: true }),
        metric("meta_cpm", 80, { label: "CPM Meta Ads", sourcePlatform: "meta_ads", displayMode: "text", recommended: true }),
        metric("meta_frequency", 90, { label: "Frequência Meta Ads", sourcePlatform: "meta_ads", displayMode: "text", recommended: true }),
        metric("meta_postEngagement", 100, { label: "Engajamentos Meta Ads", sourcePlatform: "meta_ads", displayMode: "text", recommended: true }),
        metric("meta_conversions", 110, { label: "Conversões Meta Ads", sourcePlatform: "meta_ads", displayMode: "card", recommended: true }),
      ],
    },
  },
};

async function replaceDashboardPages(dashboardId) {
  const pages = [
    { page_key: "executive-summary", title: "Resumo Executivo", sort_order: 10 },
    { page_key: "google-ads", title: "Google Ads", sort_order: 20 },
    { page_key: "meta-ads", title: "Meta Ads", sort_order: 30 },
  ];

  const { error: deleteError } = await supabase.from("dashboard_pages").delete().eq("dashboard_id", dashboardId);
  if (deleteError) throw deleteError;

  const { error: insertError } = await supabase.from("dashboard_pages").insert(
    pages.map((page) => ({
      dashboard_id: dashboardId,
      page_key: page.page_key,
      title: page.title,
      sort_order: page.sort_order,
      is_enabled: true,
    }))
  );
  if (insertError) throw insertError;
}

async function main() {
  const templateUpdate = {
    base_template_id: "google_meta_ads_s4x",
    platform: "custom",
    source_type: "mixed",
    required_sheets: [],
    optional_sheets: [],
    visible_pages: VISIBLE_PAGES,
    metric_config: MIXED_TEMPLATE_CONFIG,
    updated_at: new Date().toISOString(),
  };

  const { data: templateRow, error: templateSelectError } = await supabase
    .from("dashboard_custom_templates")
    .select("*")
    .eq("template_id", TEMPLATE_ID)
    .maybeSingle();
  if (templateSelectError) throw templateSelectError;
  if (!templateRow) throw new Error(`Template ${TEMPLATE_ID} não encontrado.`);

  const { error: templateUpdateError } = await supabase
    .from("dashboard_custom_templates")
    .update(templateUpdate)
    .eq("template_id", TEMPLATE_ID);
  if (templateUpdateError) throw templateUpdateError;

  const { data: dashboards, error: dashboardSelectError } = await supabase
    .from("dashboards")
    .select("id")
    .eq("dashboard_type", TEMPLATE_ID);
  if (dashboardSelectError) throw dashboardSelectError;

  for (const dashboard of dashboards || []) {
    const { error: dashboardUpdateError } = await supabase
      .from("dashboards")
      .update({
        template_config: MIXED_TEMPLATE_CONFIG,
        template_version: "1.0",
        updated_at: new Date().toISOString(),
      })
      .eq("id", dashboard.id);
    if (dashboardUpdateError) throw dashboardUpdateError;

    await replaceDashboardPages(dashboard.id);
  }

  console.log(
    JSON.stringify(
      {
        templateId: TEMPLATE_ID,
        dashboardsUpdated: dashboards?.length || 0,
        visiblePages: VISIBLE_PAGES,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
