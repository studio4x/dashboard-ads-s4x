import { NextResponse } from "next/server";
import { ImportLogsService } from "@/lib/imports/import-logs";
import { requireAdmin } from "@/lib/auth/guards";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/security/request-guards";

export async function GET() {
  try {
    // 1. Proteção de Role
    const authError = await requireAdmin();
    if (authError) return authError;

    const retentionDaysRaw = Number(process.env.IMPORT_LOG_RETENTION_DAYS || "90");
    const retentionDays = Number.isFinite(retentionDaysRaw) ? Math.max(1, Math.floor(retentionDaysRaw)) : 90;
    await ImportLogsService.clearOldLogs(retentionDays);

    const logs = await ImportLogsService.getLogs();
    return NextResponse.json(logs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;
    const csrfError = enforceSameOrigin(request);
    if (csrfError) return csrfError;
    const rateLimitError = enforceRateLimit(request, { key: "admin:importlogs:delete", limit: 10, windowMs: 60_000 });
    if (rateLimitError) return rateLimitError;

    await ImportLogsService.clearLogs();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
