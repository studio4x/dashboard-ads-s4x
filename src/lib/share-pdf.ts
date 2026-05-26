import { createAdminClient } from "@/lib/supabase/server";

const PDF_BUCKET = process.env.PDF_STORAGE_BUCKET || "reports";
const PDF_SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7;

type ReportData = {
  summary?: Record<string, unknown>;
  comparativo?: {
    atual?: Record<string, unknown>;
    anterior?: Record<string, unknown>;
    variacaoPercentual?: Record<string, unknown>;
  };
  funil?: Record<string, unknown>;
  totaisNumericos?: Record<string, Record<string, unknown>>;
  mediasNumericas?: Record<string, Record<string, unknown>>;
  topItems?: Record<string, any>;
  aiInterpretation?: {
    generated?: boolean;
    text?: string | null;
  };
};

async function ensurePdfBucket() {
  const supabase = await createAdminClient();
  const { data, error } = await supabase.storage.getBucket(PDF_BUCKET);
  if (!error && data) return supabase;

  const { error: createError } = await supabase.storage.createBucket(PDF_BUCKET, {
    public: false,
    fileSizeLimit: "52428800",
    allowedMimeTypes: ["application/pdf"],
  });

  if (createError && !String(createError.message || "").toLowerCase().includes("already exists")) {
    throw new Error(`Falha ao preparar bucket de PDF: ${createError.message}`);
  }

  return supabase;
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatNumber(value: unknown) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "Nao disponivel";
  return num.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

function formatPercent(value: unknown) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "Nao disponivel";
  return `${num.toFixed(2).replace(".", ",")}%`;
}

function formatCurrency(value: unknown) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "Nao disponivel";
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function valueByMetric(metric: string, value: unknown) {
  const moneyMetrics = new Set(["investimento", "receita", "cpc", "cpm", "cpa", "roas", "valor"]);
  const percentMetrics = new Set(["ctr", "taxaConversao", "frequencia"]);
  if (moneyMetrics.has(metric)) return formatCurrency(value);
  if (percentMetrics.has(metric)) return formatPercent(value);
  return formatNumber(value);
}

function renderKpiCards(summary: Record<string, unknown>) {
  const items = [
    { key: "investimento", label: "Investimento" },
    { key: "impressoes", label: "Impressoes" },
    { key: "cliques", label: "Cliques" },
    { key: "ctr", label: "CTR" },
    { key: "cpc", label: "CPC" },
    { key: "conversoes", label: "Conversoes" },
    { key: "cpa", label: "CPA" },
    { key: "leads", label: "Leads" },
  ];

  return items
    .map(
      (item) => `
        <div class="kpi-card">
          <div class="kpi-label">${escapeHtml(item.label)}</div>
          <div class="kpi-value">${escapeHtml(valueByMetric(item.key, summary?.[item.key]))}</div>
        </div>
      `
    )
    .join("");
}

function hasAnyFiniteValue(record: Record<string, unknown> | undefined, keys?: string[]) {
  if (!record) return false;
  const entries = keys ? keys.map((key) => [key, record[key]] as const) : Object.entries(record);
  return entries.some(([, value]) => Number.isFinite(Number(value)));
}

function renderComparisonTable(report: ReportData) {
  const atual = report.comparativo?.atual || {};
  const anterior = report.comparativo?.anterior || {};
  const variacao = report.comparativo?.variacaoPercentual || {};
  const rows = [
    ["investimento", "Investimento"],
    ["impressoes", "Impressoes"],
    ["cliques", "Cliques"],
    ["ctr", "CTR"],
    ["cpc", "CPC"],
    ["conversoes", "Conversoes"],
    ["cpa", "CPA"],
  ];

  return rows
    .map(
      ([key, label]) => `
        <tr>
          <td>${escapeHtml(label)}</td>
          <td>${escapeHtml(valueByMetric(key, atual[key]))}</td>
          <td>${escapeHtml(valueByMetric(key, anterior[key]))}</td>
          <td>${escapeHtml(formatPercent(variacao[key]))}</td>
        </tr>
      `
    )
    .join("");
}

