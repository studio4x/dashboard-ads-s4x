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
  if (!text) return "";
  return `
    <section class="panel">
      <h3>Analise automatizada</h3>
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
  const summary = params.report.summary || {};
  const topItems = params.report.topItems || {};
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
            background: #f5f7fb;
            color: #0f172a;
          }
          .page {
            width: 100%;
            padding: 24px;
          }
          .hero {
            background: linear-gradient(135deg, #0f172a, #1d4ed8);
            color: white;
            border-radius: 18px;
            padding: 24px;
            margin-bottom: 20px;
          }
          .hero h1 {
            margin: 0 0 8px;
            font-size: 26px;
          }
          .hero p {
            margin: 0;
            font-size: 13px;
            opacity: 0.92;
          }
          .section-title {
            font-size: 18px;
            margin: 0 0 12px;
          }
          .kpi-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 12px;
            margin-bottom: 20px;
          }
          .kpi-card, .panel {
            background: white;
            border: 1px solid #dbe4f0;
            border-radius: 14px;
            padding: 16px;
          }
          .kpi-label {
            font-size: 12px;
            color: #64748b;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
          }
          .kpi-value {
            font-size: 22px;
            font-weight: 700;
          }
          .layout {
            display: grid;
            grid-template-columns: 1.4fr 1fr;
            gap: 16px;
            margin-bottom: 16px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
          }
          th, td {
            text-align: left;
            padding: 10px 8px;
            border-bottom: 1px solid #e2e8f0;
            vertical-align: top;
          }
          th {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            color: #475569;
          }
          .stack {
            display: grid;
            gap: 16px;
          }
          .ai-block {
            font-size: 13px;
            line-height: 1.6;
          }
          .ai-block section,
          .ai-block div {
            margin-bottom: 10px;
          }
          .ai-block * {
            max-width: 100%;
          }
          @page {
            size: A4 landscape;
            margin: 10mm 8mm;
          }
        </style>
      </head>
      <body>
        <div class="page">
          <section class="hero">
            <h1>${escapeHtml(params.dashboardName)}</h1>
            <p>Cliente: ${escapeHtml(params.clientName || "Cliente")}</p>
            <p>Periodo: ${escapeHtml(params.periodLabel)}</p>
          </section>

          <h2 class="section-title">Resumo executivo</h2>
          <section class="kpi-grid">
            ${renderKpiCards(summary)}
          </section>

          <section class="layout">
            <section class="panel">
              <h3>Comparativo do periodo</h3>
              <table>
                <thead>
                  <tr>
                    <th>Metrica</th>
                    <th>Atual</th>
                    <th>Anterior</th>
                    <th>Variacao</th>
                  </tr>
                </thead>
                <tbody>
                  ${renderComparisonTable(params.report)}
                </tbody>
              </table>
            </section>

            <section class="stack">
              ${renderTopList("Top campanhas por investimento", topItems?.campanhas?.porInvestimento, "investimento")}
              ${renderTopList("Top palavras-chave por investimento", topItems?.palavrasChave?.porInvestimento, "investimento")}
            </section>
          </section>

          <section class="layout">
            <section class="stack">
              ${renderTopList("Top termos de pesquisa", topItems?.termosPesquisa?.porInvestimento, "investimento")}
              ${renderTopList("Top anuncios por cliques", topItems?.anuncios?.porCliques, "cliques")}
            </section>
            ${renderAiBlock(aiText)}
          </section>
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
