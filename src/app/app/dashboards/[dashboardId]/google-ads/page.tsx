"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { KpiGrid } from "@/components/dashboard/MetricCard";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { LineChartWidget } from "@/components/dashboard/LineChartWidget";
import { HorizontalBarChartWidget } from "@/components/dashboard/BarChartWidget";
import { DataTableWidget } from "@/components/dashboard/DataTableWidget";
import { formatCurrency, formatNumber, formatDateShort } from "@/lib/formatters";
import { useDashboard } from "@/components/dashboard/DashboardDataContext";
import { generateGoogleAdsKpis } from "@/lib/dashboard/kpi-generator";
import { TemplateEmptyState } from "@/components/dashboard/TemplateEmptyState";
import { normalizeGoogleAdsRowsToPeriod } from "@/lib/dashboard/google-ads-period-model";
import { applyTemplateMetricConfigToKpis, getDefaultTemplateMetricConfig, getTemplateMetricSection, getTemplateSectionWidgets, getMetricLabel, type TemplateWidgetItem } from "@/lib/dashboard/template-metric-config";
import type { KpiSummary } from "@/types/entities";

function mapIntegratedGoogleMetricKeys(metrics: KpiSummary[]): KpiSummary[] {
  return metrics.map((kpi) => {
    switch (kpi.metricKey) {
      case "cost":
        return { ...kpi, metricKey: "google_cost", label: kpi.label === "Investimento" ? "Investimento Google Ads" : kpi.label };
      case "impressions":
        return { ...kpi, metricKey: "google_impressions", label: kpi.label === "Impressões" ? "Impressões Google Ads" : kpi.label };
      case "clicks":
        return { ...kpi, metricKey: "google_clicks", label: kpi.label === "Cliques" ? "Cliques Google Ads" : kpi.label };
      case "ctr":
        return { ...kpi, metricKey: "google_ctr", label: kpi.label === "CTR Médio" ? "CTR Google Ads" : kpi.label };
      case "cpc":
        return { ...kpi, metricKey: "google_cpc", label: kpi.label === "CPC Médio" ? "CPC Google Ads" : kpi.label };
      case "cpa":
        return { ...kpi, metricKey: "google_cpa", label: kpi.label === "CPA Médio" ? "CPA Google Ads" : kpi.label };
      case "roas":
        return { ...kpi, metricKey: "google_roas", label: kpi.label === "ROAS" ? "ROAS Google Ads" : kpi.label };
      case "conversions":
        return { ...kpi, metricKey: "google_conversions", label: kpi.label === "Conversões" ? "Conversões Google Ads" : kpi.label };
      default:
        return kpi;
    }
  });
}

function normalizeMetricKey(key?: string | null) {
  return String(key || "").trim().toLowerCase().replace(/^(google_|meta_)/, "");
}

function renderGoogleMetricValue(source: any, key?: string | null) {
  if (!key) return 0;
  const normalized = normalizeMetricKey(key);
  switch (normalized) {
    case "cost":
      return Number(source.cost ?? source.value ?? source.total_spend ?? 0);
    case "revenue":
      return Number(source.revenue ?? source.total_revenue ?? source.conversionValue ?? 0);
    case "impressions":
      return Number(source.impressions ?? source.total_impressions ?? 0);
    case "clicks":
      return Number(source.clicks ?? source.total_clicks ?? 0);
    case "ctr":
      return Number(source.ctr ?? 0);
    case "cpc":
      return Number(source.cpc ?? 0);
    case "cpa":
      return Number(source.cpa ?? 0);
    case "roas":
      return Number(source.roas ?? 0);
    case "conversions":
      return Number(source.conversions ?? source.total_conversions ?? 0);
    default:
      return Number(source[normalized] ?? source[key as string] ?? 0);
  }
}

