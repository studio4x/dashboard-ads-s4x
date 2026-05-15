import { NextResponse } from "next/server";
import { ImportLogsService } from "@/lib/imports/import-logs";
import { requireAdmin } from "@/lib/auth/guards";

export async function GET() {
  try {
    // 1. Proteção de Role
    const authError = await requireAdmin();
    if (authError) return authError;

    const logs = await ImportLogsService.getLogs();
    return NextResponse.json(logs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    await ImportLogsService.clearLogs();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
