import { NextResponse } from "next/server";
import { ShareService } from "@/services/share-service";
import { requireAdmin } from "@/lib/auth/guards";
import { apiErrorResponse } from "@/lib/security/api-safety";

export async function GET(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const dashboardId = searchParams.get("dashboardId");

    if (!dashboardId) {
      return NextResponse.json({ error: "dashboardId is required" }, { status: 400 });
    }

    const links = await ShareService.listShareLinks(dashboardId);

    // Filter out the token_hash to ensure it never leaks to the client
    const origin = new URL(request.url).origin;
    const safeLinks = links.map((link: any) => {
      const { token_hash, ...safeLink } = link;
      return {
        ...safeLink,
        share_url: `${origin}/share/${link.id}`
      };
    });

    return NextResponse.json({ links: safeLinks });
  } catch (error: any) {
    console.error("Error listing share links:", error);
    return apiErrorResponse(error);
  }
}
