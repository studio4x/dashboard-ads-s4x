"use client";

import { useEffect } from "react";

function normalize(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function supported(title: string) {
  const value = normalize(title);
  return [
    "revisar negativas",
    "revisar keywords",
    "revisar palavras-chave com gasto",
    "recuperar eficiencia antes de escalar",
  ].some((token) => value.includes(token));
}

export function GoogleAdsActionApplyShortcut() {
  useEffect(() => {
    let disposed = false;
    let scheduled = false;

    const apply = () => {
      scheduled = false;
      if (disposed) return;
      const sections = Array.from(document.querySelectorAll<HTMLElement>("section.card"));
      const plan = sections.find((section) => normalize(section.querySelector("h2")?.textContent || "") === "plano de acao priorizado");
      const center = document.querySelector<HTMLElement>("[data-s4x-google-ads-write-center='true']");
      if (!plan || !center) return;
      const grid = plan.children.item(1) as HTMLElement | null;
      if (!grid) return;

      for (const card of Array.from(grid.children)) {
        if (!(card instanceof HTMLElement)) continue;
        const header = card.firstElementChild as HTMLElement | null;
        const title = header?.querySelector("strong")?.textContent?.trim() || "";
        if (!header || !supported(title) || header.querySelector("[data-s4x-apply-shortcut]")) continue;

        const button = document.createElement("button");
        button.type = "button";
        button.dataset.s4xApplyShortcut = "true";
        button.textContent = "Abrir controles no Google Ads";
        button.title = "Ir para a área segura de preparação e aplicação das alterações.";
        button.style.height = "27px";
        button.style.padding = "0 8px";
        button.style.border = "1px solid #93C5FD";
        button.style.borderRadius = "7px";
        button.style.background = "#EFF6FF";
        button.style.color = "#1D4ED8";
        button.style.fontSize = "9.5px";
        button.style.fontWeight = "800";
        button.style.cursor = "pointer";
        button.style.whiteSpace = "nowrap";
        button.addEventListener("click", () => center.scrollIntoView({ behavior: "smooth", block: "start" }));
        header.appendChild(button);
      }
    };

    const schedule = () => {
      if (scheduled || disposed) return;
      scheduled = true;
      window.requestAnimationFrame(apply);
    };

    apply();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      disposed = true;
      observer.disconnect();
      document.querySelectorAll("[data-s4x-apply-shortcut]").forEach((node) => node.remove());
    };
  }, []);

  return null;
}
