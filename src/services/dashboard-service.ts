import { createClient, createAdminClient } from '@/lib/supabase/server'

export const DashboardService = {
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
    const supabase = await createClient()
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
  }
}
