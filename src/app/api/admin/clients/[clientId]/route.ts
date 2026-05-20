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

// POST /api/admin/clients/[clientId]/logo  → tratado em logo/route.ts
