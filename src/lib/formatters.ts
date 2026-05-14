// ============================================================
// Formatadores de valores para o dashboard
// ============================================================

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const BRL_COMPACT = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  compactDisplay: "short",
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

const NUM = new Intl.NumberFormat("pt-BR");

const NUM_COMPACT = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  compactDisplay: "short",
});

const PCT = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
});

export function formatCurrency(value: number, compact = false): string {
  return compact ? BRL_COMPACT.format(value) : BRL.format(value);
}

export function formatNumber(value: number, compact = false): string {
  return compact ? NUM_COMPACT.format(value) : NUM.format(value);
}

export function formatPercent(value: number): string {
  return PCT.format(value / 100);
}

export function formatRoas(value: number): string {
  return `${value.toFixed(2)}x`;
}

export function formatChange(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

export function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

export function formatDateShort(dateStr: string): string {
  const [, month, day] = dateStr.split("-");
  const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  return `${day} ${months[parseInt(month) - 1]}`;
}
