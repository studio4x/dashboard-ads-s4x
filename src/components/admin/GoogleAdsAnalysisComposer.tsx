"use client";

import { useLayoutEffect } from "react";

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

function addInvestigationShortcuts(details: HTMLDetailsElement, content: HTMLElement) {
  let toolbar = content.querySelector<HTMLElement>("[data-s4x-investigation-shortcuts]");
  if (!toolbar) {
    toolbar = document.createElement("div");
    toolbar.dataset.s4xInvestigationShortcuts = "true";
    toolbar.style.display = "flex";
    toolbar.style.alignItems = "center";
    toolbar.style.gap = "6px";
    toolbar.style.flexWrap = "wrap";
    toolbar.style.padding = "7px 0 12px";
    content.prepend(toolbar);
  }

  const targets = [
    { match: ["leilão", "participação de impressões"], label: "Leilão" },
    { match: ["palavras-chave", "keywords"], label: "Palavras-chave" },
    { match: ["termos de pesquisa"], label: "Termos de pesquisa" },
    { match: ["dispositivos"], label: "Dispositivos" },
    { match: ["horários"], label: "Horários" },
    { match: ["anúncios"], label: "Anúncios" },
    { match: ["páginas de destino", "landing pages"], label: "Páginas" },
    { match: ["índice de qualidade", "quality score"], label: "Qualidade" },
    { match: ["alterações na conta"], label: "Alterações" },
  ];

  toolbar.innerHTML = "";
  const intro = document.createElement("span");
  intro.textContent = "Ir para:";
  intro.style.fontSize = "10px";
  intro.style.fontWeight = "700";
  intro.style.color = "#94A3B8";
  intro.style.marginRight = "2px";
  toolbar.appendChild(intro);

  const headings = Array.from(content.querySelectorAll<HTMLElement>("h2"));
  for (const target of targets) {
    const heading = headings.find((item) => {
      const text = item.textContent?.trim().toLowerCase() || "";
      return target.match.some((token) => text.includes(token));
    });
    if (!heading) continue;
    const section = heading.closest<HTMLElement>("section.card") || heading.parentElement;
    if (!section) continue;
    const id = `s4x-tech-${target.label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-")}`;
    section.id = id;

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = target.label;
    button.style.border = "1px solid #E2E8F0";
    button.style.background = "#F8FAFC";
    button.style.color = "#475569";
    button.style.borderRadius = "999px";
    button.style.padding = "4px 7px";
    button.style.fontSize = "9.5px";
    button.style.fontWeight = "700";
    button.style.cursor = "pointer";
    button.addEventListener("click", () => {
      details.open = true;
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    toolbar.appendChild(button);
  }
}

export function GoogleAdsAnalysisComposer() {
  useLayoutEffect(() => {
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
      const writeCenter = page.querySelector<HTMLElement>("[data-s4x-google-ads-write-center='true']");
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

        if (writeCenter && (writeCenter.parentElement !== analysisRoot || writeCenter.previousElementSibling !== actionPlan)) {
          analysisRoot.insertBefore(writeCenter, actionPlan.nextSibling);
        }

        const anchor = writeCenter?.parentElement === analysisRoot ? writeCenter : actionPlan;
        let details = analysisRoot.querySelector<HTMLElement>("[data-s4x-technical-details='true']") as HTMLDetailsElement | null;
        if (!details) {
          details = createTechnicalDetails();
          analysisRoot.insertBefore(details, anchor.nextSibling);
        } else if (details.previousElementSibling !== anchor) {
          analysisRoot.insertBefore(details, anchor.nextSibling);
        }

        const content = details.querySelector<HTMLElement>("[data-s4x-technical-details-content='true']");
        if (!content) return;

        const movable = Array.from(analysisRoot.children).filter((child): child is HTMLElement => {
          return child instanceof HTMLElement && child !== header && child !== overview && child !== actionPlan && child !== writeCenter && child !== details;
        });

        for (const node of movable) content.appendChild(node);
        addInvestigationShortcuts(details, content);
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
