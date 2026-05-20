"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BarChart3, Bell, Settings, LogOut, Download, Loader2 } from "lucide-react";
import { logout } from "@/app/login/actions";
import { DateRangeSelector } from "./DateRangeSelector";
import { useDashboard } from "./DashboardDataContext";
import { DASHBOARD_PAGES } from "@/lib/constants";
import { getVisiblePages } from "@/lib/dashboard/templates";

interface DashboardHeaderProps {
  clientName: string;
  dashboardTitle: string;
  dashboardId: string;
  dateRangeLabel?: string;
  onDateRangeClick?: () => void;
}

export function DashboardHeader({
  clientName,
  dashboardTitle,
  dashboardId,
}: DashboardHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { rangePreset, includeToday, updateRange, from, to, data } = useDashboard();
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  
  const metricsSource = data?.config?.Fonte || data?.config?.fonte || (data?.source === "mock" ? "Mocks" : "Google Sheets");
  const accountId = data?.meta?.Conta_ID || data?.meta?.conta_id || data?.meta?.Conta || null;

  async function waitForRender() {
    await new Promise((r) => setTimeout(r, 1200));
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
  }

  async function handleExportPdf() {
    if (isExportingPdf) return;
    setIsExportingPdf(true);

    const currentPath = pathname;
    const currentQuery = searchParams.toString();

    try {
      const { jsPDF } = await import("jspdf");
      const html2canvas = (await import("html2canvas")).default;

      const visiblePageKeys = getVisiblePages(data?.templateId);
      const pages = DASHBOARD_PAGES.filter((p) => visiblePageKeys.includes(p.key));
      const paramsString = currentQuery ? `?${currentQuery}` : "";

      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const margin = 6;
      const pageW = 297 - margin * 2;
      const pageH = 210 - margin * 2;

      let isFirstPage = true;

      for (const page of pages) {
        const targetPath = `/app/dashboards/${dashboardId}/${page.key}${paramsString}`;
        await router.replace(targetPath, { scroll: false });
        await waitForRender();

        const root = document.querySelector('[data-export-root="true"]') as HTMLElement | null;
        if (!root) continue;

        const canvas = await html2canvas(root, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#FFFFFF",
          windowWidth: Math.max(document.documentElement.clientWidth, 1440),
          windowHeight: root.scrollHeight,
        });

        const imgData = canvas.toDataURL("image/png");
        const imgProps = pdf.getImageProperties(imgData);
        const ratio = Math.min(pageW / imgProps.width, pageH / imgProps.height);
        const renderW = imgProps.width * ratio;
        const renderH = imgProps.height * ratio;
        const x = margin + (pageW - renderW) / 2;
        const y = margin + (pageH - renderH) / 2;

        if (!isFirstPage) pdf.addPage("a4", "landscape");
        pdf.addImage(imgData, "PNG", x, y, renderW, renderH, undefined, "FAST");
        isFirstPage = false;
      }

      const safeName = (dashboardTitle || "dashboard").replace(/[\\/:*?"<>|]/g, "-");
      pdf.save(`${safeName}.pdf`);
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      alert("Não foi possível gerar o PDF do dashboard.");
    } finally {
      const restore = currentQuery ? `${currentPath}?${currentQuery}` : currentPath;
      await router.replace(restore, { scroll: false });
      setIsExportingPdf(false);
    }
  }

  return (
    <header
      style={{
        background: "white",
        borderBottom: "1px solid #E2E8F0",
        padding: "0 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: 60,
        position: "sticky",
        top: 0,
        zIndex: 40,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", maxWidth: "1440px", margin: "0 auto" }}>
        {/* Left: Logo + breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link href="/app/dashboards" style={{ textDecoration: "none" }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "linear-gradient(135deg, #2563EB, #7C3AED)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <BarChart3 size={17} color="white" />
            </div>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, color: "#94A3B8" }}>{clientName}</span>
            <span style={{ color: "#CBD5E1" }}>/</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{dashboardTitle}</span>
            
            {/* Badges de Fonte e Conta */}
            {accountId && (
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-wider">
                ID Conta Google: {accountId}
              </span>
            )}
          </div>
        </div>

        {/* Right: Period + actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            style={{
              height: 34,
              borderRadius: 8,
              border: "1px solid #DBEAFE",
              background: "#EFF6FF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: isExportingPdf ? "wait" : "pointer",
              color: "#1D4ED8",
              fontSize: 12,
              fontWeight: 700,
              padding: "0 10px",
              gap: 6,
              whiteSpace: "nowrap",
            }}
            title="Baixar dashboard em PDF"
          >
            {isExportingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            {isExportingPdf ? "Gerando PDF..." : "Baixar PDF"}
          </button>

          <DateRangeSelector 
            currentPreset={rangePreset} 
            onPresetChange={updateRange} 
            includeToday={includeToday}
            from={from}
            to={to}
          />

          <button
            style={{
              width: 34, height: 34, borderRadius: 8, border: "1px solid #E2E8F0",
              background: "white", display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "#64748B",
            }}
          >
            <Bell size={16} />
          </button>

          <Link
            href="/admin"
            style={{
              width: 34, height: 34, borderRadius: 8, border: "1px solid #E2E8F0",
              background: "white", display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "#64748B", textDecoration: "none",
            }}
            title="Painel Admin"
          >
            <Settings size={16} />
          </Link>

          <button
            onClick={() => logout()}
            style={{
              width: 34, height: 34, borderRadius: 8, border: "1px solid #FEF2F2",
              background: "#FEF2F2", display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "#DC2626",
            }}
            title="Sair"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
