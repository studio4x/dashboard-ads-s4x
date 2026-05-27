"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BarChart3, Bell, Settings, LogOut, Download, Loader2, RefreshCcw } from "lucide-react";
import { logout } from "@/app/login/actions";
import { DateRangeSelector } from "./DateRangeSelector";
import { useDashboard } from "./DashboardDataContext";
import { DASHBOARD_PAGES } from "@/lib/constants";
import { getVisiblePages } from "@/lib/dashboard/templates";

interface DashboardHeaderProps {
  clientName: string;
  dashboardTitle: string;
  dashboardId: string;
  dashboardType?: string;
  dateRangeLabel?: string;
  onDateRangeClick?: () => void;
}

export function DashboardHeader({
  clientName,
  dashboardTitle,
  dashboardId,
  dashboardType,
}: DashboardHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { rangePreset, includeToday, updateRange, from, to, data, refresh } = useDashboard();
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isRefreshingData, setIsRefreshingData] = useState(false);
  
  const metricsSource = data?.config?.Fonte || data?.config?.fonte || (data?.source === "mock" ? "Mocks" : "Google Sheets");
  const accountId = data?.meta?.Conta_ID || data?.meta?.conta_id || data?.meta?.Conta || null;
  const dashboardModelLabel = (() => {
    const type = String(dashboardType || "").toLowerCase();
    if (type.includes("meta")) return "Meta Ads";
    if (type.includes("google")) return "Google Ads";
    return "Custom";
  })();
  const MAX_NAVIGATION_WAIT_MS = 20000;
  const MAX_ROOT_WAIT_MS = 12000;

  async function waitForRender() {
    if (document.fonts?.ready) {
      try {
        await document.fonts.ready;
      } catch {
        // Ignore font readiness failures and continue export.
      }
    }
    await new Promise((r) => setTimeout(r, 1500));
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
  }

  async function navigateAndWait(targetPathWithQuery: string) {
    const targetUrl = new URL(targetPathWithQuery, window.location.origin);
    router.replace(`${targetUrl.pathname}${targetUrl.search}`, { scroll: false });

    const timeoutMs = MAX_NAVIGATION_WAIT_MS;
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const currentUrl = new URL(window.location.href);
      const samePath = currentUrl.pathname === targetUrl.pathname;
      const targetParamsMatch = [...targetUrl.searchParams.entries()].every(
        ([key, value]) => currentUrl.searchParams.get(key) === value
      );
      if (samePath && targetParamsMatch) {
        await waitForRender();
        return;
      }
      await new Promise((r) => setTimeout(r, 120));
    }

    throw new Error(`Timeout ao navegar para ${targetPathWithQuery}`);
  }

  async function getExportRoot(): Promise<HTMLElement> {
    const timeoutMs = MAX_ROOT_WAIT_MS;
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      const root = document.querySelector('[data-export-root="true"]') as HTMLElement | null;
      if (root && root.offsetWidth > 0 && root.scrollHeight > 0) {
        // Aguarda estabilização rápida de layout para reduzir capturas parciais.
        const h1 = root.scrollHeight;
        await new Promise((r) => setTimeout(r, 120));
        const h2 = root.scrollHeight;
        if (h2 >= h1) {
          await new Promise(requestAnimationFrame);
          return root;
        }
      }
      await new Promise((r) => setTimeout(r, 120));
    }

    throw new Error("Container de exportação não encontrado.");
  }

  function resolveCaptureScale(root: HTMLElement, relaxed = false) {
    const width = Math.max(root.scrollWidth, root.clientWidth, document.documentElement.clientWidth, 1280);
    const height = Math.max(root.scrollHeight, root.clientHeight, 800);
    const area = width * height;
    const pixelBudget = relaxed ? 8_000_000 : 16_000_000;
    const baseScale = Math.sqrt(pixelBudget / Math.max(area, 1));
    const capped = Math.min(2, Math.max(relaxed ? 0.75 : 1, baseScale));
    if (!Number.isFinite(capped)) return 1;
    return capped;
  }

  function buildCaptureOptions(root: HTMLElement, fallbackMode: boolean) {
    const scale = resolveCaptureScale(root, fallbackMode);
    const host = window.location.host;

    return {
      scale,
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#FFFFFF",
      logging: false,
      windowWidth: Math.max(document.documentElement.clientWidth, 1280),
      windowHeight: root.scrollHeight,
      imageTimeout: 15000,
      ignoreElements: (node: Element) => {
        const tag = node.tagName?.toUpperCase?.();
        if (tag === "IFRAME" || tag === "VIDEO" || tag === "CANVAS") return true;
        if (fallbackMode && tag === "IMG") {
          const src = (node as HTMLImageElement).getAttribute("src") || "";
          if (src.startsWith("http") && !src.includes(host)) return true;
        }
        return false;
      },
      onclone: fallbackMode
        ? (clonedDoc: Document) => {
            const clonedRoot = clonedDoc.querySelector('[data-export-root="true"]') as HTMLElement | null;
            if (!clonedRoot) return;
            const style = clonedDoc.createElement("style");
            style.setAttribute("data-pdf-export-style", "true");
            style.textContent = `
              *, *::before, *::after {
                animation: none !important;
                transition: none !important;
              }
              [data-export-root="true"], [data-export-root="true"] * {
                opacity: 1 !important;
                filter: none !important;
              }
              .animate-fade-in, .animate-pulse-soft {
                opacity: 1 !important;
                transform: none !important;
              }
            `;
            clonedDoc.head.appendChild(style);
            clonedRoot.querySelectorAll("[style*='position: sticky'], [style*='position: fixed']").forEach((el) => {
              const element = el as HTMLElement;
              element.style.position = "static";
              element.style.top = "auto";
            });
          }
        : (clonedDoc: Document) => {
            const clonedRoot = clonedDoc.querySelector('[data-export-root="true"]') as HTMLElement | null;
            if (!clonedRoot) return;
            const style = clonedDoc.createElement("style");
            style.setAttribute("data-pdf-export-style", "true");
            style.textContent = `
              *, *::before, *::after {
                animation: none !important;
                transition: none !important;
              }
              [data-export-root="true"], [data-export-root="true"] * {
                opacity: 1 !important;
                filter: none !important;
              }
              .animate-fade-in, .animate-pulse-soft {
                opacity: 1 !important;
                transform: none !important;
              }
            `;
            clonedDoc.head.appendChild(style);
          },
    };
  }

  async function captureTabCanvas(
    html2canvas: (element: HTMLElement, options: Record<string, unknown>) => Promise<HTMLCanvasElement>,
    root: HTMLElement,
    fallbackMode = false
  ) {
    return html2canvas(root, buildCaptureOptions(root, fallbackMode));
  }

  async function handleExportPdf() {
    if (isExportingPdf) return;
    setIsExportingPdf(true);

    const currentPath = pathname;
    const currentQuery = searchParams.toString();

    try {
      const { jsPDF } = await import("jspdf");
      const html2canvas = (await import("html2canvas-pro")).default;

      const visiblePageKeys = getVisiblePages(data?.templateId);
      const pages = DASHBOARD_PAGES.filter((p) => visiblePageKeys.includes(p.key));
      const paramsString = currentQuery ? `?${currentQuery}` : "";
      const pageErrors: string[] = [];

      for (const page of pages) {
        const prefetchPath = `/app/dashboards/${dashboardId}/${page.key}${paramsString}`;
        try {
          router.prefetch(prefetchPath);
        } catch {
          // Non-blocking: prefetch é otimização e pode falhar silenciosamente.
        }
      }

      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const margin = 6;
      const pageW = 297 - margin * 2;
      const pageH = 210 - margin * 2;

      let isFirstPage = true;
      let capturedPages = 0;

      for (const page of pages) {
        const targetPath = `/app/dashboards/${dashboardId}/${page.key}${paramsString}`;

        try {
          await navigateAndWait(targetPath);
          const root = await getExportRoot();

          let canvas: HTMLCanvasElement;
          try {
            canvas = await captureTabCanvas(html2canvas, root, false);
          } catch (firstCaptureErr) {
            console.warn(`Tentativa padrão falhou na aba "${page.label}". Aplicando fallback.`, firstCaptureErr);
            canvas = await captureTabCanvas(html2canvas, root, true);
          }

          if (!canvas.width || !canvas.height) {
            throw new Error(`Canvas inválido para aba ${page.label}`);
          }

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
          capturedPages += 1;
        } catch (pageErr) {
          pageErrors.push(`${page.label}: ${pageErr instanceof Error ? pageErr.message : "erro desconhecido"}`);
          console.warn(`Falha ao capturar aba "${page.label}"`, pageErr);
        }
      }

      if (capturedPages === 0) {
        throw new Error(`Nenhuma aba pôde ser capturada para o PDF. ${pageErrors.join(" | ")}`.trim());
      }

      const safeName = (dashboardTitle || "dashboard").replace(/[\\/:*?"<>|]/g, "-");
      pdf.save(`${safeName}.pdf`);
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      const details = err instanceof Error ? err.message : "erro desconhecido";
      alert(`Não foi possível gerar o PDF do dashboard.\n\nDetalhe técnico: ${details}`);
    } finally {
      const restore = currentQuery ? `${currentPath}?${currentQuery}` : currentPath;
      router.replace(restore, { scroll: false });
      setIsExportingPdf(false);
    }
  }

  async function handleRefreshData() {
    if (isRefreshingData) return;
    try {
      setIsRefreshingData(true);
      await refresh();
    } finally {
      setIsRefreshingData(false);
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
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 0.4,
                textTransform: "uppercase",
                color: "#1D4ED8",
                background: "#EFF6FF",
                border: "1px solid #BFDBFE",
                borderRadius: 999,
                padding: "2px 8px",
              }}
            >
              {dashboardModelLabel}
            </span>
            
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
            onClick={handleRefreshData}
            disabled={isRefreshingData}
            style={{
              height: 34,
              borderRadius: 8,
              border: "1px solid #E2E8F0",
              background: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: isRefreshingData ? "wait" : "pointer",
              color: "#334155",
              fontSize: 12,
              fontWeight: 700,
              padding: "0 10px",
              gap: 6,
              whiteSpace: "nowrap",
            }}
            title="Atualizar dados da aba atual"
          >
            {isRefreshingData ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
            {isRefreshingData ? "Atualizando..." : "Atualizar dados"}
          </button>

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
            availableRange={data?.availableDateRange || null}
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
