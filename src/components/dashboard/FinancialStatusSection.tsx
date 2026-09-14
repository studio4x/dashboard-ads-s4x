import { Fragment } from "react";
import { AlertTriangle, CheckCircle2, CircleHelp, Info, WalletCards } from "lucide-react";
import type { AdsFinancialStatus } from "@/lib/ads-financial";

type FinancialStatusWithConfiguredAlert = AdsFinancialStatus & {
  alertThresholdAmount?: number | null;
  alertAmountEnabled?: boolean | null;
  alertDaysEnabled?: boolean | null;
  alertThresholdDays?: number | null;
  configuredFinancialAlertState?: string | null;
  configuredFinancialAlertTrigger?: string | null;
};

function formatMoney(value: number | null, currency: string | null) {
  if (value === null || !Number.isFinite(value)) return null;
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: currency || "BRL" }).format(value);
  } catch {
    return `${currency || ""} ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`.trim();
  }
}

function updatedAtLabel(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : `Atualizado em ${new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo",
  }).format(date)}`;
}

function estimatedEndDateLabel(value: string | null) {
  if (!value) return null;
  const date = new Date(`${value.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Sao_Paulo" }).format(date);
}

function statusPresentation(status: AdsFinancialStatus) {
  if (status.status === "unlimited") return { label: "Sem limite de orçamento de conta definido", value: null, tone: "neutral" };
  if (status.status === "error") return { label: "Informação financeira temporariamente indisponível", value: null, tone: "warning" };
  if (status.status === "not_available" || status.status === "not_applicable") {
    return { label: status.provider === "google_ads"
      ? "Saldo financeiro não disponibilizado pela Google Ads API para este modelo de faturamento"
      : "Informação financeira não disponibilizada de forma conclusiva pela Meta API", value: null, tone: "neutral" };
  }
  if (status.availableAmount !== null) return { label: status.availableAmountLabel || "Saldo pré-pago disponível", value: status.availableAmount, tone: "available" };
  if (status.remainingUntilLimit !== null) return { label: status.provider === "google_ads" ? "Orçamento de conta restante" : "Disponível até o limite", value: status.remainingUntilLimit, tone: "available" };
  return { label: status.outstandingBalanceLabel || "Valor de faturamento", value: status.outstandingBalance, tone: "neutral" };
}

function FinancialCard({ status, isPublic }: { status: FinancialStatusWithConfiguredAlert; isPublic: boolean }) {
  const presentation = statusPresentation(status);
  const isCritical = status.alertStatus === "critical";
  const isAttention = status.alertStatus === "attention";
  const configuredThreshold = Number(status.alertThresholdAmount);
  const configuredDays = Number(status.alertThresholdDays);
  const amountEnabled = status.alertAmountEnabled !== false;
  const daysEnabled = status.alertDaysEnabled === true;
  const hasConfiguredThreshold = amountEnabled
    && status.alertThresholdAmount !== null
    && status.alertThresholdAmount !== undefined
    && Number.isFinite(configuredThreshold);
  const hasConfiguredDays = daysEnabled
    && status.alertThresholdDays !== null
    && status.alertThresholdDays !== undefined
    && Number.isFinite(configuredDays);
  const isBelowAmount = hasConfiguredThreshold && presentation.value !== null && presentation.value < configuredThreshold;
  const isBelowDays = hasConfiguredDays && status.estimatedDaysRemaining !== null && status.estimatedDaysRemaining < configuredDays;
  const isBelowConfiguredThreshold = !isPublic && (status.configuredFinancialAlertState === "below_threshold" || isBelowAmount || isBelowDays);
  const Icon = status.status === "error" ? AlertTriangle : status.status === "available" ? (isCritical || isAttention || isBelowConfiguredThreshold ? AlertTriangle : CheckCircle2) : CircleHelp;
  const toneColor = status.status === "error" || isCritical || isBelowConfiguredThreshold ? "#B91C1C" : isAttention ? "#B45309" : "#2563EB";
  const tooltip = status.provider === "google_ads"
    ? "A Google Ads API não disponibiliza um saldo financeiro universal para todos os modelos de faturamento. Este valor representa o orçamento de conta disponível quando esse recurso é aplicável."
    : "A interpretação do valor financeiro depende do modelo de cobrança da conta. O Dashboard ADS diferencia saldo, faturamento e limite de gastos quando a API fornece informações suficientes.";
  return (
    <div className="h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" title={tooltip}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <WalletCards size={15} className="text-blue-600" />
            {status.provider === "google_ads" ? "Google Ads" : "Meta Ads"}
          </div>
          {status.accountName && <div className="mt-1 text-xs text-slate-400">{status.accountName}</div>}
        </div>
        <Info size={16} className="shrink-0 text-slate-400" aria-label="Sobre os dados financeiros" />
      </div>
      <div className="mt-4 flex items-start gap-3">
        <Icon size={18} color={toneColor} className="mt-1 shrink-0" />
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-700">{presentation.label}</div>
          {presentation.value !== null && <div className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">{formatMoney(presentation.value, status.currency)}</div>}
          {!isPublic && status.accountBudgetLimit !== null && <div className="mt-2 text-xs text-slate-500">Limite: <strong>{formatMoney(status.accountBudgetLimit, status.currency)}</strong></div>}
          {!isPublic && status.accountBudgetConsumed !== null && <div className="text-xs text-slate-500">Consumido: <strong>{formatMoney(status.accountBudgetConsumed, status.currency)}</strong></div>}
          {status.spendingLimit !== null && status.provider === "meta_ads" && <div className="mt-2 text-xs text-slate-500">Limite: <strong>{formatMoney(status.spendingLimit, status.currency)}</strong></div>}
          {status.amountSpent !== null && status.provider === "meta_ads" && <div className="text-xs text-slate-500">Gasto acumulado: <strong>{formatMoney(status.amountSpent, status.currency)}</strong></div>}
          {status.outstandingBalance !== null && status.provider === "meta_ads" && <div className="text-xs text-slate-500">{status.outstandingBalanceLabel || "Valor de faturamento"}: <strong>{formatMoney(status.outstandingBalance, status.currency)}</strong></div>}
          {status.estimatedDaysRemaining !== null && <div className="mt-2 text-xs font-semibold text-slate-600">Cobertura estimada: {status.estimatedDaysRemaining.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} dias</div>}
          {estimatedEndDateLabel(status.estimatedEndDate) && <div className="text-xs font-semibold text-slate-600">Data estimada de término: {estimatedEndDateLabel(status.estimatedEndDate)}</div>}
          {!isPublic && (hasConfiguredThreshold || hasConfiguredDays) && (
            <div className="mt-2 space-y-0.5 text-xs font-semibold text-slate-600">
              {hasConfiguredThreshold && <div>Alerta por valor abaixo de {formatMoney(configuredThreshold, status.currency)}</div>}
              {hasConfiguredDays && <div>Alerta por cobertura abaixo de {configuredDays.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} dias</div>}
            </div>
          )}
          {isBelowConfiguredThreshold && <div className="mt-1 text-xs font-semibold text-red-700">⚠ Abaixo de um dos limites de alerta configurados</div>}
          {isCritical && <div className="mt-1 text-xs font-semibold text-red-700">Verba estimada para menos de 3 dias</div>}
          {isAttention && <div className="mt-1 text-xs font-semibold text-amber-700">Verba estimada para menos de 7 dias</div>}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1 text-[10px] text-slate-400">
        <span>{updatedAtLabel(status.updatedAt) || "Data de atualização não informada"}</span>
        {status.estimatedDaysRemaining !== null && <span title="Estimativa baseada no gasto médio diário recente e na programação de veiculação. Não representa garantia de entrega.">· estimativa baseada no gasto médio e na programação recente</span>}
      </div>
    </div>
  );
}

function getBudgetBreakdown(status: FinancialStatusWithConfiguredAlert) {
  const rawLimit = status.provider === "google_ads" ? status.accountBudgetLimit : status.spendingLimit;
  const rawConsumed = status.provider === "google_ads" ? status.accountBudgetConsumed : status.amountSpent;
  const limit = rawLimit !== null ? Number(rawLimit) : NaN;
  const consumed = rawConsumed !== null ? Number(rawConsumed) : NaN;
  if (!Number.isFinite(limit) || !Number.isFinite(consumed) || limit <= 0 || consumed < 0) return null;

  const consumedAmount = Math.min(consumed, limit);
  const remainingAmount = Math.max(limit - consumedAmount, 0);
  const consumedPercent = Math.min(Math.max((consumedAmount / limit) * 100, 0), 100);
  const remainingPercent = Math.max(100 - consumedPercent, 0);
  return { limit, consumedAmount, remainingAmount, consumedPercent, remainingPercent };
}

function BudgetChartCard({ status }: { status: FinancialStatusWithConfiguredAlert }) {
  const breakdown = getBudgetBreakdown(status);
  const remainingColor = breakdown && breakdown.remainingPercent <= 10 ? "#F59E0B" : "#16A34A";
  const providerLabel = status.provider === "google_ads" ? "Google Ads" : "Meta Ads";

  return (
    <div className="h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h3 className="text-sm font-bold text-slate-800">Leitura do orçamento</h3>
        <p className="mt-1 text-xs text-slate-500">Distribuição do limite informado pela {providerLabel}.</p>
      </div>
      {breakdown ? (
        <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row sm:items-center">
          <div
            className="relative flex h-36 w-36 shrink-0 items-center justify-center rounded-full"
            style={{ background: `conic-gradient(${remainingColor} 0 ${breakdown.remainingPercent}%, #2563EB ${breakdown.remainingPercent}% 100%)` }}
            role="img"
            aria-label={`${breakdown.remainingPercent.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% do orçamento restante`}
          >
            <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-white text-center">
              <strong className="text-xl font-extrabold text-slate-900">
                {breakdown.remainingPercent.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
              </strong>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">restante</span>
            </div>
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="flex items-center gap-2 text-slate-500"><span className="h-2.5 w-2.5 rounded-full bg-blue-600" />Consumido</span>
              <strong className="text-slate-800">{formatMoney(breakdown.consumedAmount, status.currency)}</strong>
            </div>
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="flex items-center gap-2 text-slate-500"><span className="h-2.5 w-2.5 rounded-full" style={{ background: remainingColor }} />Restante</span>
              <strong className="text-slate-800">{formatMoney(breakdown.remainingAmount, status.currency)}</strong>
            </div>
            <div className="border-t border-slate-100 pt-3 text-xs text-slate-500">
              Limite total: <strong className="text-slate-700">{formatMoney(breakdown.limit, status.currency)}</strong>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-5 flex min-h-36 items-center justify-center rounded-xl bg-slate-50 px-5 text-center text-xs text-slate-500">
          A plataforma não informou limite e consumo suficientes para montar o gráfico.
        </div>
      )}
    </div>
  );
}

export function FinancialStatusSection({
  googleStatus,
  metaStatuses,
  isPublic = false,
}: {
  googleStatus?: FinancialStatusWithConfiguredAlert | null;
  metaStatuses?: FinancialStatusWithConfiguredAlert[];
  isPublic?: boolean;
}) {
  const statuses = [googleStatus, ...(metaStatuses || [])].filter((status): status is FinancialStatusWithConfiguredAlert => Boolean(status));
  if (!statuses.length) return null;
  return (
    <section aria-label="Informações financeiras e orçamentárias" className="space-y-3">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Orçamento e informações financeiras</h2>
        <p className="mt-1 text-xs text-slate-500">Os conceitos são exibidos separadamente por plataforma e não são somados.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {statuses.map((status, index) => (
          <Fragment key={`${status.provider}-${status.accountId || index}`}>
            <FinancialCard status={status} isPublic={isPublic} />
            <BudgetChartCard status={status} />
          </Fragment>
        ))}
      </div>
    </section>
  );
}
