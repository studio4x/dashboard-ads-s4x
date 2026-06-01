import { NextResponse } from "next/server";
import { DataSourceService } from "@/services/data-source-service";
import { requireAdmin } from "@/lib/auth/guards";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/security/request-guards";
import { apiErrorResponse, parseJsonObject, requireString } from "@/lib/security/api-safety";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;
    const csrfError = enforceSameOrigin(request);
    if (csrfError) return csrfError;
    const rateLimitError = enforceRateLimit(request, { key: "admin:gsheets:update", limit: 40, windowMs: 60_000 });
    if (rateLimitError) return rateLimitError;

    const { id } = await params;
    const parsed = await parseJsonObject(request);
    if (!parsed.ok) return parsed.response;
    const safeName = requireString(parsed.body, "name", { min: 3, max: 180 });
    const safeSpreadsheetId = requireString(parsed.body, "spreadsheetId", { min: 10, max: 220 });
    const syncInterval = typeof parsed.body.syncInterval === "string" ? parsed.body.syncInterval : undefined;
    const sourceRoleRaw = typeof parsed.body.sourceRole === "string" ? parsed.body.sourceRole : undefined;
    const sourceRole = sourceRoleRaw === "google_ads" || sourceRoleRaw === "meta_ads" ? sourceRoleRaw : undefined;

    if (!safeName || !safeSpreadsheetId) {
      return NextResponse.json({ error: "Nome e ID da planilha são obrigatórios." }, { status: 400 });
    }

    await DataSourceService.updateGoogleSheetSource(id, { 
      name: safeName, 
      spreadsheetId: safeSpreadsheetId, 
      syncInterval,
      sourceRole,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;
    const csrfError = enforceSameOrigin(request);
    if (csrfError) return csrfError;
    const rateLimitError = enforceRateLimit(request, { key: "admin:gsheets:delete", limit: 20, windowMs: 60_000 });
    if (rateLimitError) return rateLimitError;

    const { id } = await params;
    await DataSourceService.deleteSource(id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return apiErrorResponse(error);
  }
}
