import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardTabs } from "@/components/dashboard/DashboardTabs";
import { DashboardFooter } from "@/components/dashboard/DashboardFooter";
import { DashboardDataProvider } from "@/components/dashboard/DashboardDataContext";
import { mockClients, mockDashboards } from "@/data/mock-sheet-overview";
import { DashboardService } from "@/services/dashboard-service";
import { getSessionProfile } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/server";
import packageJson from "../../../../../package.json";
import type { Metadata } from "next";

export async function generateMetadata(
  { params }: { params: Promise<{ dashboardId: string }> }
): Promise<Metadata> {
  const { dashboardId } = await params;
  const siteTitle = "Dashboard ADS S4X";
  let clientName = "Cliente";
  let dashboardTitle = "Dashboard";
  let hasFoundDb = false;

  try {
    const dbDashboard = await DashboardService.getDashboardById(dashboardId);
    if (dbDashboard) {
      clientName = dbDashboard.clients?.name || "Cliente";
      dashboardTitle = dbDashboard.name || dbDashboard.title || "Dashboard";
      hasFoundDb = true;
    }
  } catch {
    // fallback silencioso
  }

  if (!hasFoundDb) {
    const dashboard = mockDashboards.find((d) => d.id === dashboardId) ?? mockDashboards[0];
    const client = mockClients.find((c) => c.id === dashboard?.client_id) ?? mockClients[0];
    clientName = client?.name ?? "Cliente Demo";
    dashboardTitle = dashboard?.title ?? "Dashboard";
  }

  return {
    title: {
      absolute: `${clientName} | ${dashboardTitle} | ${siteTitle}`,
    },
  };
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  params: Promise<{ dashboardId: string }>;
}

export default async function DashboardLayout({ children, params }: DashboardLayoutProps) {
  const { dashboardId } = await params;
  
  let clientName = "Cliente";
  let dashboardTitle = "Dashboard";
  let dashboardType = "custom";
  let hasFoundDb = false;
  let showPerformanceAnalysis = false;

  try {
    const dbDashboard = await DashboardService.getDashboardById(dashboardId);
    if (dbDashboard) {
      dashboardTitle = dbDashboard.name || dbDashboard.title || "Dashboard";
      clientName = dbDashboard.clients?.name || "Cliente";
      dashboardType = dbDashboard.dashboard_type || "custom";
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

  try {
    const profile = await getSessionProfile();
    const isAdmin = profile?.role === "admin" || profile?.role === "owner";
    if (isAdmin) {
      const supabase = await createAdminClient();
      const { data: googleAdsSource } = await supabase
        .from("data_sources")
        .select("id")
        .eq("dashboard_id", dashboardId)
        .eq("type", "google_ads")
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      showPerformanceAnalysis = Boolean(googleAdsSource?.id);
    }
  } catch (err) {
    console.error("Erro ao verificar disponibilidade da análise de performance:", err);
  }

  const buildCommit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || null;

  return (
    <DashboardDataProvider>
      <div style={{ minHeight: "100vh", background: "#F8FAFC", display: "flex", flexDirection: "column" }}>
        <DashboardHeader
          clientName={clientName}
          dashboardTitle={dashboardTitle}
          dashboardId={dashboardId}
          dashboardType={dashboardType}
        />

        {/* Tabs */}
        <div
          className="dashboard-tabs-container"
          style={{
            background: "white",
            borderBottom: "1px solid #E2E8F0",
            padding: "12px 0",
            position: "relative",
          }}
        >
          <div className="dashboard-tabs-inner" style={{ maxWidth: "1440px", margin: "0 auto", padding: "0 24px" }}>
            <DashboardTabs dashboardId={dashboardId} showPerformanceAnalysis={showPerformanceAnalysis} />
          </div>
        </div>

        {/* Page content */}
        <div style={{ flex: 1, width: "100%" }}>
          {children}
        </div>

        {/* Footer */}
        <DashboardFooter buildVersion={packageJson.version} buildCommit={buildCommit} />
      </div>
    </DashboardDataProvider>
  );
}
