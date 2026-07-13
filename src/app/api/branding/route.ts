import { NextResponse } from "next/server";
import { BrandingService } from "@/services/branding-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const branding = await BrandingService.getBranding();
  return NextResponse.json(
    { success: true, branding },
    { headers: { "Cache-Control": "no-store" } }
  );
}
