import { NextResponse } from "next/server";
import { ImportLogsService } from "@/lib/imports/import-logs";

export async function GET() {
  try {
    const logs = ImportLogsService.getLogs();
    return NextResponse.json(logs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
