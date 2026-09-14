import { createAdminClient } from "@/lib/supabase/server";

const PDF_BUCKET = process.env.PDF_STORAGE_BUCKET || "reports";
const PDF_SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7;

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

export async function createSharePdfSignedUrl(path: string, expiresInSeconds = PDF_SIGNED_URL_TTL_SECONDS) {
  const supabase = await ensurePdfBucket();
  const { data, error } = await supabase.storage
    .from(PDF_BUCKET)
    .createSignedUrl(path, expiresInSeconds, { download: false });

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

export async function getLatestSharePdf(shareToken: string) {
  const supabase = await ensurePdfBucket();
  const storage = supabase.storage.from(PDF_BUCKET);
  const prefix = `dashboard-pdfs/${shareToken}`;
  const { data: entries, error: entriesError } = await storage.list(prefix, {
    limit: 1000,
    sortBy: { column: "updated_at", order: "desc" },
  });

  if (entriesError) {
    throw new Error(`Falha ao listar PDFs salvos: ${entriesError.message}`);
  }

  const candidates: Array<{ path: string; filename: string; updatedAt: string | null }> = [];

  for (const entry of entries || []) {
    const entryPrefix = `${prefix}/${entry.name}`;
    if (entry.id !== null) {
      if (entry.name.toLowerCase().endsWith(".pdf")) {
        candidates.push({
          path: entryPrefix,
          filename: entry.name,
          updatedAt: entry.updated_at || entry.created_at || null,
        });
      }
      continue;
    }

    const { data: files, error: filesError } = await storage.list(entryPrefix, {
      limit: 1000,
      sortBy: { column: "updated_at", order: "desc" },
    });

    if (filesError) {
      throw new Error(`Falha ao listar PDFs salvos: ${filesError.message}`);
    }

    for (const file of files || []) {
      if (file.id !== null && file.name.toLowerCase().endsWith(".pdf")) {
        candidates.push({
          path: `${entryPrefix}/${file.name}`,
          filename: file.name,
          updatedAt: file.updated_at || file.created_at || null,
        });
      }
    }
  }

  candidates.sort((a, b) => {
    const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return bTime - aTime;
  });

  const latest = candidates[0];
  if (!latest) return null;

  const pdf = await getCachedSharePdf(latest.path);
  return pdf ? { pdf, filename: latest.filename } : null;
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
