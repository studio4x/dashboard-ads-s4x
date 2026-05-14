import { createClient } from "@/lib/supabase/server";
import { AuthService } from "@/services/auth-service";
import { NextResponse } from "next/server";

/**
 * Verifica se o usuário está autenticado e retorna seu perfil.
 */
export async function getSessionProfile() {
  return await AuthService.getCurrentProfile();
}

/**
 * Guard para APIs administrativas.
 * Retorna null se autorizado, ou NextResponse se houver erro.
 */
export async function requireAdmin() {
  const profile = await getSessionProfile();

  if (!profile) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  if (profile.role !== "admin" && profile.role !== "owner") {
    return NextResponse.json({ error: "Acesso negado: Requer privilégios administrativos" }, { status: 403 });
  }

  return null;
}

/**
 * Verifica se o usuário tem acesso a um dashboard específico.
 */
export async function requireDashboardAccess(dashboardId: string) {
  const profile = await getSessionProfile();

  if (!profile) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  // Admins e Owners têm acesso total
  if (profile.role === "admin" || profile.role === "owner") {
    return null;
  }

  // Clientes precisam estar vinculados ao dashboard via client_users
  const supabase = await createClient();
  
  // 1. Busca o cliente dono do dashboard
  const { data: dashboard, error: dError } = await supabase
    .from("dashboards")
    .select("client_id")
    .eq("id", dashboardId)
    .single();

  if (dError || !dashboard) {
    return NextResponse.json({ error: "Dashboard não encontrado" }, { status: 404 });
  }

  // 2. Verifica se o usuário pertence a este cliente
  const { data: membership, error: mError } = await supabase
    .from("client_users")
    .select("id")
    .eq("client_id", dashboard.client_id)
    .eq("user_id", profile.id)
    .maybeSingle();

  if (mError || !membership) {
    return NextResponse.json({ error: "Acesso negado a este dashboard" }, { status: 403 });
  }

  return null;
}
