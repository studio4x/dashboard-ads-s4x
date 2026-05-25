import { NextResponse } from "next/server";
import { ClientService } from "@/services/client-service";
import { requireAdmin } from "@/lib/auth/guards";

// DELETE /api/admin/clients/[clientId]
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const { clientId } = await params;
    await ClientService.deleteClient(clientId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/admin/clients/[clientId]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const { clientId } = await params;
    const body = await request.json();
    const updates = {
      name: body?.name,
      company_name: body?.company_name,
      website_url: body?.website_url,
      primary_color: body?.primary_color,
      status: body?.status,
      email: body?.email,
      emails: body?.emails,
      phone: body?.phone,
      phones: body?.phones,
      whatsapp: body?.whatsapp,
    };

    const cleaned = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined)
    );

    const client = await ClientService.updateClient(clientId, cleaned);
    return NextResponse.json({ success: true, client });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/admin/clients/[clientId]/logo  → tratado em logo/route.ts
