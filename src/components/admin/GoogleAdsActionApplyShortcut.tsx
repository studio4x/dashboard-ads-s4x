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

type Destination = {
  group: "keywords" | "ads" | "segmentation" | "budget_bidding" | "assets" | null;
  status: "ready" | "manual" | "blocked";
};

function destination(title: string): Destination {
  const value = normalize(title);
  if (["revisar negativas", "revisar keywords", "revisar palavras-chave com gasto"].some((token) => value.includes(token))) return { group: "keywords", status: "ready" };
  if (["ad rank", "melhorar relevancia", "anuncio", "landing page"].some((token) => value.includes(token))) return { group: "ads", status: "ready" };
  if (["horario", "dispositivo", "segmentacao"].some((token) => value.includes(token))) return { group: "segmentation", status: "manual" };
  if (["eficiencia antes de escalar", "orcamento", "verba", "lances"].some((token) => value.includes(token))) return { group: "budget_bidding", status: "ready" };
  if (["preservar estrutura", "acumular evidencia"].some((token) => value.includes(token))) return { group: null, status: "blocked" };
  return { group: null, status: "manual" };
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
      const center = document.querySelector<HTMLElement>("[data-s4x-google-ads-advanced-actions='true']");
      if (!plan || !center) return;
      const grid = plan.children.item(1) as HTMLElement | null;
      if (!grid) return;

      for (const card of Array.from(grid.children)) {
        if (!(card instanceof HTMLElement)) continue;
        const header = card.firstElementChild as HTMLElement | null;
        const title = header?.querySelector("strong")?.textContent?.trim() || "";
        if (!header || header.querySelector("[data-s4x-action-availability]")) continue;
        const target = destination(title);

        const availability = document.createElement("span");
        availability.dataset.s4xActionAvailability = "true";
        availability.textContent = target.status === "ready" ? "PODE EXECUTAR PELA S4X" : target.status === "blocked" ? "BLOQUEADO POR FALTA DE DADOS" : "EXIGE AJUSTE ASSISTIDO";
        availability.style.padding = "3px 6px";
        availability.style.borderRadius = "999px";
        availability.style.fontSize = "8.5px";
        availability.style.fontWeight = "850";
        availability.style.color = target.status === "ready" ? "#047857" : target.status === "blocked" ? "#92400E" : "#6D28D9";
        availability.style.background = target.status === "ready" ? "#ECFDF5" : target.status === "blocked" ? "#FFFBEB" : "#F5F3FF";
        availability.style.border = `1px solid ${target.status === "ready" ? "#A7F3D0" : target.status === "blocked" ? "#FDE68A" : "#DDD6FE"}`;
        header.appendChild(availability);

        if (!target.group) continue;

        const button = document.createElement("button");
        button.type = "button";
        button.dataset.s4xApplyShortcut = "true";
        button.textContent = target.status === "ready" ? "Revisar alterações sugeridas" : "Abrir configuração assistida";
        button.title = "Abrir no centro inteligente as ações relacionadas a este diagnóstico.";
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
        button.addEventListener("click", () => {
          window.dispatchEvent(new CustomEvent("s4x:open-google-ads-action", { detail: { group: target.group } }));
          center.scrollIntoView({ behavior: "smooth", block: "start" });
        });
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
      document.querySelectorAll("[data-s4x-apply-shortcut], [data-s4x-action-availability]").forEach((node) => node.remove());
    };
  }, []);

  return null;
}
