import { createClient } from '@/lib/supabase/server'

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
    const supabase = await createClient()
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
  }
}
