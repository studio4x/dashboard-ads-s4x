"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, CheckCircle2, Info, Loader2, Play } from "lucide-react";

const APP_BASE_URL = "https://dashboard-ads-s4x.vercel.app";
const DISPATCH_ENDPOINT = `${APP_BASE_URL}/api/admin/automations/report-dispatch`;

function CopyBlock({
  title,
  value,
  rows = 3,
}: {
  title: string;
  value: string;
  rows?: number;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      alert("Não foi possível copiar automaticamente.");
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
  const [dashboards, setDashboards] = useState<any[]>([]);
  const [dashboardId, setDashboardId] = useState("");
  const [testFrom, setTestFrom] = useState("");
  const [testTo, setTestTo] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [testResponse, setTestResponse] = useState("");

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

  const runDispatchTest = async (dryRun: boolean) => {
    if (!dashboardId) {
      alert("Selecione ou informe um dashboardId para testar.");
      return;
    }
    setIsTesting(true);
    setTestResponse("");
    try {
      const payload: Record<string, unknown> = {
        dashboardId,
        dryRun,
      };
      if (testFrom) payload.from = testFrom;
      if (testTo) payload.to = testTo;
      if (!dryRun) payload.channels = ["email", "whatsapp"];

      const res = await fetch("/api/admin/automations/report-dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      setTestResponse(
        JSON.stringify(
          {
            httpStatus: res.status,
            ok: res.ok,
            response: json,
          },
          null,
          2
        )
      );
    } catch (error: any) {
      setTestResponse(
        JSON.stringify(
          {
            ok: false,
            error: error?.message || "Erro ao executar teste",
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
          Authorization: "Bearer <N8N_REPORT_DISPATCH_WEBHOOK_TOKEN> (se configurado)",
          "X-S4X-Signature": "<hmac_sha256_hex> (se N8N_REPORT_DISPATCH_WEBHOOK_SECRET configurado)",
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
    "channels": ["email","whatsapp"],
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
        "Se usar token, valide o header Authorization no n8n.",
        "Se usar assinatura, valide o header X-S4X-Signature (HMAC SHA-256).",
        "Após o Webhook, use IA para gerar o texto com base em report.summary e report.insights.",
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
            Testar Disparo Agora
          </p>
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
                      {d.name} ({d.id})
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
              <CopyBlock title="Resultado do teste" value={testResponse} rows={16} />
            </div>
          )}
        </div>

        <div className="card" style={{ padding: 20 }}>
          <CopyBlock title="Endpoint de Disparo (Admin API)" value={DISPATCH_ENDPOINT} rows={2} />
        </div>

        <div className="card" style={{ padding: 20 }}>
          <CopyBlock title="Payload mínimo para disparo" value={samplePayload} rows={14} />
        </div>

        <div className="card" style={{ padding: 20 }}>
          <CopyBlock title="Payload de teste (dryRun)" value={dryRunPayload} rows={7} />
        </div>

        <div className="card" style={{ padding: 20 }}>
          <CopyBlock title="Headers enviados da plataforma para o webhook n8n" value={webhookHeaders} rows={10} />
        </div>

        <div className="card" style={{ padding: 20 }}>
          <CopyBlock title="Exemplo cURL de chamada manual" value={curlExample} rows={12} />
        </div>

        <div className="card" style={{ padding: 20 }}>
          <CopyBlock title="Checklist de configuração no n8n" value={n8nChecklist} rows={10} />
        </div>
      </div>
    </div>
  );
}
