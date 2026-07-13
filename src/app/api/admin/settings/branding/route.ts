import { NextResponse } from "next/server";
import { BrandingService, type BrandingAsset } from "@/services/branding-service";
import { requireAdmin } from "@/lib/auth/guards";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/security/request-guards";
import { apiErrorResponse } from "@/lib/security/api-safety";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ASSET_RULES: Record<BrandingAsset, { field: string; label: string; types: string[] }> = {
  logoDark: { field: "logoDark", label: "logotipo dark", types: ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"] },
  logoLight: { field: "logoLight", label: "logotipo light", types: ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"] },
  favicon: { field: "favicon", label: "favicon", types: ["image/png", "image/svg+xml", "image/x-icon"] },
};

function validateFile(asset: BrandingAsset, value: FormDataEntryValue | null) {
  if (!value || typeof value === "string") return null;
  const rule = ASSET_RULES[asset];
  if (!rule.types.includes(value.type)) throw new Error(`Formato invalido para ${rule.label}.`);
  if (value.size <= 0 || value.size > MAX_FILE_SIZE) throw new Error(`O ${rule.label} deve ter no maximo 2 MB.`);
  return value;
}

export async function GET() {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;
    return NextResponse.json({ success: true, branding: await BrandingService.getBranding() });
  } catch (error: any) {
    return apiErrorResponse(error, "Erro ao carregar a identidade visual.");
  }
}

export async function POST(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;
    const csrfError = enforceSameOrigin(request);
    if (csrfError) return csrfError;
    const rateLimitError = enforceRateLimit(request, { key: "admin:settings:branding-upload", limit: 12, windowMs: 60_000 });
    if (rateLimitError) return rateLimitError;

    const formData = await request.formData();
    const files = (Object.keys(ASSET_RULES) as BrandingAsset[])
      .map((asset) => ({ asset, file: validateFile(asset, formData.get(ASSET_RULES[asset].field)) }))
      .filter((item): item is { asset: BrandingAsset; file: File } => Boolean(item.file));

    if (files.length === 0) {
      return NextResponse.json({ success: false, error: "Selecione ao menos um arquivo para enviar." }, { status: 400 });
    }

    let branding = await BrandingService.getBranding();
    for (const item of files) {
      branding = await BrandingService.uploadAsset(item.asset, Buffer.from(await item.file.arrayBuffer()), item.file.type);
    }
    return NextResponse.json({ success: true, branding });
  } catch (error: any) {
    if (error instanceof Error && (error.message.startsWith("Formato invalido") || error.message.startsWith("O "))) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    return apiErrorResponse(error, "Erro ao salvar a identidade visual.");
  }
}
