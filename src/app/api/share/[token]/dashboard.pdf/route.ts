import { GET as baseGet } from "../pdf/route";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface RouteParams {
  params: Promise<{ token: string }>;
}

export async function GET(request: Request, context: RouteParams) {
  return baseGet(request, context);
}
