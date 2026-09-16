import { ClientFinancialAlertsPanel } from "@/components/admin/ClientFinancialAlertsPanel";
import { ClientPerformanceAnomaliesPanel } from "@/components/admin/ClientPerformanceAnomaliesPanel";
import { ClientSourceMonitoringPanel } from "@/components/admin/ClientSourceMonitoringPanel";

export function ClientOperationsContent({ clientId }: { clientId: string }) {
  return (
    <div role="tabpanel" aria-label="Alertas e monitoramento" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <ClientFinancialAlertsPanel clientId={clientId} />
      <ClientSourceMonitoringPanel clientId={clientId} />
      <ClientPerformanceAnomaliesPanel clientId={clientId} />
    </div>
  );
}