export default function GoogleAdsPage() {
  const { data } = useDashboard();

  if (!data) return null;

  const templateConfig = data.templateConfig || getDefaultTemplateMetricConfig(data.templateId || "google_ads_s4x");
  const hasGoogleAdsSection = Boolean(getTemplateMetricSection(templateConfig, "google-ads"));
  const isIntegratedTemplate = data.templateId === "google_meta_ads_s4x" || hasGoogleAdsSection;
  const hasData = data.google_ads && data.google_ads.length > 0;
  
  if (!hasData && data.source !== "mock") {
    return (
      <DashboardPageShell title="Google Ads" subtitle="Desempenho de campanhas, grupos e palavras-chave">
        <TemplateEmptyState 
          title="Dados do Google Ads"
          description="Ainda não foram encontrados dados do Google Ads. Verifique se a planilha conectada segue o modelo S4X."
        />
      </DashboardPageShell>
    );
  }

  const kpis = applyTemplateMetricConfigToKpis(
    isIntegratedTemplate
      ? mapIntegratedGoogleMetricKeys(generateGoogleAdsKpis(data.google_ads, data.google_ads_summary))
      : generateGoogleAdsKpis(data.google_ads, data.google_ads_summary),
    templateConfig,
    "google-ads",
    data.templateId || "google_ads_s4x"
  ) as KpiSummary[];

  const dailySeries = data.google_ads.map((r: any) => ({
    date: formatDateShort(r.date),
    cost: Number(r.cost ?? r.value ?? 0),
    clicks: Number(r.clicks ?? 0),
    impressions: Number(r.impressions ?? 0),
    conversions: Number(r.conversions ?? 0),
    ctr: Number(r.ctr ?? 0),
    cpc: Number(r.cpc ?? 0),
    cpa: Number(r.cpa ?? 0),
    roas: Number(r.roas ?? 0),
  }));

  const normalizedCampaigns = normalizeGoogleAdsRowsToPeriod(
    Array.isArray(data.campaigns) ? data.campaigns : [],
    Array.isArray(data.dailyPerformance) ? data.dailyPerformance : [],
    Array.isArray(data.campaigns) ? data.campaigns : [],
  );
  const googleCampaigns = normalizedCampaigns.filter((c: any) => {
    const platform = String(c.platform || "").toLowerCase();
    return (
      platform.includes("google")
      || data.templateId === "google_ads_s4x"
      || data.templateId === "google_meta_ads_s4x"
    );
  });

  const normalizedKeywords = normalizeGoogleAdsRowsToPeriod(
    Array.isArray(data.keywords) ? data.keywords : [],
    Array.isArray(data.dailyPerformance) ? data.dailyPerformance : [],
    Array.isArray(data.campaigns) ? data.campaigns : [],
  );

  const campaignBarData = googleCampaigns.slice(0, 10).map((c: any) => ({
    label: (c.campaignName || c.campaign_name || "").substring(0, 28) + ((c.campaignName || c.campaign_name || "").length > 28 ? "..." : ""),
    value: c.cost,
    roas: c.roas,
  }));

  const googleSectionWidgets = getTemplateSectionWidgets(templateConfig, "google-ads");
  const defaultGoogleSectionWidgets = getDefaultTemplateMetricConfig(data.templateId || "google_ads_s4x").sections["google-ads"]?.widgets || [];
  const resolvedGoogleWidgets = (googleSectionWidgets.length > 0 ? googleSectionWidgets : defaultGoogleSectionWidgets)
    .filter((widget) => widget.enabled)
    .sort((a, b) => a.order - b.order);
  const googleWidgetRows = (() => {
    const rows: TemplateWidgetItem[][] = [];
    let currentRow: TemplateWidgetItem[] = [];
    let currentSum = 0;
    resolvedGoogleWidgets.forEach((widget) => {
      const width = Math.max(10, Math.min(100, widget.widthPercent ?? 100));
      const nextSum = currentSum + width;
      if (currentRow.length > 0 && nextSum > 100.01) {
        rows.push(currentRow);
        currentRow = [widget];
        currentSum = width;
        return;
      }
      currentRow.push(widget);
      currentSum = nextSum;
      if (currentSum >= 99.5) {
        rows.push(currentRow);
        currentRow = [];
        currentSum = 0;
      }
    });
    if (currentRow.length > 0) rows.push(currentRow);
    return rows;
  })();
  const googlePerformanceSectionWidgets = getTemplateSectionWidgets(templateConfig, "google-performance");
  const defaultGooglePerformanceSectionWidgets = getDefaultTemplateMetricConfig(data.templateId || "google_ads_s4x").sections["google-performance"]?.widgets || [];
  const resolvedGooglePerformanceWidgets = (googlePerformanceSectionWidgets.length > 0 ? googlePerformanceSectionWidgets : defaultGooglePerformanceSectionWidgets)
    .filter((widget) => widget.enabled)
    .sort((a, b) => a.order - b.order);
  const googlePerformanceWidgetRows = (() => {
    const rows: TemplateWidgetItem[][] = [];
    let currentRow: TemplateWidgetItem[] = [];
    let currentSum = 0;
    resolvedGooglePerformanceWidgets.forEach((widget) => {
      const width = Math.max(10, Math.min(100, widget.widthPercent ?? 100));
      const nextSum = currentSum + width;
      if (currentRow.length > 0 && nextSum > 100.01) {
        rows.push(currentRow);
        currentRow = [widget];
        currentSum = width;
        return;
      }
      currentRow.push(widget);
      currentSum = nextSum;
      if (currentSum >= 99.5) {
        rows.push(currentRow);
        currentRow = [];
        currentSum = 0;
      }
    });
    if (currentRow.length > 0) rows.push(currentRow);
    return rows;
  })();

  const googleCurrent = (data.google_ads_summary?.current || {}) as any;
  const googleChange = (data.google_ads_summary?.change || {}) as any;
  const resolveGoogleCurrentSummaryValue = (key?: string | null) => renderGoogleMetricValue(googleCurrent, key);
  const resolveGooglePreviousSummaryValue = (key?: string | null) => {
    if (!key) return 0;
    const normalized = normalizeMetricKey(key);
    const currentValue = resolveGoogleCurrentSummaryValue(key);
    const changeValue = Number(googleChange[normalized] ?? googleChange[`total_${normalized}`] ?? 0);
    if (!Number.isFinite(changeValue) || changeValue === -100) return currentValue;
    const factor = 1 + changeValue / 100;
    if (factor === 0) return currentValue;
    return currentValue / factor;
  };

  const renderGoogleWidgetCard = (widget: TemplateWidgetItem, rowCardCount: number) => {
    const title = widget.label || getMetricLabel(data.templateId || "google_ads_s4x", widget.key);
    const widthPercent = Math.max(10, Math.min(100, widget.widthPercent ?? 100));
    const rowGapPx = 20;
    const rowGapTotal = Math.max(0, rowCardCount - 1) * rowGapPx;
    const wrapperStyle = {
      flex: `0 0 calc((100% - ${rowGapTotal}px) * ${widthPercent / 100})`,
      maxWidth: `calc((100% - ${rowGapTotal}px) * ${widthPercent / 100})`,
      minWidth: 0,
      width: "100%",
    } as const;

    if (widget.kind === "bar_chart") {
      const barData = googleCampaigns.slice(0, 10).map((c: any) => ({
        label: (c.campaignName || c.campaign_name || "").substring(0, 28) + ((c.campaignName || c.campaign_name || "").length > 28 ? "..." : ""),
        value: renderGoogleMetricValue(c, widget.primaryMetricKey || "cost"),
      }));
      return (
        <div key={widget.key} style={wrapperStyle}>
          <ChartCard title={title} subtitle="Distribuição por campanha" height={280}>
            <HorizontalBarChartWidget data={barData} formatValue={(v) => formatCurrency(v, true)} height={240} />
          </ChartCard>
        </div>
      );
    }

    if (widget.kind === "comparison_chart") {
      const comparisonData = [widget.primaryMetricKey, widget.secondaryMetricKey]
        .filter(Boolean)
        .map((metricKey) => ({
          metrica: getMetricLabel(data.templateId || "google_ads_s4x", metricKey as string),
          atual: resolveGoogleCurrentSummaryValue(metricKey),
          anterior: resolveGooglePreviousSummaryValue(metricKey),
        }));
      return (
        <div key={widget.key} style={wrapperStyle}>
          <ChartCard title={title} subtitle="Atual x anterior" height={280}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={comparisonData} margin={{ top: 10, right: 10, bottom: 0, left: -15 }}>
                <CartesianGrid stroke="#E2E8F0" vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="metrica" tick={{ fill: "#111827", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "#E2E8F0" }} />
                <YAxis tick={{ fill: "#6B7280", fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip formatter={(value) => [formatCurrency(Number(value), true), undefined]} />
                <Legend verticalAlign="top" align="left" iconType="circle" wrapperStyle={{ paddingBottom: 12 }} />
                <Bar dataKey="atual" name="Período atual" fill="#2563EB" radius={[4, 4, 0, 0]} barSize={24} />
                <Bar dataKey="anterior" name="Anterior" fill="#BFDBFE" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      );
    }

    const trendData = dailySeries.map((row: any) => ({
      date: row.date,
      primary: renderGoogleMetricValue(row, widget.primaryMetricKey || "cost"),
      secondary: widget.secondaryMetricKey ? renderGoogleMetricValue(row, widget.secondaryMetricKey) : 0,
    }));
    const primaryLabel = getMetricLabel(data.templateId || "google_ads_s4x", widget.primaryMetricKey || "cost");
    const secondaryLabel = widget.secondaryMetricKey ? getMetricLabel(data.templateId || "google_ads_s4x", widget.secondaryMetricKey) : "Série";
    return (
      <div key={widget.key} style={wrapperStyle}>
        <ChartCard title={title} subtitle="Evolução no período" height={280}>
          <LineChartWidget
            data={trendData}
            lines={[
              { key: "primary", label: primaryLabel, color: "#4285F4" },
              ...(widget.secondaryMetricKey ? [{ key: "secondary", label: secondaryLabel, color: "#60A5FA" }] : []),
            ]}
            xKey="date"
            formatValue={(v) => (typeof v === "number" && v > 50 ? formatCurrency(v, true) : String(v))}
            height={240}
          />
        </ChartCard>
      </div>
    );
  };

  return (
    <DashboardPageShell title="Google Ads" subtitle="Desempenho de campanhas, grupos e palavras-chave">
      <KpiGrid metrics={kpis} columns={3} />

      {googleWidgetRows.length > 0 ? (
        <div className="flex flex-col gap-5">
          {googleWidgetRows.map((row, rowIndex) => (
            <div key={`google-widgets-${rowIndex}`} className="flex flex-wrap gap-5">
              {row.map((widget) => renderGoogleWidgetCard(widget, row.length))}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: 16, borderRadius: 12, border: "1px dashed #CBD5E1", background: "#F8FAFC", color: "#64748B", fontSize: 13 }}>
          Nenhum gráfico configurado na seção da aba Google Ads. Use o editor de template para incluir os widgets desta aba.
        </div>
      )}

      {googlePerformanceWidgetRows.length > 0 ? (
        <div className="flex flex-col gap-5" style={{ marginTop: 20 }}>
          {googlePerformanceWidgetRows.map((row, rowIndex) => (
            <div key={`google-performance-widgets-${rowIndex}`} className="flex flex-wrap gap-5">
              {row.map((widget) => renderGoogleWidgetCard(widget, row.length))}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: 16, borderRadius: 12, border: "1px dashed #CBD5E1", background: "#F8FAFC", color: "#64748B", fontSize: 13, marginTop: 20 }}>
          Nenhum gráfico configurado na seção interna de performance do Google Ads. Use o editor de template para incluir os widgets desta área.
        </div>
      )}

      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: "#0F172A", marginBottom: 16 }}>Campanhas</h3>
        <DataTableWidget
          data={googleCampaigns as unknown as Record<string, unknown>[]}
          columns={[
            { key: "campaignName", label: "Campanha", render: (v, row) => <span style={{ fontWeight: 500, color: "#1E293B", maxWidth: 220, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{String(v || row.campaign_name || "")}</span> },
            { key: "impressions", label: "Impressões", align: "right", render: (v) => formatNumber(Number(v)) },
            { key: "clicks", label: "Cliques", align: "right", render: (v) => formatNumber(Number(v)) },
            { key: "ctr", label: "CTR", align: "right", render: (v) => `${Number(v).toFixed(2)}%` },
            { key: "cost", label: "Custo", align: "right", render: (v) => formatCurrency(Number(v)) },
            { key: "conversions", label: "Conv.", align: "right" },
            { key: "roas", label: "ROAS", align: "right", render: (v) => <span style={{ fontWeight: 600, color: Number(v) >= 4 ? "#16A34A" : "#DC2626" }}>{Number(v).toFixed(2)}x</span> },
            { key: "campaignStatus", label: "Status", render: (v, row) => {
              const status = v || row.status || row.campaignStatus || "ENABLED";
              const isActive = status === "active" || status === "ENABLED";
              return <span style={{ padding: "2px 8px", borderRadius: 99, background: isActive ? "#DCFCE7" : "#FEE2E2", color: isActive ? "#16A34A" : "#DC2626", fontSize: 11, fontWeight: 500 }}>{isActive ? "Ativa" : "Pausada"}</span> 
            }},
          ]}
        />
      </div>

      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: "#0F172A", marginBottom: 16 }}>Palavras-chave com Melhor Desempenho</h3>
        <DataTableWidget
          data={normalizedKeywords as unknown as Record<string, unknown>[]}
          columns={[
            { key: "keyword", label: "Palavra-chave", render: (v) => <span style={{ fontWeight: 500 }}>{String(v)}</span> },
            { key: "matchType", label: "Tipo", render: (v, row) => <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: "#F1F5F9", color: "#475569" }}>{String(v || row.match_type || "")}</span> },
            { key: "impressions", label: "Impr.", align: "right", render: (v) => formatNumber(Number(v)) },
            { key: "clicks", label: "Cliques", align: "right", render: (v) => formatNumber(Number(v)) },
            { key: "cost", label: "Custo", align: "right", render: (v) => formatCurrency(Number(v)) },
            { key: "conversions", label: "Conv.", align: "right" },
            { key: "qualityScore", label: "QS", align: "right", render: (v, row) => <span style={{ fontWeight: 600, color: Number(v || row.quality_score) >= 8 ? "#16A34A" : Number(v || row.quality_score) >= 5 ? "#D97706" : "#DC2626" }}>{String(v || row.quality_score || "—")}/10</span> },
          ]}
        />
      </div>
    </DashboardPageShell>
  );
}
