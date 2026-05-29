"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Copy, CheckCircle2, Info, Loader2, Play, Save } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

const APP_BASE_URL = "https://dashboard-ads-s4x.vercel.app";
const DISPATCH_ENDPOINT = `${APP_BASE_URL}/api/admin/automations/report-dispatch`;

type DispatchPayloadCandidate = {
  response?: { pdf?: { url?: string }; pdfUrl?: string };
  pdf?: { url?: string };
  pdfUrl?: string;
};

type DashboardOption = {
  id: string;
  name?: string | null;
  title?: string | null;
  clients?: { name?: string | null } | null;
};

function extractPdfUrl(payload: DispatchPayloadCandidate): string {
  const candidates = [
    payload?.response?.pdf?.url,
    payload?.response?.pdfUrl,
    payload?.pdf?.url,
    payload?.pdfUrl,
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function CopyBlock({
  title,
  value,
  rows = 3,
}: {
  title: string;
  value: string;
  rows?: number;
}) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast("Não foi possível copiar automaticamente.", "error");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>{title}</p>
        <button
          type="button"
          onClick={copy}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            fontWeight: 600,
            color: copied ? "#16A34A" : "#1D4ED8",
            border: copied ? "1px solid #BBF7D0" : "1px solid #BFDBFE",
            background: copied ? "#F0FDF4" : "#EFF6FF",
            borderRadius: 8,
            padding: "6px 10px",
            cursor: "pointer",
          }}
        >
          {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
      <textarea
        readOnly
        rows={rows}
        value={value}
        style={{
          width: "100%",
          border: "1px solid #E2E8F0",
          borderRadius: 10,
          background: "#F8FAFC",
          color: "#0F172A",
          fontSize: 12,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          padding: 10,
          resize: "vertical",
        }}
      />
    </div>
  );
}

