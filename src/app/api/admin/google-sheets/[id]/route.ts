import { NextResponse } from "next/server";
import { DataSourceService } from "@/services/data-source-service";
import { requireAdmin } from "@/lib/auth/guards";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/security/request-guards";

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
    const { name, spreadsheetId, syncInterval, sourceRole } = await request.json();

    if (!name || !spreadsheetId) {
      return NextResponse.json({ error: "Nome e ID da planilha são obrigatórios." }, { status: 400 });
    }

    await DataSourceService.updateGoogleSheetSource(id, { 
      name, 
      spreadsheetId, 
      syncInterval,
      sourceRole,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
