"use client";

import { useEffect } from "react";

function findAnalysisRoot(page: HTMLElement) {
  return Array.from(page.children).find((child): child is HTMLElement => {
    return child instanceof HTMLElement && (child.classList.contains("dashboard-page") || child.classList.contains("admin-page"));
  }) || null;
}

function findActionPlan(root: HTMLElement) {
  return Array.from(root.querySelectorAll<HTMLElement>("section.card")).find((section) => {
    const title = section.querySelector("h2")?.textContent?.trim().toLowerCase() || "";
    return title === "plano de ação priorizado";
  }) || null;
}

function createTechnicalDetails() {
  const details = document.createElement("details");
  details.dataset.s4xTechnicalDetails = "true";
  details.style.border = "1px solid #E2E8F0";
  details.style.borderRadius = "10px";
  details.style.background = "#FFFFFF";
  details.style.marginBottom = "18px";
  details.style.overflow = "hidden";

  const summary = document.createElement("summary");
  summary.style.cursor = "pointer";
  summary.style.listStyle = "none";
  summary.style.padding = "14px 16px";
  summary.style.fontSize = "12px";
  summary.style.fontWeight = "750";
  summary.style.color = "#475569";
  summary.style.display = "flex";
  summary.style.alignItems = "center";
  summary.style.justifyContent = "space-between";
  summary.style.gap = "10px";
  summary.innerHTML = '<span>Detalhes técnicos da análise</span><span style="font-size:10px;color:#94A3B8;font-weight:650">abrir somente quando precisar investigar</span>';

  const content = document.createElement("div");
  content.dataset.s4xTechnicalDetailsContent = "true";
  content.style.padding = "4px 14px 14px";

  details.append(summary, content);
  return details;
}

export function GoogleAdsAnalysisComposer() {
  useEffect(() => {
    const page = document.querySelector<HTMLElement>("[data-google-ads-performance-page='true']");
    if (!page) return;

    let disposed = false;
    let scheduled = false;
    let composing = false;

    const compose = () => {
      scheduled = false;
      if (disposed || composing) return;

      const analysisRoot = findAnalysisRoot(page);
      const overview = page.querySelector<HTMLElement>("[data-s4x-optimization-overview='true']");
      if (!analysisRoot || !overview) return;

      const header = analysisRoot.firstElementChild as HTMLElement | null;
      const actionPlan = findActionPlan(analysisRoot);
      if (!header || !actionPlan) return;

      composing = true;
      try {
        if (overview.parentElement !== analysisRoot || overview.previousElementSibling !== header) {
          analysisRoot.insertBefore(overview, header.nextSibling);
        }

        if (actionPlan.parentElement !== analysisRoot || actionPlan.previousElementSibling !== overview) {
          analysisRoot.insertBefore(actionPlan, overview.nextSibling);
        }

        let details = analysisRoot.querySelector<HTMLElement>("[data-s4x-technical-details='true']") as HTMLDetailsElement | null;
        if (!details) {
          details = createTechnicalDetails();
          analysisRoot.insertBefore(details, actionPlan.nextSibling);
        } else if (details.previousElementSibling !== actionPlan) {
          analysisRoot.insertBefore(details, actionPlan.nextSibling);
        }

        const content = details.querySelector<HTMLElement>("[data-s4x-technical-details-content='true']");
        if (!content) return;

        const movable = Array.from(analysisRoot.children).filter((child): child is HTMLElement => {
          return child instanceof HTMLElement && child !== header && child !== overview && child !== actionPlan && child !== details;
        });

        for (const node of movable) content.appendChild(node);
      } finally {
        composing = false;
      }
    };

    const schedule = () => {
      if (scheduled || disposed || composing) return;
      scheduled = true;
      window.requestAnimationFrame(compose);
    };

    compose();
    const observer = new MutationObserver(schedule);
    observer.observe(page, { childList: true, subtree: true });

    return () => {
      disposed = true;
      observer.disconnect();
    };
  }, []);

  return null;
}
