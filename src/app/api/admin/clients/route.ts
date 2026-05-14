import { NextResponse } from "next/server";
import { ClientService } from "@/services/client-service";
import { requireAdmin } from "@/lib/auth/guards";

export async function GET() {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const clients = await ClientService.getAllClients();
    return NextResponse.json(clients);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const body = await request.json();
    const { name, company_name, website_url, primary_color } = body;

    if (!name) {
      return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
    }

    const client = await ClientService.createClient({
      name,
      company_name,
      website_url,
      primary_color,
      status: 'active'
    });

    return NextResponse.json({ success: true, client });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
