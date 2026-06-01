import { NextResponse } from "next/server";
import { ClientService } from "@/services/client-service";
import { requireAdmin } from "@/lib/auth/guards";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/security/request-guards";
import { apiErrorResponse, parseJsonObject, requireString } from "@/lib/security/api-safety";

export async function GET() {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const clients = await ClientService.getAllClients();
    return NextResponse.json(clients);
  } catch (error: any) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;
    const csrfError = enforceSameOrigin(request);
    if (csrfError) return csrfError;
    const rateLimitError = enforceRateLimit(request, { key: "admin:clients:create", limit: 30, windowMs: 60_000 });
    if (rateLimitError) return rateLimitError;

    const parsed = await parseJsonObject(request);
    if (!parsed.ok) return parsed.response;
    const body = parsed.body;
    const {
      name,
      company_name,
      website_url,
      primary_color,
      email,
      emails,
      phone,
      phones,
      whatsapp,
    } = body;

    if (!requireString(body, "name", { min: 2, max: 120 })) {
      return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
    }

    const client = await ClientService.createClient({
      name,
      company_name,
      website_url,
      primary_color,
      email,
      emails,
      phone,
      phones,
      whatsapp,
      status: 'active'
    });

    return NextResponse.json({ success: true, client });
  } catch (error: any) {
    return apiErrorResponse(error);
  }
}
