"use client";

import { useEffect, useMemo, useState } from "react";
import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const sync = () => setIsMobile(window.innerWidth < 1024);
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  const pageTitle = useMemo(() => {
    if (pathname === "/admin") return "Cockpit";
    if (pathname.startsWith("/admin/health")) return "Central de Saúde";
    if (pathname.startsWith("/admin/activity")) return "Atividade Operacional";
    if (pathname.startsWith("/admin/clients")) return "Clientes";
    if (pathname.startsWith("/admin/dashboards")) return "Dashboards";
    if (pathname.startsWith("/admin/financial-alerts")) return "Alertas Financeiros";
    if (pathname.startsWith("/admin/google-sheets")) return "Google Sheets";
    if (pathname.startsWith("/admin/google-ads-api")) return "Google Ads API";
    if (pathname.startsWith("/admin/meta-marketing")) return "Meta Marketing API";
    if (pathname.startsWith("/admin/import-logs")) return "Logs";
    return "Admin";
  }, [pathname]);

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", display: "flex" }}>
      {!isMobile && <AdminSidebar />}
      {isMobile && <>
        <header style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 70, height: 56, background: "rgba(255,255,255,0.96)", backdropFilter: "blur(6px)", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px" }}>
          <button type="button" aria-label="Abrir menu" onClick={() => setSidebarOpen(true)} style={{ border: "1px solid #E2E8F0", background: "#FFFFFF", borderRadius: 8, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", color: "#334155" }}><Menu size={18} /></button>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>{pageTitle}</p><div style={{ width: 36, height: 36 }} />
        </header>
        {sidebarOpen && <div style={{ position: "fixed", inset: 0, zIndex: 80, display: "flex" }}><button aria-label="Fechar menu" onClick={() => setSidebarOpen(false)} style={{ position: "absolute", inset: 0, border: "none", background: "rgba(15,23,42,0.45)" }} /><div style={{ position: "relative", zIndex: 81 }}><AdminSidebar onClose={() => setSidebarOpen(false)} /></div></div>}
      </>}
      <main style={{ flex: 1, minWidth: 0, overflowX: "hidden", paddingTop: isMobile ? 56 : 0 }}>{children}</main>
    </div>
  );
}
