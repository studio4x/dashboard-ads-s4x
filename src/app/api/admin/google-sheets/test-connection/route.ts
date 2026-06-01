import { NextResponse } from "next/server";
import { getSpreadsheetMetadata } from "@/lib/google-sheets/google-sheets-client";
import { requireAdmin } from "@/lib/auth/guards";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/security/request-guards";
import { apiErrorResponse, parseJsonObject, requireString } from "@/lib/security/api-safety";

export async function POST(request: Request) {
  try {
    // 1. Proteção de Role
    const authError = await requireAdmin();
    if (authError) return authError;
    const csrfError = enforceSameOrigin(request);
    if (csrfError) return csrfError;
    const rateLimitError = enforceRateLimit(request, { key: "admin:gsheets:test", limit: 30, windowMs: 60_000 });
    if (rateLimitError) return rateLimitError;

    const parsed = await parseJsonObject(request);
    if (!parsed.ok) return parsed.response;
    const spreadsheetId = requireString(parsed.body, "spreadsheetId", { min: 10, max: 220 });

    if (!spreadsheetId) {
      return NextResponse.json({ error: "Spreadsheet ID é obrigatório." }, { status: 400 });
    }

    const metadata = await getSpreadsheetMetadata(spreadsheetId);
    
    return NextResponse.json({
      success: true,
      title: metadata.properties?.title,
      tabs: metadata.sheets?.map(s => s.properties?.title) || []
    });
  } catch (error: any) {
    return apiErrorResponse(error, "Erro desconhecido ao conectar.");
  }
}
