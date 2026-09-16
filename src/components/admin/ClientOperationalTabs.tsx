"use client";

import { useState } from "react";
import { Activity, BellRing, Clock3, FileClock } from "lucide-react";
import { ClientAutomationHistoryPanel } from "@/components/admin/ClientAutomationHistoryPanel";
import { ClientFinancialAlertsPanel } from "@/components/admin/ClientFinancialAlertsPanel";
import { ClientPerformanceAnomaliesPanel } from "@/components/admin/ClientPerformanceAnomaliesPanel";
import { ClientSourceMonitoringPanel } from "@/components/admin/ClientSourceMonitoringPanel";

type TabKey = "monitoring" | "automation";

export function ClientOperationalTabs({ clientId }: { clientId: string }) {
  const [activeTab, setActiveTab] = useState<TabKey>("monitoring");

  return (
    <section style={{ marginBottom: 24 }}>
      <div role="tablist" aria-label="Operação do cliente" style={{ display: "flex", gap: 8, flexWrap: "wrap", borderBottom: "1px solid #E2E8F0", marginBottom: 16 }}>
        <button type="button" role="tab" aria-selected={activeTab === "monitoring"} onClick={() => setActiveTab("monitoring")} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 13px", border: 0, borderBottom: activeTab === "monitoring" ? "2px solid #2563EB" : "2px solid transparent", background: "transparent", color: activeTab === "monitoring" ? "#1D4ED8" : "#64748B", fontSize: 13, fontWeight: 700, cursor: "pointer" }}><Activity size={15} /> Alertas e monitoramento</button>
        <button type="button" role="tab" aria-selected={activeTab === "automation"} onClick={() => setActiveTab("automation")} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 13px", border: 0, borderBottom: activeTab === "automation" ? "2px solid #2563EB" : "2px solid transparent", background: "transparent", color: activeTab === "automation" ? "#1D4ED8" : "#64748B", fontSize: 13, fontWeight: 700, cursor: "pointer" }}><FileClock size={15} /> Automações</button>
      </div>

      {activeTab === "monitoring" ? (
        <div role="tabpanel" aria-label="Alertas e monitoramento" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <ClientFinancialAlertsPanel clientId={clientId} />
          <ClientSourceMonitoringPanel clientId={clientId} />
          <ClientPerformanceAnomaliesPanel clientId={clientId} />
        </div>
      ) : (
        <div role="tabpanel" aria-label="Automações">
          <ClientAutomationHistoryPanel clientId={clientId} />
        </div>
      )}
    </section>
  );
}