export default function AdminAutomationsPage() {
  const { toast } = useToast();
  const today = new Date();
  const defaultToDate = new Date(today);
  defaultToDate.setDate(defaultToDate.getDate() - 1);
  const defaultFromDate = new Date(defaultToDate);
  defaultFromDate.setDate(defaultFromDate.getDate() - 6);
  const defaultFrom = defaultFromDate.toISOString().slice(0, 10);
  const defaultTo = defaultToDate.toISOString().slice(0, 10);

  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookMasked, setWebhookMasked] = useState("");
  const [isSavingWebhook, setIsSavingWebhook] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<"idle" | "ok" | "error">("idle");
  const [webhookMessage, setWebhookMessage] = useState("");
  const [webhookLoaded, setWebhookLoaded] = useState(false);
  const [webhookDirty, setWebhookDirty] = useState(false);
  const lastSavedWebhookRef = useRef("");

  const [dashboards, setDashboards] = useState<DashboardOption[]>([]);
  const [dashboardId, setDashboardId] = useState("");
  const [testFrom, setTestFrom] = useState(defaultFrom);
  const [testTo, setTestTo] = useState(defaultTo);
  const [testReportMode, setTestReportMode] = useState<"analysis_only" | "metrics_only" | "both" | "pdf_only" | "analysis_pdf" | "both_pdf">("both");
  const [isTesting, setIsTesting] = useState(false);
  const [testResponse, setTestResponse] = useState("");
  const [testPdfUrl, setTestPdfUrl] = useState("");

  useEffect(() => {
    const loadDashboards = async () => {
      try {
        const res = await fetch("/api/admin/dashboards/list-all");
        const data = await res.json();
        if (Array.isArray(data)) {
          setDashboards(data);
          if (data.length > 0) {
            setDashboardId(data[0].id);
          }
        }
      } catch {
        // silêncio proposital; a tela ainda funciona por input manual
      }
    };
    loadDashboards();
  }, []);

  useEffect(() => {
    const loadWebhook = async () => {
      try {
        const res = await fetch("/api/admin/automations/n8n-webhook");
        const json = await res.json();
        if (res.ok && json?.success) {
          const value = String(json.webhookUrl || "");
          setWebhookUrl(value);
          setWebhookMasked(String(json.webhookUrlMasked || ""));
          lastSavedWebhookRef.current = value;
        }
      } catch {
        // mantém vazio em caso de erro
      } finally {
        setWebhookLoaded(true);
      }
    };
    loadWebhook();
  }, []);

  const saveWebhookToVercel = async (valueOverride?: string) => {
    const value = String(valueOverride ?? webhookUrl).trim();
    if (!value) {
      setWebhookStatus("error");
      setWebhookMessage("Informe a URL do webhook antes de salvar.");
      return false;
    }

    setIsSavingWebhook(true);
    setWebhookStatus("idle");
    setWebhookMessage("Salvando webhook na Vercel...");
    try {
      const res = await fetch("/api/admin/automations/n8n-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl: value }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        setWebhookStatus("error");
        setWebhookMessage(json?.error || "Falha ao salvar webhook na Vercel.");
        return false;
      }

      setWebhookStatus("ok");
      setWebhookMessage(json?.message || "Webhook salvo com sucesso.");
      setWebhookMasked(String(json?.webhookUrlMasked || ""));
      lastSavedWebhookRef.current = value;
      setWebhookDirty(false);
      return true;
    } catch (error: unknown) {
      setWebhookStatus("error");
      setWebhookMessage(error instanceof Error ? error.message : "Erro ao salvar webhook.");
      return false;
    } finally {
      setIsSavingWebhook(false);
    }
  };

  useEffect(() => {
    if (!webhookLoaded || !webhookDirty) return;
    const value = webhookUrl.trim();
    if (!value || value === lastSavedWebhookRef.current) return;

    const timer = setTimeout(() => {
      saveWebhookToVercel(value);
    }, 900);

    return () => clearTimeout(timer);
  }, [webhookUrl, webhookDirty, webhookLoaded]);

  const runDispatchTest = async (dryRun: boolean) => {
    if (!dashboardId) {
      toast("Selecione ou informe um dashboardId para testar.", "warning");
      return;
    }
    setIsTesting(true);
    setTestResponse("");
    setTestPdfUrl("");
    try {
      const payload: Record<string, unknown> = {
        dashboardId,
        dryRun,
        reportMode: testReportMode,
      };
      if (testFrom) payload.from = testFrom;
      if (testTo) payload.to = testTo;

      const res = await fetch("/api/admin/automations/report-dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      const responsePayload = {
        httpStatus: res.status,
        ok: res.ok,
        response: json,
      };
      setTestPdfUrl(extractPdfUrl(responsePayload));
      setTestResponse(
        JSON.stringify(
          responsePayload,
          null,
          2
        )
      );
    } catch (error: unknown) {
      setTestPdfUrl("");
      setTestResponse(
        JSON.stringify(
          {
            ok: false,
            error: error instanceof Error ? error.message : "Erro ao executar teste",
          },
          null,
          2
        )
      );
    } finally {
      setIsTesting(false);
    }
  };

  const samplePayload = useMemo(
    () =>
      JSON.stringify(
        {
          dashboardId: "UUID_DO_DASHBOARD",
          channels: ["email", "whatsapp"],
          recipients: {
            emails: ["cliente@empresa.com"],
            phones: ["5511999999999"],
          },
          reportMode: "both",
          from: "2026-05-01",
          to: "2026-05-31",
        },
        null,
        2
      ),
    []
  );

  const dryRunPayload = useMemo(
    () =>
      JSON.stringify(
        {
          dashboardId: "UUID_DO_DASHBOARD",
          dryRun: true,
          reportMode: "analysis_only",
        },
        null,
        2
      ),
    []
  );

  const webhookHeaders = useMemo(
    () =>
      JSON.stringify(
        {
          "X-S4X-Event": "dashboard_report_dispatch",
          "X-S4X-Dashboard-Id": "uuid-do-dashboard",
          Authorization: "Bearer <N8N_REPORT_DISPATCH_WEBHOOK_TOKEN>",
        },
        null,
        2
      ),
    []
  );

  const curlExample = useMemo(
    () => `curl -X POST "${DISPATCH_ENDPOINT}" \\
  -H "Content-Type: application/json" \\
  -H "Cookie: <sessao_admin>" \\
  -d '{
    "dashboardId": "UUID_DO_DASHBOARD",
    "reportMode": "both",
    "recipients": {
      "emails": ["cliente@empresa.com"],
      "phones": ["5511999999999"]
    },
    "from": "2026-05-01",
    "to": "2026-05-31"
  }'`,
    []
  );

  const n8nChecklist = useMemo(
    () =>
      [
        "Crie um workflow com nó Webhook (POST).",
        "Copie a URL do Webhook e configure na variável N8N_REPORT_DISPATCH_WEBHOOK_URL no Vercel.",
        "Defina um token real em N8N_REPORT_DISPATCH_WEBHOOK_TOKEN e valide o header Authorization no n8n.",
        "Use IA com report.summary, report.comparativo, report.funil, report.topItems, report.series e report.insights.",
        "Envie por e-mail e WhatsApp no fim do fluxo.",
      ].join("\n"),
    []
  );

  return (
    <div style={{ padding: 32, maxWidth: 1080 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0F172A" }}>Automações (n8n)</h1>
        <p style={{ fontSize: 14, color: "#64748B", marginTop: 4 }}>
          Central de informações para integrar o disparo de relatórios com o n8n.
        </p>
      </div>

      <div
        className="card"
        style={{
          padding: 16,
          border: "1px solid #BFDBFE",
          background: "#EFF6FF",
          color: "#1E3A8A",
          borderRadius: 10,
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          marginBottom: 18,
        }}
      >
        <Info size={16} style={{ marginTop: 2, flexShrink: 0 }} />
        <div style={{ fontSize: 13, lineHeight: 1.5 }}>
          As variáveis de ambiente do n8n já foram criadas no projeto Vercel. Se necessário, ajuste os valores reais no painel da Vercel antes do uso em produção.
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
        <div className="card" style={{ padding: 20 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", marginBottom: 12 }}>
            Webhook n8n (salvo na Vercel)
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>URL do Webhook (POST)</label>
            <input
              value={webhookUrl}
              onChange={(e) => {
                setWebhookUrl(e.target.value);
                setWebhookDirty(true);
                setWebhookStatus("idle");
                setWebhookMessage("Alteração detectada. Salvamento automático ativo.");
              }}
              placeholder="https://seu-n8n/webhook/..."
              style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13 }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <p style={{ fontSize: 11, color: "#64748B" }}>
                {webhookMasked ? `Atual na Vercel: ${webhookMasked}` : "Nenhum webhook válido detectado no runtime atual."}
              </p>
              <button
                type="button"
                disabled={isSavingWebhook}
                onClick={() => saveWebhookToVercel()}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  borderRadius: 8,
                  border: "1px solid #BFDBFE",
                  background: "#EFF6FF",
                  color: "#1D4ED8",
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "8px 12px",
                  cursor: "pointer",
                }}
              >
                {isSavingWebhook ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                Salvar agora na Vercel
              </button>
            </div>

            {webhookMessage && (
              <div
                style={{
                  marginTop: 4,
                  borderRadius: 8,
                  padding: "8px 10px",
                  fontSize: 12,
                  border:
                    webhookStatus === "ok"
                      ? "1px solid #BBF7D0"
                      : webhookStatus === "error"
                        ? "1px solid #FECACA"
                        : "1px solid #E2E8F0",
                  background:
                    webhookStatus === "ok"
                      ? "#F0FDF4"
                      : webhookStatus === "error"
                        ? "#FEF2F2"
                        : "#F8FAFC",
                  color:
                    webhookStatus === "ok"
                      ? "#166534"
                      : webhookStatus === "error"
                        ? "#991B1B"
                        : "#475569",
                }}
              >
                {webhookMessage}
              </div>
            )}
          </div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", marginBottom: 12 }}>
            Testar Disparo Agora
          </p>
          <div
            style={{
              marginBottom: 12,
              borderRadius: 8,
              border: "1px solid #FDE68A",
              background: "#FFFBEB",
              color: "#92400E",
              fontSize: 12,
              padding: "8px 10px",
              lineHeight: 1.45,
            }}
          >
            <strong>Importante:</strong> o botão <strong>Teste Dry Run</strong> não envia requisição ao n8n. Ele apenas simula o payload para validação. Para enviar ao webhook, use <strong>Teste Real no n8n</strong>.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Dashboard</label>
              <select
                value={dashboardId}
                onChange={(e) => setDashboardId(e.target.value)}
                style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13 }}
              >
                {dashboards.length === 0 ? (
                  <option value="">Informe manualmente abaixo</option>
                ) : (
                  dashboards.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} | {d.clients?.name || "Sem cliente"} ({d.id})
                    </option>
                  ))
                )}
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Dashboard ID (manual)</label>
              <input
                value={dashboardId}
                onChange={(e) => setDashboardId(e.target.value)}
                placeholder="UUID do dashboard"
                style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13 }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Data início (opcional)</label>
              <input
                type="date"
                value={testFrom}
                onChange={(e) => setTestFrom(e.target.value)}
                style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13 }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Data fim (opcional)</label>
              <input
                type="date"
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
                style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13 }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Conteúdo do payload</label>
              <select
                value={testReportMode}
                onChange={(e) => setTestReportMode(e.target.value as "analysis_only" | "metrics_only" | "both" | "pdf_only" | "analysis_pdf" | "both_pdf")}
                style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13, background: "white" }}
              >
                <option value="both">Métricas + Análise</option>
                <option value="analysis_only">Somente Análise</option>
                <option value="metrics_only">Somente Métricas</option>
                <option value="pdf_only">Somente PDF</option>
                <option value="analysis_pdf">Análise + PDF</option>
                <option value="both_pdf">Análise + Métricas + PDF</option>
              </select>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              disabled={isTesting}
              onClick={() => runDispatchTest(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                borderRadius: 8,
                border: "1px solid #BFDBFE",
                background: "#EFF6FF",
                color: "#1D4ED8",
                fontSize: 13,
                fontWeight: 700,
                padding: "10px 14px",
                cursor: "pointer",
              }}
            >
              {isTesting ? <Loader2 className="animate-spin" size={14} /> : <Play size={14} />}
              Teste Dry Run
            </button>
            <button
              type="button"
              disabled={isTesting}
              onClick={() => runDispatchTest(false)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                borderRadius: 8,
                border: "1px solid #BBF7D0",
                background: "#F0FDF4",
                color: "#15803D",
                fontSize: 13,
                fontWeight: 700,
                padding: "10px 14px",
                cursor: "pointer",
              }}
            >
              {isTesting ? <Loader2 className="animate-spin" size={14} /> : <Play size={14} />}
              Teste Real no n8n
            </button>
          </div>

          {testResponse && (
            <div style={{ marginTop: 14 }}>
              {testPdfUrl ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <CopyBlock title="URL do PDF" value={testPdfUrl} rows={3} />
                  <div>
                    <a
                      href={testPdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        borderRadius: 8,
                        border: "1px solid #BFDBFE",
                        background: "#EFF6FF",
                        color: "#1D4ED8",
                        fontSize: 13,
                        fontWeight: 700,
                        padding: "10px 14px",
                        textDecoration: "none",
                      }}
                    >
                      Abrir PDF
                    </a>
                  </div>
                </div>
              ) : null}
              {testPdfUrl ? <div style={{ height: 12 }} /> : null}
              <CopyBlock title="Resultado do teste" value={testResponse} rows={16} />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
