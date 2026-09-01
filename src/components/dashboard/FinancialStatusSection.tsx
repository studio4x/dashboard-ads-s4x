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

function FinancialCard({ status }: { status: FinancialStatusWithConfiguredAlert }) {
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
  const isBelowConfiguredThreshold = status.configuredFinancialAlertState === "below_threshold" || isBelowAmount || isBelowDays;
  const Icon = status.status === "error" ? AlertTriangle : status.status === "available" ? (isCritical || isAttention || isBelowConfiguredThreshold ? AlertTriangle : CheckCircle2) : CircleHelp;
  const toneColor = status.status === "error" || isCritical || isBelowConfiguredThreshold ? "#B91C1C" : isAttention ? "#B45309" : "#2563EB";
  const tooltip = status.provider === "google_ads"
    ? "A Google Ads API não disponibiliza um saldo financeiro universal para todos os modelos de faturamento. Este valor representa o orçamento de conta disponível quando esse recurso é aplicável."
    : "A interpretação do valor financeiro depende do modelo de cobrança da conta. O Dashboard ADS diferencia saldo, faturamento e limite de gastos quando a API fornece informações suficientes.";
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" title={tooltip}>
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
          {status.accountBudgetLimit !== null && <div className="mt-2 text-xs text-slate-500">Limite: <strong>{formatMoney(status.accountBudgetLimit, status.currency)}</strong></div>}
          {status.accountBudgetConsumed !== null && <div className="text-xs text-slate-500">Consumido: <strong>{formatMoney(status.accountBudgetConsumed, status.currency)}</strong></div>}
          {status.spendingLimit !== null && status.provider === "meta_ads" && <div className="mt-2 text-xs text-slate-500">Limite: <strong>{formatMoney(status.spendingLimit, status.currency)}</strong></div>}
          {status.amountSpent !== null && status.provider === "meta_ads" && <div className="text-xs text-slate-500">Gasto acumulado: <strong>{formatMoney(status.amountSpent, status.currency)}</strong></div>}
          {status.outstandingBalance !== null && status.provider === "meta_ads" && <div className="text-xs text-slate-500">{status.outstandingBalanceLabel || "Valor de faturamento"}: <strong>{formatMoney(status.outstandingBalance, status.currency)}</strong></div>}
          {status.estimatedDaysRemaining !== null && <div className="mt-2 text-xs font-semibold text-slate-600">Cobertura estimada: {status.estimatedDaysRemaining.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} dias</div>}
          {(hasConfiguredThreshold || hasConfiguredDays) && (
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
        {status.estimatedDaysRemaining !== null && <span title="Estimativa baseada no gasto médio diário recente. Não representa garantia de entrega.">· estimativa baseada no gasto médio diário recente</span>}
      </div>
    </div>
  );
}

export function FinancialStatusSection({
  googleStatus,
  metaStatuses,
}: {
  googleStatus?: FinancialStatusWithConfiguredAlert | null;
  metaStatuses?: FinancialStatusWithConfiguredAlert[];
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
        {statuses.map((status, index) => <FinancialCard key={`${status.provider}-${status.accountId || index}`} status={status} />)}
      </div>
    </section>
  );
}