function renderMetricTable(
  title: string,
  data: Record<string, unknown> | undefined,
  rows: Array<{ key: string; label: string }>
) {
  if (!data || !rows.length) return "";

  const body = rows
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.label)}</td>
          <td>${escapeHtml(valueByMetric(row.key, data[row.key]))}</td>
        </tr>
      `
    )
    .join("");

  return `
    <section class="panel section-block">
      <h3>${escapeHtml(title)}</h3>
      <table>
        <thead>
          <tr>
            <th>Metrica</th>
            <th>Valor</th>
          </tr>
        </thead>
        <tbody>${body}</tbody>
      </table>
    </section>
  `;
}

function renderGroupedMetricTables(
  title: string,
  groups: Record<string, Record<string, unknown>> | undefined,
  rows: Array<{ key: string; label: string }>
) {
  if (!groups) return "";

  const labels: Record<string, string> = {
    dailyPerformance: "Desempenho diario",
    campaigns: "Campanhas",
    adGroups: "Grupos de anuncios",
    keywords: "Palavras-chave",
    searchTerms: "Termos de pesquisa",
    adsAndAssets: "Anuncios e ativos",
  };

  const sections = Object.entries(groups)
    .filter(([, value]) => value && typeof value === "object" && hasAnyFiniteValue(value))
    .map(
      ([groupKey, value]) => `
        <section class="panel nested-panel">
          <h4>${escapeHtml(labels[groupKey] || groupKey)}</h4>
          <table>
            <thead>
              <tr>
                <th>Metrica</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (row) => `
                    <tr>
                      <td>${escapeHtml(row.label)}</td>
                      <td>${escapeHtml(valueByMetric(row.key, value[row.key]))}</td>
                    </tr>
                  `
                )
                .join("")}
            </tbody>
          </table>
        </section>
      `
    )
    .join("");

  if (!sections) return "";

  return `
    <section class="section-block">
      <h2 class="section-title">${escapeHtml(title)}</h2>
      <div class="stack">${sections}</div>
    </section>
  `;
}

function renderTopList(title: string, items: any[] | undefined, field: string) {
  const safeItems = Array.isArray(items) ? items.slice(0, 7) : [];
  const rows = safeItems.length
    ? safeItems
        .map(
          (item) => `
            <tr>
              <td>${escapeHtml(item.nome || item.campaignName || item.keyword || item.searchTerm || "-")}</td>
              <td>${escapeHtml(valueByMetric(field, item.valor))}</td>
            </tr>
          `
        )
        .join("")
    : `<tr><td colspan="2">Sem dados disponiveis</td></tr>`;

  return `
    <section class="panel">
      <h3>${escapeHtml(title)}</h3>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Valor</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </section>
  `;
}

function renderAiBlock(text: string | null | undefined) {
  if (!text) {
    return `
      <section class="analysis-shell">
        <div class="analysis-empty">
          <h3>Analise automatizada</h3>
          <p>A analise da IA nao estava disponivel no momento da geracao deste PDF.</p>
        </div>
      </section>
    `;
  }

  return `
    <section class="analysis-shell">
      <div class="analysis-header">
        <h3>Analise automatizada</h3>
        <p>Resumo comparativo consolidado para envio ao cliente.</p>
      </div>
      <div class="ai-block">${text}</div>
    </section>
  `;
}

function buildPdfHtml(params: {
  dashboardName: string;
  clientName: string | null;
  periodLabel: string;
  report: ReportData;
}) {
  const aiText =
    params.report.aiInterpretation?.generated && params.report.aiInterpretation?.text
      ? params.report.aiInterpretation.text
      : null;

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(params.dashboardName)}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            font-family: Arial, sans-serif;
            background: #eef3fb;
            color: #0f172a;
          }
          html, body {
            width: 100%;
          }
          .page {
            width: 100%;
            min-height: 100vh;
            padding: 18px 20px;
          }
          .hero {
            background: linear-gradient(135deg, #0f172a, #1e40af 58%, #2563eb);
            color: white;
            border-radius: 16px;
            padding: 18px 20px;
            margin-bottom: 14px;
            box-shadow: 0 18px 40px rgba(37, 99, 235, 0.18);
          }
          .hero h1 {
            margin: 0 0 6px;
            font-size: 24px;
          }
          .hero-meta {
            display: flex;
            gap: 18px;
            flex-wrap: wrap;
          }
          .hero p {
            margin: 0;
            font-size: 12px;
            opacity: 0.92;
          }
          .analysis-shell {
            background: white;
            border: 1px solid #d8e3f2;
            border-radius: 16px;
            padding: 16px;
            min-height: calc(100vh - 130px);
            box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);
          }
          .analysis-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            gap: 16px;
            margin-bottom: 12px;
            padding-bottom: 10px;
            border-bottom: 1px solid #e2e8f0;
          }
          .analysis-header h3 {
            margin: 0;
            font-size: 18px;
          }
          .analysis-header p {
            margin: 0;
            color: #64748b;
            font-size: 12px;
          }
          .analysis-empty {
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            color: #475569;
          }
          .analysis-empty h3 {
            margin: 0 0 8px;
            color: #0f172a;
          }
          .ai-block {
            font-size: 12px;
            line-height: 1.42;
            color: #0f172a;
          }
          .ai-block .ai-metrics-summary {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px 12px;
          }
          .ai-block .metric-item {
            border: 1px solid #dbe4f0;
            border-radius: 12px;
            background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
            padding: 12px 13px;
            min-height: 0;
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .ai-block .metric-item h3 {
            margin: 0 0 6px;
            font-size: 14px;
            line-height: 1.2;
          }
          .ai-block .metric-item p {
            margin: 4px 0;
          }
          .ai-block .metric-description {
            color: #475569;
            font-size: 11px;
          }
          .ai-block .metric-value,
          .ai-block .metric-comparison,
          .ai-block .metric-variation {
            font-size: 11.5px;
          }
          .ai-block .metric-value {
            font-weight: 700;
            color: #0f172a;
          }
          .ai-block .metric-variation {
            font-weight: 700;
            color: #1d4ed8;
          }
          @page {
            size: A4 landscape;
            margin: 8mm;
          }
        </style>
      </head>
      <body>
        <div class="page">
          <section class="hero">
            <h1>${escapeHtml(params.dashboardName)}</h1>
            <div class="hero-meta">
              <p>Cliente: ${escapeHtml(params.clientName || "Cliente")}</p>
              <p>Periodo: ${escapeHtml(params.periodLabel)}</p>
            </div>
          </section>

          ${renderAiBlock(aiText)}
        </div>
      </body>
    </html>
  `;
}

