"use client";

import { useEffect } from "react";

type Props = {
  sourceId: string;
};

type ActionStatus = "pending" | "in_progress" | "completed" | "validated";

type ProgressItem = {
  action_title: string;
  status: ActionStatus;
  note: string | null;
  completed: boolean;
  completed_at: string | null;
  started_at: string | null;
  validated_at: string | null;
  metrics_before?: Record<string, any> | null;
  metrics_after?: Record<string, any> | null;
};

const STATUS_LABELS: Record<ActionStatus, string> = {
  pending: "Pendente",
  in_progress: "Em andamento",
  completed: "Concluído",
  validated: "Validado",
};

function normalizeTitle(value: string) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function findActionPlanSection() {
  const sections = Array.from(document.querySelectorAll<HTMLElement>("section.card"));
  return sections.find((section) => section.querySelector("h2")?.textContent?.trim().toLowerCase() === "plano de ação priorizado") || null;
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

function activePeriod() {
  const params = new URLSearchParams(window.location.search);
  const from = params.get("from");
  const to = params.get("to");
  return { from, to };
}

function formatMetric(value: unknown, kind: "currency" | "percent" | "number") {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  if (kind === "currency") return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(number);
  if (kind === "percent") return `${number.toFixed(1).replace(".", ",")}%`;
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(number);
}

function validationSummary(item: ProgressItem | undefined) {
  const before = item?.metrics_before?.metrics || null;
  const after = item?.metrics_after?.metrics || null;
  if (!before || !after || item?.status !== "validated") return "";
  const pieces: string[] = [];
  if (Number.isFinite(Number(before.cpc)) && Number.isFinite(Number(after.cpc))) {
    pieces.push(`CPC ${formatMetric(before.cpc, "currency")} → ${formatMetric(after.cpc, "currency")}`);
  }
  if (Number.isFinite(Number(before.conversions)) && Number.isFinite(Number(after.conversions))) {
    pieces.push(`conversões ${formatMetric(before.conversions, "number")} → ${formatMetric(after.conversions, "number")}`);
  }
  if (Number.isFinite(Number(before.cvr)) && Number.isFinite(Number(after.cvr))) {
    pieces.push(`taxa de conversão ${formatMetric(before.cvr, "percent")} → ${formatMetric(after.cvr, "percent")}`);
  }
  return pieces.slice(0, 2).join(" · ");
}

function applyStatusVisual(card: HTMLElement, status: ActionStatus) {
  if (!card.dataset.s4xOriginalBackground) {
    card.dataset.s4xOriginalBackground = card.style.background || "";
    card.dataset.s4xOriginalBorder = card.style.border || "";
  }

  const title = card.firstElementChild?.querySelector("strong") as HTMLElement | null;
  if (title) {
    title.style.textDecoration = status === "validated" ? "line-through" : "none";
    title.style.textDecorationThickness = "1px";
    title.style.color = status === "validated" ? "#475569" : "";
  }

  if (status === "validated") {
    card.style.background = "#F0FDF4";
    card.style.border = "1px solid #86EFAC";
    card.style.opacity = "0.88";
  } else if (status === "completed") {
    card.style.background = "#F7FEE7";
    card.style.border = "1px solid #BEF264";
    card.style.opacity = "1";
  } else if (status === "in_progress") {
    card.style.background = "#EFF6FF";
    card.style.border = "1px solid #BFDBFE";
    card.style.opacity = "1";
  } else {
    card.style.background = card.dataset.s4xOriginalBackground || "";
    card.style.border = card.dataset.s4xOriginalBorder || "";
    card.style.opacity = "1";
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
      const counts = { pending: 0, in_progress: 0, completed: 0, validated: 0 };
      for (const card of cards) {
        const item = progress.get(normalizeTitle(getActionTitle(card)));
        const status: ActionStatus = item?.status || "pending";
        counts[status] += 1;
      }

      const headerTextBlock = section.querySelector("h2")?.parentElement;
      if (!headerTextBlock) return;

      let counter = headerTextBlock.querySelector<HTMLElement>("[data-s4x-action-progress-counter]");
      if (!counter) {
        counter = document.createElement("p");
        counter.dataset.s4xActionProgressCounter = "true";
        counter.style.marginTop = "4px";
        counter.style.fontSize = "10.5px";
        counter.style.fontWeight = "700";
        counter.style.color = "#475569";
        headerTextBlock.appendChild(counter);
      }
      const parts = [];
      if (counts.in_progress) parts.push(`${counts.in_progress} em andamento`);
      if (counts.completed) parts.push(`${counts.completed} concluída(s)`);
      if (counts.validated) parts.push(`${counts.validated} validada(s)`);
      counter.textContent = parts.length ? parts.join(" · ") : `${cards.length} ação(ões) pendente(s)`;
    }

    async function save(title: string, patch: { status?: ActionStatus; note?: string | null }) {
      const key = normalizeTitle(title);
      if (!key || pending.has(key)) return;
      pending.add(key);

      const previous = progress.get(key) || {
        action_title: title,
        status: "pending" as ActionStatus,
        note: null,
        completed: false,
        completed_at: null,
        started_at: null,
        validated_at: null,
      };
      const optimistic: ProgressItem = {
        ...previous,
        status: patch.status || previous.status,
        note: patch.note === undefined ? previous.note : patch.note,
        completed: (patch.status || previous.status) === "completed" || (patch.status || previous.status) === "validated",
      };
      progress.set(key, optimistic);
      applyToDom();

      try {
        const period = activePeriod();
        const response = await fetch("/api/admin/google-ads/action-progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            sourceId,
            actionTitle: title,
            status: optimistic.status,
            note: optimistic.note,
            from: period.from,
            to: period.to,
          }),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const json = await response.json();
        const item = json?.item as ProgressItem | undefined;
        if (item?.action_title) progress.set(normalizeTitle(item.action_title), item);
      } catch (error) {
        console.error("Não foi possível salvar o andamento da ação:", error);
        progress.set(key, previous);
        window.alert("Não foi possível salvar essa alteração. Tente novamente.");
      } finally {
        pending.delete(key);
        applyToDom();
      }
    }

    function ensureNoteArea(card: HTMLElement, title: string, item: ProgressItem | undefined) {
      let area = card.querySelector<HTMLElement>("[data-s4x-action-note-area]");
      if (!area) {
        area = document.createElement("div");
        area.dataset.s4xActionNoteArea = "true";
        area.style.display = "none";
        area.style.marginTop = "9px";
        area.style.paddingTop = "9px";
        area.style.borderTop = "1px dashed #CBD5E1";

        const textarea = document.createElement("textarea");
        textarea.dataset.s4xActionNoteInput = "true";
        textarea.rows = 2;
        textarea.placeholder = "Registre rapidamente o que foi feito ou o que precisa ser validado…";
        textarea.style.width = "100%";
        textarea.style.resize = "vertical";
        textarea.style.border = "1px solid #CBD5E1";
        textarea.style.borderRadius = "7px";
        textarea.style.padding = "8px 9px";
        textarea.style.fontSize = "11px";
        textarea.style.lineHeight = "1.4";
        textarea.style.color = "#334155";
        textarea.style.background = "#FFFFFF";

        const actions = document.createElement("div");
        actions.style.display = "flex";
        actions.style.justifyContent = "flex-end";
        actions.style.gap = "6px";
        actions.style.marginTop = "6px";

        const cancel = document.createElement("button");
        cancel.type = "button";
        cancel.textContent = "Fechar";
        cancel.style.border = "1px solid #E2E8F0";
        cancel.style.background = "#FFFFFF";
        cancel.style.borderRadius = "6px";
        cancel.style.padding = "5px 8px";
        cancel.style.fontSize = "10px";
        cancel.style.cursor = "pointer";
        cancel.addEventListener("click", () => { if (area) area.style.display = "none"; });

        const saveButton = document.createElement("button");
        saveButton.type = "button";
        saveButton.textContent = "Salvar observação";
        saveButton.style.border = "1px solid #BFDBFE";
        saveButton.style.background = "#EFF6FF";
        saveButton.style.color = "#1D4ED8";
        saveButton.style.borderRadius = "6px";
        saveButton.style.padding = "5px 8px";
        saveButton.style.fontSize = "10px";
        saveButton.style.fontWeight = "750";
        saveButton.style.cursor = "pointer";
        saveButton.addEventListener("click", () => {
          const input = area?.querySelector<HTMLTextAreaElement>("[data-s4x-action-note-input]");
          void save(title, { note: input?.value.trim() || null });
          if (area) area.style.display = "none";
        });

        actions.append(cancel, saveButton);
        area.append(textarea, actions);
        card.appendChild(area);
      }

      const textarea = area.querySelector<HTMLTextAreaElement>("[data-s4x-action-note-input]");
      if (textarea && document.activeElement !== textarea) textarea.value = item?.note || "";
      return area;
    }

    function ensureValidationLine(card: HTMLElement, item: ProgressItem | undefined) {
      let line = card.querySelector<HTMLElement>("[data-s4x-action-validation-result]");
      const summary = validationSummary(item);
      if (!summary) {
        line?.remove();
        return;
      }
      if (!line) {
        line = document.createElement("p");
        line.dataset.s4xActionValidationResult = "true";
        line.style.marginTop = "7px";
        line.style.fontSize = "10.5px";
        line.style.color = "#047857";
        line.style.fontWeight = "700";
        card.appendChild(line);
      }
      line.textContent = `Validação registrada: ${summary}`;
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
        const status: ActionStatus = item?.status || "pending";
        const header = card.firstElementChild as HTMLElement | null;
        if (!header) continue;

        let controls = header.querySelector<HTMLElement>("[data-s4x-action-controls]");
        if (!controls) {
          controls = document.createElement("div");
          controls.dataset.s4xActionControls = "true";
          controls.style.display = "inline-flex";
          controls.style.alignItems = "center";
          controls.style.gap = "5px";
          controls.style.marginLeft = "4px";

          const select = document.createElement("select");
          select.dataset.s4xActionStatus = "true";
          select.style.height = "28px";
          select.style.border = "1px solid #CBD5E1";
          select.style.borderRadius = "7px";
          select.style.padding = "0 7px";
          select.style.fontSize = "10px";
          select.style.fontWeight = "750";
          select.style.color = "#475569";
          select.style.background = "#FFFFFF";
          select.style.cursor = "pointer";
          for (const [value, label] of Object.entries(STATUS_LABELS)) {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = label;
            select.appendChild(option);
          }
          select.addEventListener("change", () => void save(title, { status: select.value as ActionStatus }));

          const noteButton = document.createElement("button");
          noteButton.type = "button";
          noteButton.dataset.s4xActionNoteButton = "true";
          noteButton.textContent = "Observação";
          noteButton.style.height = "28px";
          noteButton.style.border = "1px solid #CBD5E1";
          noteButton.style.borderRadius = "7px";
          noteButton.style.padding = "0 7px";
          noteButton.style.background = "#FFFFFF";
          noteButton.style.color = "#64748B";
          noteButton.style.fontSize = "9.5px";
          noteButton.style.fontWeight = "700";
          noteButton.style.cursor = "pointer";
          noteButton.addEventListener("click", () => {
            const latest = progress.get(normalizeTitle(title));
            const area = ensureNoteArea(card, title, latest);
            area.style.display = area.style.display === "none" ? "block" : "none";
            if (area.style.display === "block") area.querySelector<HTMLTextAreaElement>("textarea")?.focus();
          });

          controls.append(select, noteButton);
          header.appendChild(controls);
        }

        const select = controls.querySelector<HTMLSelectElement>("[data-s4x-action-status]");
        const noteButton = controls.querySelector<HTMLButtonElement>("[data-s4x-action-note-button]");
        if (select) {
          select.value = status;
          select.disabled = pending.has(normalized);
          select.style.opacity = pending.has(normalized) ? "0.6" : "1";
          select.style.borderColor = status === "validated" ? "#86EFAC" : status === "completed" ? "#BEF264" : status === "in_progress" ? "#93C5FD" : "#CBD5E1";
        }
        if (noteButton) {
          noteButton.textContent = item?.note ? "Ver observação" : "Observação";
          noteButton.style.color = item?.note ? "#1D4ED8" : "#64748B";
        }

        ensureNoteArea(card, title, item);
        ensureValidationLine(card, item);
        applyStatusVisual(card, status);
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
        const response = await fetch(`/api/admin/google-ads/action-progress?sourceId=${encodeURIComponent(sourceId)}`, { cache: "no-store" });
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
      document.querySelectorAll("[data-s4x-action-progress-counter], [data-s4x-action-controls], [data-s4x-action-note-area], [data-s4x-action-validation-result]").forEach((node) => node.remove());
    };
  }, [sourceId]);

  return null;
}
