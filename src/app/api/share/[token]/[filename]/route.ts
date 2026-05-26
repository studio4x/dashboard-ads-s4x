import { GET as baseGet } from "../pdf/route";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ token: string; filename: string }>;
}

export async function GET(
  request: Request,
  context: RouteParams
) {
  const { token, filename } = await context.params;
  if (!String(filename || "").toLowerCase().endsWith(".pdf")) {
    return Response.json({ success: false, error: "Arquivo inválido." }, { status: 400 });
  }
  return baseGet(request, { params: Promise.resolve({ token }) });
}

