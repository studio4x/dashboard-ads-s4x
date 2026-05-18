import { createClient, createAdminClient } from '@/lib/supabase/server'

export const DashboardService = {
  /**
   * Lista todos os dashboards (Admin)
   */
  async getAllDashboards() {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('dashboards')
      .select(`
        *,
        clients(name, primary_color),
        dashboard_pages(count),
        dashboard_data_snapshots(created_at, source_type)
      `)
      .order('name')
    
    if (error) throw error
    
    // Processamos os relacionamentos para retornar dados úteis e não arrays enormes
    return data.map((d: any) => ({
      ...d,
      pages_count: d.dashboard_pages?.[0]?.count || 0,
      latest_snapshot_date: d.dashboard_data_snapshots?.length > 0 
        ? d.dashboard_data_snapshots.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at 
        : null
    }))
  },

  /**
   * Lista dashboards de um cliente.
   */
  async getDashboardsByClient(clientId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('dashboards')
      .select('*')
      .eq('client_id', clientId)
      .order('name')
    
    if (error) throw error
    return data
  },

  /**
   * Obtém dashboard por ID (incluindo abas).
   */
  async getDashboardById(id: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('dashboards')
      .select('*, dashboard_pages(*), clients(name)')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  },

  /**
   * Cria um novo dashboard.
   */
  async createDashboard(dashboardData: any) {
    const supabase = await createAdminClient()
    const { data, error } = await supabase
      .from('dashboards')
      .insert([dashboardData])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  /**
   * Cria um snapshot de dados para um dashboard.
   */
  async saveSnapshot(snapshot: any) {
    const supabase = await createAdminClient()
    const { data, error } = await supabase
      .from('dashboard_data_snapshots')
      .insert([snapshot])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  /**
   * Obtém o snapshot mais recente de um dashboard.
   */
  async getLatestSnapshot(dashboardId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('dashboard_data_snapshots')
      .select('*')
      .eq('dashboard_id', dashboardId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    if (error) throw error
    return data
  },

  /**
   * Lista dashboards acessíveis para o usuário atual.
   */
  async getDashboardsForUser() {
    const supabase = await createClient()
    
    // 1. Busca os IDs dos clientes aos quais o usuário pertence
    const { data: userClients, error: clientError } = await supabase
      .from('client_users')
      .select('client_id')
    
    if (clientError) throw clientError
    if (!userClients || userClients.length === 0) return []

    const clientIds = userClients.map(uc => uc.client_id)

    // 2. Busca os dashboards desses clientes
    const { data, error } = await supabase
      .from('dashboards')
      .select('*, clients(name, primary_color)')
      .in('client_id', clientIds)
      .eq('status', 'active')
      .order('name')
    
    if (error) throw error
    return data
  },

  /**
   * Exclui um dashboard (Admin) e seus registros relacionados.
   */
  async deleteDashboard(id: string) {
    const supabase = await createAdminClient()
    
    // 1. Deletar share_links
    await supabase.from('share_links').delete().eq('dashboard_id', id)
    
    // 2. Deletar dashboard_data_snapshots
    await supabase.from('dashboard_data_snapshots').delete().eq('dashboard_id', id)
    
    // 3. Deletar google_sheet_sources (dependem de data_sources)
    const { data: sources } = await supabase.from('data_sources').select('id').eq('dashboard_id', id)
    if (sources && sources.length > 0) {
      const sourceIds = sources.map(s => s.id)
      await supabase.from('google_sheet_sources').delete().in('source_id', sourceIds)
      await supabase.from('data_sources').delete().in('id', sourceIds)
    }
    
    // 4. Deletar dashboard_pages
    await supabase.from('dashboard_pages').delete().eq('dashboard_id', id)
    
    // 5. Deletar o dashboard
    const { data, error } = await supabase
      .from('dashboards')
      .delete()
      .eq('id', id)
      .select()
      .single()
      
    if (error) throw error
    return data
  }
}
