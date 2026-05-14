import { NextResponse } from "next/server";
import { ShareService } from "@/services/share-service";
import { requireAdmin } from "@/lib/auth/guards";

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
    const safeLinks = links.map((link: any) => {
      const { token_hash, ...safeLink } = link;
      return safeLink;
    });

    return NextResponse.json({ links: safeLinks });
  } catch (error: any) {
    console.error("Error listing share links:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
