import { NextResponse } from "next/server";
import { ClientService } from "@/services/client-service";
import { requireAdmin } from "@/lib/auth/guards";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/security/request-guards";

// POST /api/admin/clients/[clientId]/logo
export async function POST(
  request: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;
    const csrfError = enforceSameOrigin(request);
    if (csrfError) return csrfError;
    const rateLimitError = enforceRateLimit(request, { key: "admin:clients:logo-upload", limit: 15, windowMs: 60_000 });
    if (rateLimitError) return rateLimitError;

    const { clientId } = await params;

    const formData = await request.formData();
    const file = formData.get("logo") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 400 });
    }

    // Valida tipo
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Formato inválido. Use PNG, JPG ou WEBP." }, { status: 400 });
    }

    // Valida tamanho (máx 2 MB)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "Arquivo muito grande. Máximo 2 MB." }, { status: 400 });
    }

    const ext = file.type.split("/")[1].replace("svg+xml", "svg");
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const logoUrl = await ClientService.uploadLogo(clientId, buffer, file.type, ext);

    // Atualiza o campo logo_url no registro do cliente
    await ClientService.updateClient(clientId, { logo_url: logoUrl });

    return NextResponse.json({ success: true, logo_url: logoUrl });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
