"use client";

import React, { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, Info, Download, Loader2, RefreshCcw, Menu, X } from "lucide-react";
import { DateRangeSelector } from "./DateRangeSelector";
import { useDashboard } from "./DashboardDataContext";
import { cn } from "@/lib/utils";
import { DASHBOARD_PAGES } from "@/lib/constants";
import { getVisiblePages } from "@/lib/dashboard/templates";
import { BrandingLogo } from "@/components/branding/BrandingLogo";
import { getClientLogoImageStyle, type ClientLogoSettings } from "@/lib/client-logo-settings";

interface SharedDashboardHeaderProps {
  clientName?: string;
  dashboardName?: string;
  clientLogoUrl?: string | null;
  clientLogoSettings?: ClientLogoSettings | null;
  shareToken?: string;
  pageTitle: string;
  pageSubtitle?: string;
}

export function SharedDashboardHeader({
  clientName,
  dashboardName,
  clientLogoUrl,
  clientLogoSettings,
  shareToken,
  pageTitle,
  pageSubtitle
}: SharedDashboardHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { rangePreset, includeToday, updateRange, from, to, data, refresh } = useDashboard();
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isRefreshingData, setIsRefreshingData] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const accountId = data?.meta?.Conta_ID || data?.meta?.conta_id || data?.meta?.Conta || null;
  const subtitleParts = [dashboardName, clientName].filter(Boolean);
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

    const start = Date.now();
    while (Date.now() - start < MAX_NAVIGATION_WAIT_MS) {
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
    const start = Date.now();

    while (Date.now() - start < MAX_ROOT_WAIT_MS) {
      const root = document.querySelector('[data-export-root="true"]') as HTMLElement | null;
      if (root && root.offsetWidth > 0 && root.scrollHeight > 0) {
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
      onclone: (clonedDoc: Document) => {
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

        if (fallbackMode) {
          clonedRoot.querySelectorAll("[style*='position: sticky'], [style*='position: fixed']").forEach((el) => {
            const element = el as HTMLElement;
            element.style.position = "static";
            element.style.top = "auto";
          });
        }
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
    if (isExportingPdf || !shareToken) return;
    setIsExportingPdf(true);

    const currentPath = pathname;
    const currentQuery = searchParams.toString();

    try {
      const { jsPDF } = await import("jspdf");
      const html2canvas = (await import("html2canvas-pro")).default;

      const visiblePageKeys = data?.templatePageKeys?.length ? data.templatePageKeys : getVisiblePages(data?.templateId);
      const pages = DASHBOARD_PAGES.filter((p) => visiblePageKeys.includes(p.key));
      const pageErrors: string[] = [];

      const buildSharedPath = (pageKey: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("page", pageKey);
        return `/share/${shareToken}?${params.toString()}`;
      };

      for (const page of pages) {
        try {
          router.prefetch(buildSharedPath(page.key));
        } catch {
          // Non-blocking
        }
      }

      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const margin = 6;
      const pageW = 297 - margin * 2;
      const pageH = 210 - margin * 2;

      let isFirstPage = true;
      let capturedPages = 0;

      for (const page of pages) {
        const targetPath = buildSharedPath(page.key);

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

      const safeName = (dashboardName || "dashboard-compartilhado").replace(/[\\/:*?"<>|]/g, "-");
      pdf.save(`${safeName}.pdf`);
    } catch (err) {
      console.error("Erro ao gerar PDF compartilhado:", err);
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
    <header className="bg-white border-b border-slate-200">
      <div className="shared-dashboard-box dashboard-shared-header px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4 sm:gap-8 min-w-0">
          {/* Logo / Brand */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
             {clientLogoUrl ? (
               <div className="h-10 sm:h-12 w-[164px] sm:w-[180px] flex items-center justify-center overflow-hidden rounded-lg bg-white">
                 <img src={clientLogoUrl} alt={`Logo ${clientName || "cliente"}`} style={{ display: "block", width: "100%", height: "100%", ...getClientLogoImageStyle(clientLogoSettings) }} />
               </div>
             ) : (
               <BrandingLogo
                 alt="Dashboard ADS S4X"
                 style={{ width: 180, height: 48, justifyContent: "flex-start" }}
                 fallback={<div className="text-2xl sm:text-3xl font-black tracking-tighter text-blue-600">Studio 4x</div>}
               />
             )}
             <div className="hidden sm:block h-12 w-px bg-slate-200" />
             <div className="flex flex-col min-w-0">
               <h1 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
                 {pageTitle}
               </h1>
               <p className="text-xs sm:text-sm text-slate-500 font-medium dashboard-shared-subtitle">
                 {subtitleParts.join(" | ")}
               </p>
               
               {/* Badges de Fonte e Conta */}
               <div className="flex items-center gap-2 mt-1 flex-wrap">
                 {accountId && (
                   <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-wider">
                     ID Conta Google: {accountId}
                   </span>
                 )}
               </div>
             </div>
          </div>
        </div>

        <div className="dashboard-shared-actions dashboard-shared-actions-desktop flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Status Indicator */}
          {data && (
            <div className="hidden lg:flex flex-col items-end mr-4">
               <div className={cn(
                 "text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider",
                 data.source === "mock" ? "bg-slate-100 text-slate-500" : "bg-green-100 text-green-700"
               )}>
                 {data.source === "mock" ? "Modo Teste" : "Dados Reais"}
               </div>
               <span className="text-[10px] text-slate-400">
                 {data.lastUpdated ? `Sincronizado: ${data.lastUpdated}` : "Sincronizando..."}
               </span>
            </div>
          )}

          <button
            onClick={handleRefreshData}
            disabled={isRefreshingData}
            className="flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm w-full sm:w-auto min-w-[180px] gap-2 disabled:opacity-60"
            title="Atualizar dados da aba atual"
          >
            {isRefreshingData ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
            {isRefreshingData ? "Atualizando..." : "Atualizar dados"}
          </button>

          <button
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="flex h-11 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-700 shadow-sm w-full sm:w-auto min-w-[190px] gap-2 disabled:opacity-60"
            title="Baixar dashboard em PDF"
          >
            {isExportingPdf ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {isExportingPdf ? "Gerando PDF..." : "Baixar PDF"}
          </button>

          {/* Period Selector */}
          <div className="flex h-11 items-center justify-between rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm w-full sm:w-auto min-w-[220px]">
            <div className="flex items-center gap-2">
              <CalendarDays size={18} className="text-slate-400" />
              <DateRangeSelector 
                currentPreset={rangePreset} 
                onPresetChange={updateRange}
                variant="minimal"
                includeToday={includeToday}
                from={from}
                to={to}
                availableRange={data?.availableDateRange || null}
              />
            </div>
          </div>
          
          <div className="flex lg:hidden items-center gap-2 px-1">
             <Info size={14} className="text-blue-600" />
             <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">Link Privado</span>
          </div>
        </div>

        <button
          type="button"
          className="dashboard-mobile-menu-btn"
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid #E2E8F0", background: "white", color: "#334155", display: "none", alignItems: "center", justifyContent: "center" }}
          aria-label="Abrir menu do dashboard"
        >
          {isMobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
        </button>
      </div>

      {isMobileMenuOpen && (
        <div className="shared-dashboard-box dashboard-mobile-menu-panel" style={{ borderTop: "1px solid #E2E8F0", padding: "10px 16px 12px", display: "none", gap: 8 }}>
          <button onClick={handleRefreshData} disabled={isRefreshingData} className="flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm gap-2 disabled:opacity-60 w-full">
            {isRefreshingData ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
            {isRefreshingData ? "Atualizando..." : "Atualizar dados"}
          </button>

          <button onClick={handleExportPdf} disabled={isExportingPdf} className="flex h-10 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-700 shadow-sm gap-2 disabled:opacity-60 w-full">
            {isExportingPdf ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {isExportingPdf ? "Gerando PDF..." : "Baixar PDF"}
          </button>

          <div className="flex h-10 items-center justify-between rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm w-full">
            <div className="flex items-center gap-2">
              <CalendarDays size={16} className="text-slate-400" />
              <DateRangeSelector
                currentPreset={rangePreset}
                onPresetChange={updateRange}
                variant="minimal"
                includeToday={includeToday}
                from={from}
                to={to}
                availableRange={data?.availableDateRange || null}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Visual Subtitle / Breadcrumb for mobile */}
      {pageSubtitle && (
        <div className="bg-slate-50 border-b border-slate-200">
          <div className="shared-dashboard-box px-4 sm:px-6 lg:px-8 py-2">
            <p className="text-xs text-slate-500 font-medium">{pageSubtitle}</p>
          </div>
        </div>
      )}
    </header>
  );
}