export async function createSharePdfSignedUrl(path: string, expiresInSeconds = PDF_SIGNED_URL_TTL_SECONDS) {
  const supabase = await ensurePdfBucket();
  const { data, error } = await supabase.storage
    .from(PDF_BUCKET)
    .createSignedUrl(path, expiresInSeconds, {
      download: false,
    });

  if (error || !data?.signedUrl) {
    throw new Error(`Falha ao criar URL assinada do PDF: ${error?.message || "sem signedUrl"}`);
  }

  return data.signedUrl;
}

export function sanitizePdfFilePart(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

export function normalizePdfPeriodPart(value: string | null | undefined) {
  if (!value) return null;
  const onlyDate = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(onlyDate) ? onlyDate : null;
}

export function buildPdfPeriodPart(from: string | null, to: string | null) {
  return from && to ? `${from}_a_${to}` : from || to || "periodo_nao_disponivel";
}

export function buildSharePdfFilename(params: {
  dashboardName: string;
  clientName: string | null;
  periodPart: string;
}) {
  const dashboardPart = sanitizePdfFilePart(params.dashboardName) || "dashboard";
  const clientPart = sanitizePdfFilePart(params.clientName || "cliente");
  return `${dashboardPart}__${clientPart}__${params.periodPart}.pdf`;
}

export function buildSharePdfStoragePath(params: {
  shareToken: string;
  periodPart: string;
  filename: string;
}) {
  return `dashboard-pdfs/${params.shareToken}/${params.periodPart}/${params.filename}`;
}

export async function getCachedSharePdf(path: string) {
  const supabase = await ensurePdfBucket();
  const { data, error } = await supabase.storage.from(PDF_BUCKET).download(path);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

export async function storeSharePdf(path: string, pdf: Buffer) {
  const supabase = await ensurePdfBucket();
  const { error } = await supabase.storage.from(PDF_BUCKET).upload(path, pdf, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (error) {
    throw new Error(`Falha ao salvar PDF no storage: ${error.message}`);
  }
}

export async function renderAndStoreSharePdf(params: {
  dashboardName: string;
  clientName: string | null;
  periodLabel: string;
  report: ReportData;
  storagePath: string;
}) {
  let browser: any = null;
  try {
    const chromium = (await import("@sparticuz/chromium")).default;
    const puppeteerCore = await import("puppeteer-core");
    const puppeteer = (puppeteerCore as any).default || puppeteerCore;

    const executablePath =
      process.env.CHROME_EXECUTABLE_PATH || (await chromium.executablePath());

    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath,
      headless: true,
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1024, deviceScaleFactor: 2 });
    await page.setContent(
      buildPdfHtml({
        dashboardName: params.dashboardName,
        clientName: params.clientName,
        periodLabel: params.periodLabel,
        report: params.report,
      }),
      { waitUntil: "load" }
    );
    await new Promise((resolve) => setTimeout(resolve, 500));

    const pdf = Buffer.from(
      await page.pdf({
        format: "A4",
        landscape: true,
        printBackground: true,
        margin: { top: "10mm", right: "8mm", bottom: "10mm", left: "8mm" },
        preferCSSPageSize: true,
      })
    );

    await storeSharePdf(params.storagePath, pdf);
    return pdf;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
