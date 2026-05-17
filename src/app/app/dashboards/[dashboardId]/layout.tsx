import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardTabs } from "@/components/dashboard/DashboardTabs";
import { DashboardDataProvider } from "@/components/dashboard/DashboardDataContext";
import { mockClients, mockDashboards } from "@/data/mock-sheet-overview";
import { DashboardService } from "@/services/dashboard-service";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Dashboard", template: "%s | Dashboard ADS S4X" },
};

interface DashboardLayoutProps {
  children: React.ReactNode;
  params: Promise<{ dashboardId: string }>;
}

export default async function DashboardLayout({ children, params }: DashboardLayoutProps) {
  const { dashboardId } = await params;
  
  let clientName = "Cliente";
  let dashboardTitle = "Dashboard";
  let hasFoundDb = false;

  try {
    const dbDashboard = await DashboardService.getDashboardById(dashboardId);
    if (dbDashboard) {
      dashboardTitle = dbDashboard.name || dbDashboard.title || "Dashboard";
      clientName = dbDashboard.clients?.name || "Cliente";
      hasFoundDb = true;
    }
  } catch (err) {
    console.error("Erro ao carregar dados do dashboard do BD, usando mocks:", err);
  }

  if (!hasFoundDb) {
    const dashboard = mockDashboards.find((d) => d.id === dashboardId) ?? mockDashboards[0];
    const client = mockClients.find((c) => c.id === dashboard?.client_id) ?? mockClients[0];
    clientName = client?.name ?? "Cliente Demo";
    dashboardTitle = dashboard?.title ?? "Dashboard";
  }

  return (
    <DashboardDataProvider>
      <div style={{ minHeight: "100vh", background: "#F8FAFC", display: "flex", flexDirection: "column" }}>
        <DashboardHeader
          clientName={clientName}
          dashboardTitle={dashboardTitle}
          dashboardId={dashboardId}
        />

        {/* Tabs */}
        <div
          style={{
            background: "white",
            borderBottom: "1px solid #E2E8F0",
            padding: "10px 24px 0",
            position: "sticky",
            top: 60,
            zIndex: 30,
          }}
        >
          <DashboardTabs dashboardId={dashboardId} />
        </div>

        {/* Page content */}
        <div style={{ flex: 1 }}>
          {children}
        </div>
      </div>
    </DashboardDataProvider>
  );
}
