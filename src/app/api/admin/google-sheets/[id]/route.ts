import { NextResponse } from "next/server";
import { DataSourceService } from "@/services/data-source-service";
import { requireAdmin } from "@/lib/auth/guards";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const { id } = params;
    const { name, spreadsheetId } = await request.json();

    if (!name || !spreadsheetId) {
      return NextResponse.json({ error: "Nome e ID da planilha são obrigatórios." }, { status: 400 });
    }

    await DataSourceService.updateGoogleSheetSource(id, { name, spreadsheetId });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const { id } = params;
    await DataSourceService.deleteSource(id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
