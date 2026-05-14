import { NextResponse } from "next/server";
import { getDashboardData } from "@/lib/dashboard/dashboard-data-provider";
import { AuthService } from "@/services/auth-service";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ dashboardId: string }> }
) {
  try {
    const { dashboardId } = await params;
    
    // 1. Verifica Autenticação e Perfil
    const profile = await AuthService.getCurrentProfile();
    if (!profile) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // 2. Se for cliente, verifica se o dashboard pertence ao cliente dele
    if (profile.role === 'client') {
      const supabase = await createClient();
      
      // Busca o dashboard e verifica se o usuário tem vínculo com o cliente do dashboard
      const { data: access, error: accessError } = await supabase
        .from('dashboards')
        .select('id, client_id')
        .eq('id', dashboardId)
        .single();

      if (accessError || !access) {
        return NextResponse.json({ error: "Dashboard não encontrado" }, { status: 404 });
      }

      // Verifica se o usuário está na tabela client_users para este client_id
      const { data: membership } = await supabase
        .from('client_users')
        .select('id')
        .eq('client_id', access.client_id)
        .eq('user_id', profile.id)
        .maybeSingle();

      if (!membership) {
        return NextResponse.json({ error: "Acesso negado a este dashboard" }, { status: 403 });
      }
    }

    // 3. Busca os dados (Mocks ou Snapshot)
    const data = await getDashboardData(dashboardId);

    if (!data && process.env.GOOGLE_SHEETS_USE_MOCKS !== "true") {
      return NextResponse.json({ 
        error: "Dados não encontrados. Por favor, execute uma importação na área administrativa.",
        needsImport: true 
      }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Dashboard Data API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
