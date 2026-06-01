import { NextResponse } from "next/server";
import { ShareService } from "@/services/share-service";
import { requireAdmin } from "@/lib/auth/guards";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/security/request-guards";

export async function POST(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;
    const csrfError = enforceSameOrigin(request);
    if (csrfError) return csrfError;
    const rateLimitError = enforceRateLimit(request, { key: "admin:sharelinks:revoke", limit: 20, windowMs: 60_000 });
    if (rateLimitError) return rateLimitError;

    const body = await request.json();
    const { linkId } = body;

    if (!linkId) {
      return NextResponse.json({ error: "linkId is required" }, { status: 400 });
    }

    const updatedLink = await ShareService.revokeShareLink(linkId);

    return NextResponse.json({ success: true, status: updatedLink.status });
  } catch (error: any) {
    console.error("Error revoking share link:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
