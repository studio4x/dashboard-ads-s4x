import { NextResponse } from "next/server";
import { BrandingService } from "@/services/branding-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const branding = await BrandingService.getBranding();
  return NextResponse.redirect(new URL(branding.faviconUrl, request.url));
}
