"use client";

import React, { useState } from "react";
import MetaAdsPage from "@/app/app/dashboards/[dashboardId]/meta-ads/page";
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { TemplateEmptyState } from "@/components/dashboard/TemplateEmptyState";
import { useDashboard } from "@/components/dashboard/DashboardDataContext";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import { getTemplateMetricSection } from "@/lib/dashboard/template-metric-config";

type Totals = {
  impressions: number;
  clicks: number;
  conversations: number;
  cost: number;
};

function aggregate(rows: any[]): Totals {
  return (rows || []).reduce(
    (acc, row) => {
      acc.impressions += Number(row?.impressions || 0);
      acc.clicks += Number(row?.clicks || 0);
      acc.conversations += Number(row?.conversions || row?.messagingConversationsStarted || 0);
      acc.cost += Number(row?.cost || 0);
      return acc;
    },
    { impressions: 0, clicks: 0, conversations: 0, cost: 0 } as Totals
  );
}

export default function MetaAdsMessagingFunnelPage() {
  const { data } = useDashboard();
  const [campaignFilter, setCampaignFilter] = useState("all");
  const [adSetFilter, setAdSetFilter] = useState("all");

  if (!data) return null;

  const funnelSection = getTemplateMetricSection(data.templateConfig, "funil");
  const messagingMetric = funnelSection?.metrics?.find(
    (metric) =>
      metric.enabled &&
      metric.key === "conversions" &&
      /whatsapp|conversa|mensag/i.test(metric.label || "")
  );

  // Mantém o comportamento atual de todos os templates que não são de mensagens.
  if (!messagingMetric) {
    return <MetaAdsPage />;
  }

  const rawRows = Array.isArray(data.dailyPerformance) && data.dailyPerformance.length > 0
    ? data.dailyPerformance
    : Array.isArray(data.meta_ads)
      ? data.meta_ads
      : [];

  if (rawRows.length === 0 && data.source !== "mock") {
    return (
      <DashboardPageShell title="Funil" subtitle="Eficiência da campanha de mensagens">
        <TemplateEmptyState title="Dados do Meta Ads" description="Ainda não foram encontrados dados para montar o funil de mensagens." />
      </DashboardPageShell>
    );
  }

  const campaigns = Array.from(
    new Set(rawRows.map((row: any) => String(row?.campaignName || "")).filter(Boolean))
  );
  const adSets = Array.from(
    new Set(
      rawRows
        .filter((row: any) => campaignFilter === "all" || String(row?.campaignName || "") === campaignFilter)
        .map((row: any) => String(row?.adSetName || ""))
        .filter(Boolean)
    )
  );

  const filteredRows = rawRows.filter((row: any) => {
    const campaignMatch = campaignFilter === "all" || String(row?.campaignName || "") === campaignFilter;
    const adSetMatch = adSetFilter === "all" || String(row?.adSetName || "") === adSetFilter;
    return campaignMatch && adSetMatch;
  });

  const totals = aggregate(filteredRows);
  const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
  const cpc = totals.clicks > 0 ? totals.cost / totals.clicks : 0;
  const costPerConversation = totals.conversations > 0 ? totals.cost / totals.conversations : 0;
  const clickToConversation = totals.clicks > 0 ? (totals.conversations / totals.clicks) * 100 : 0;

  const stages = [
    { name: "Impressões", value: totals.impressions },
    { name: "Cliques no link", value: totals.clicks },
    { name: messagingMetric.label || "Conversas iniciadas no WhatsApp", value: totals.conversations },
  ];
  const maxValue = Math.max(totals.impressions, 1);

  return (
    <DashboardPageShell title="Funil" subtitle="Eficiência da campanha de mensagens">
      <div className="card" style={{ padding: 24, backgroundColor: "#FFFFFF", borderRadius: 12, border: "1px solid #E2E8F0" }}>
        <div className="dashboard-filter-row" style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 16 }}>
          <select
            value={campaignFilter}
            onChange={(event) => {
              setCampaignFilter(event.target.value);
              setAdSetFilter("all");
            }}
            style={{ padding: "8px 10px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 12, minWidth: 280 }}
          >
            <option value="all">Todas as campanhas</option>
            {campaigns.map((campaign) => <option key={campaign} value={campaign}>{campaign}</option>)}
          </select>

          <select
            value={adSetFilter}
            onChange={(event) => setAdSetFilter(event.target.value)}
            style={{ padding: "8px 10px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 12, minWidth: 280 }}
          >
            <option value="all">Todos os conjuntos</option>
            {adSets.map((adSet) => <option key={adSet} value={adSet}>{adSet}</option>)}
          </select>
        </div>

        <div style={{ padding: 20, border: "1px solid #D9E2EC", borderRadius: 12 }}>
          <div style={{ marginBottom: 18 }}>
            <h3 style={{ margin: 0, fontSize: 15, color: "#0F172A", fontWeight: 700 }}>Funil de mensagens no WhatsApp</h3>
            <div style={{ marginTop: 4, fontSize: 12, color: "#64748B" }}>
              Impressões &gt; Cliques no link &gt; {messagingMetric.label || "Conversas iniciadas no WhatsApp"}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {stages.map((stage, index) => {
              const previous = index > 0 ? stages[index - 1].value : null;
              const conversionRate = previous && previous > 0 ? (stage.value / previous) * 100 : null;
              const width = Math.max(stage.value > 0 ? 3 : 0, (stage.value / maxValue) * 100);
              return (
                <div key={stage.name}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 12, fontWeight: 700, color: "#0F172A" }}>
                    <span>{stage.name}</span>
                    <span>{formatNumber(stage.value, true)}</span>
                  </div>
                  <div style={{ height: 20, borderRadius: 999, background: "#E2E8F0", overflow: "hidden" }}>
                    <div style={{ width: `${width}%`, height: "100%", borderRadius: 999, background: "linear-gradient(90deg, #2563EB, #4F7DE8)" }} />
                  </div>
                  {conversionRate !== null && (
                    <div style={{ marginTop: 5, fontSize: 11, color: "#64748B" }}>
                      Conversão vs etapa anterior: <strong style={{ color: "#0F172A" }}>{conversionRate.toFixed(1)}%</strong>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="dashboard-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10, marginTop: 28 }}>
            <div style={{ padding: 10, border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 12, color: "#475569" }}>CTR: <strong style={{ color: "#0F172A" }}>{ctr.toFixed(2)}%</strong></div>
            <div style={{ padding: 10, border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 12, color: "#475569" }}>CPC: <strong style={{ color: "#0F172A" }}>{formatCurrency(cpc)}</strong></div>
            <div style={{ padding: 10, border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 12, color: "#475569" }}>Custo por conversa: <strong style={{ color: "#0F172A" }}>{formatCurrency(costPerConversation)}</strong></div>
            <div style={{ padding: 10, border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 12, color: "#475569" }}>Clique → conversa: <strong style={{ color: "#0F172A" }}>{clickToConversation.toFixed(1)}%</strong></div>
          </div>
        </div>
      </div>
    </DashboardPageShell>
  );
}
