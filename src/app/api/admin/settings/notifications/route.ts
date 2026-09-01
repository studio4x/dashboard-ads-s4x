import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/security/request-guards";
import { apiErrorResponse, parseJsonObject } from "@/lib/security/api-safety";
import { AdminNotificationService } from "@/services/admin-notification-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;
    const rateLimitError = enforceRateLimit(request, { key: "admin:notification-settings:read", limit: 60, windowMs: 60_000 });
    if (rateLimitError) return rateLimitError;
    const settings = await AdminNotificationService.getSettings();
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;
    const csrfError = enforceSameOrigin(request);
    if (csrfError) return csrfError;
    const rateLimitError = enforceRateLimit(request, { key: "admin:notification-settings:update", limit: 20, windowMs: 60_000 });
    if (rateLimitError) return rateLimitError;
    const parsed = await parseJsonObject(request);
    if (!parsed.ok) return parsed.response;
    const body = parsed.body || {};
    const settings = await AdminNotificationService.saveSettings({
      emails: body.emails,
      phones: body.phones,
      fromEmail: body.fromEmail,
    });
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
