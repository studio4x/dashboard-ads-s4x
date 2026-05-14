import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/guards";

export async function GET() {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const supabase = await createClient();
    
    const { data: dashboards, error } = await supabase
      .from('dashboards')
      .select('*, clients(name, primary_color)')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(dashboards);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
