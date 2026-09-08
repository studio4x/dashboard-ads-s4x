"use client";

import { useEffect } from "react";

type Props = {
  sourceId: string;
};

type ProgressItem = {
  action_title: string;
  completed: boolean;
  completed_at: string | null;
};

function normalizeTitle(value: string) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function findActionPlanSection() {
  const sections = Array.from(document.querySelectorAll<HTMLElement>("section.card"));
  return sections.find((section) => section.querySelector("h2")?.textContent?.trim() === "Plano de ação priorizado") || null;
}

function getActionCards(section: HTMLElement) {
  const grid = section.children.item(1) as HTMLElement | null;
  if (!grid) return [];
  return Array.from(grid.children).filter((item): item is HTMLElement => item instanceof HTMLElement);
}

function getActionTitle(card: HTMLElement) {
  const header = card.firstElementChild as HTMLElement | null;
  return header?.querySelector("strong")?.textContent?.trim() || "";
}

function formatCompletedAt(value: string | null) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "";
  }
}

function applyCompletedVisual(card: HTMLElement, button: HTMLButtonElement, completed: boolean, completedAt: string | null) {
  if (!card.dataset.s4xOriginalBackground) {
    card.dataset.s4xOriginalBackground = card.style.background || "";
    card.dataset.s4xOriginalBorder = card.style.border || "";
  }

  const title = card.firstElementChild?.querySelector("strong") as HTMLElement | null;
  if (completed) {
    card.style.background = "#F0FDF4";
    card.style.border = "1px solid #A7F3D0";
    card.style.opacity = "0.82";
    if (title) {
      title.style.textDecoration = "line-through";
      title.style.textDecorationThickness = "1px";
      title.style.color = "#475569";
    }
    button.textContent = "✓ Concluído";
    button.style.background = "#DCFCE7";
    button.style.borderColor = "#86EFAC";
    button.style.color = "#166534";
    button.title = completedAt ? `Concluído em ${formatCompletedAt(completedAt)}. Clique para reabrir.` : "Clique para reabrir esta ação.";
  } else {
    card.style.background = card.dataset.s4xOriginalBackground || "";
    card.style.border = card.dataset.s4xOriginalBorder || "";
    card.style.opacity = "1";
    if (title) {
      title.style.textDecoration = "none";
      title.style.color = "";
    }
    button.textContent = "○ Marcar concluído";
    button.style.background = "#FFFFFF";
    button.style.borderColor = "#CBD5E1";
    button.style.color = "#475569";
    button.title = "Marcar esta ação como concluída.";
  }
}

export function GoogleAdsActionProgressEnhancer({ sourceId }: Props) {
  useEffect(() => {
    let disposed = false;
    let observer: MutationObserver | null = null;
    let setupTimer: number | null = null;
    const progress = new Map<string, ProgressItem>();
    const pending = new Set<string>();

    function updateCounter(section: HTMLElement) {
      const cards = getActionCards(section);
      const completedCount = cards.filter((card) => {
        const item = progress.get(normalizeTitle(getActionTitle(card)));
        return item?.completed === true;
      }).length;

      const headerTextBlock = section.querySelector("h2")?.parentElement;
      if (!headerTextBlock) return;

      let counter = headerTextBlock.querySelector<HTMLElement>("[data-s4x-action-progress-counter]");
      if (!counter) {
        counter = document.createElement("p");
        counter.dataset.s4xActionProgressCounter = "true";
        counter.style.marginTop = "4px";
        counter.style.fontSize = "11px";
        counter.style.fontWeight = "700";
        counter.style.color = "#047857";
        headerTextBlock.appendChild(counter);
      }
      counter.textContent = `${completedCount} de ${cards.length} ação(ões) concluída(s)`;
    }

    async function save(title: string, completed: boolean) {
      const key = normalizeTitle(title);
      if (!key || pending.has(key)) return;
      pending.add(key);

      const previous = progress.get(key) || { action_title: title, completed: !completed, completed_at: null };
      const optimistic: ProgressItem = {
        action_title: title,
        completed,
        completed_at: completed ? new Date().toISOString() : null,
      };
      progress.set(key, optimistic);
      applyToDom();

      try {
        const response = await fetch("/api/admin/google-ads/action-progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ sourceId, actionTitle: title, completed }),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const json = await response.json();
        const item = json?.item as ProgressItem | undefined;
        if (item?.action_title) progress.set(normalizeTitle(item.action_title), item);
      } catch (error) {
        console.error("Não foi possível salvar a ação concluída:", error);
        progress.set(key, previous);
        window.alert("Não foi possível salvar essa marcação. Tente novamente.");
      } finally {
        pending.delete(key);
        applyToDom();
      }
    }

    function applyToDom() {
      if (disposed) return;
      const section = findActionPlanSection();
      if (!section) return;

      const cards = getActionCards(section);
      for (const card of cards) {
        const title = getActionTitle(card);
        if (!title) continue;
        const normalized = normalizeTitle(title);
        const item = progress.get(normalized);
        const header = card.firstElementChild as HTMLElement | null;
        if (!header) continue;

        let button = header.querySelector<HTMLButtonElement>("button[data-s4x-action-progress-button]");
        if (!button) {
          button = document.createElement("button");
          button.type = "button";
          button.dataset.s4xActionProgressButton = "true";
          button.style.height = "28px";
          button.style.padding = "0 9px";
          button.style.border = "1px solid #CBD5E1";
          button.style.borderRadius = "7px";
          button.style.fontSize = "10px";
          button.style.fontWeight = "800";
          button.style.cursor = "pointer";
          button.style.whiteSpace = "nowrap";
          button.style.transition = "all .15s ease";
          button.addEventListener("click", () => {
            const latest = progress.get(normalizeTitle(title));
            void save(title, !latest?.completed);
          });
          header.appendChild(button);
        }

        button.disabled = pending.has(normalized);
        button.style.cursor = pending.has(normalized) ? "wait" : "pointer";
        button.style.opacity = pending.has(normalized) ? "0.65" : "1";
        applyCompletedVisual(card, button, item?.completed === true, item?.completed_at || null);
      }

      updateCounter(section);
    }

    function scheduleApply() {
      if (setupTimer != null) window.clearTimeout(setupTimer);
      setupTimer = window.setTimeout(() => {
        setupTimer = null;
        applyToDom();
      }, 60);
    }

    async function load() {
      try {
        const response = await fetch(`/api/admin/google-ads/action-progress?sourceId=${encodeURIComponent(sourceId)}`, {
          cache: "no-store",
        });
        if (response.ok) {
          const json = await response.json();
          for (const item of (json?.items || []) as ProgressItem[]) {
            if (item?.action_title) progress.set(normalizeTitle(item.action_title), item);
          }
        }
      } catch (error) {
        console.error("Não foi possível carregar o progresso das ações:", error);
      }
      applyToDom();
    }

    void load();
    observer = new MutationObserver(scheduleApply);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      disposed = true;
      observer?.disconnect();
      if (setupTimer != null) window.clearTimeout(setupTimer);
      document.querySelectorAll("[data-s4x-action-progress-counter], [data-s4x-action-progress-button]").forEach((node) => node.remove());
    };
  }, [sourceId]);

  return null;
}
