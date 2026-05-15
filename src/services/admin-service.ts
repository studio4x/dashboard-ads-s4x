import { createClient } from '@/lib/supabase/server'

export const AdminService = {
  /**
   * Obtém as estatísticas gerais do painel admin.
   */
  async getDashboardStats() {
    const { createAdminClient } = await import('@/lib/supabase/server')
    const supabase = await createAdminClient()

    // Counts
    const { count: clientsCount } = await supabase.from('clients').select('*', { count: 'exact', head: true })
    const { count: activeDashboards } = await supabase.from('dashboards').select('*', { count: 'exact', head: true }).eq('status', 'active')
    const { count: dataSources } = await supabase.from('data_sources').select('*', { count: 'exact', head: true }).eq('type', 'google_sheets')
    
    // Import logs (últimos 30 dias)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const { count: recentImports } = await supabase
      .from('import_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString())

    // Erros recentes (últimos 7 dias)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const { count: recentErrors } = await supabase
      .from('import_logs')
      .select('*', { count: 'exact', head: true })
      .in('status', ['error', 'success_with_warnings'])
      .gte('created_at', sevenDaysAgo.toISOString())

    // Clientes recentes
    const { data: recentClients } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    // Dashboards recentes
    const { data: recentDashboardsList } = await supabase
      .from('dashboards')
      .select('*, clients(name)')
      .order('created_at', { ascending: false })
      .limit(5)

    // Alertas operacionais
    // Fontes sem importação
    const { data: sourcesWithoutImports } = await supabase
      .from('data_sources')
      .select('id, name')
      .is('last_import_status', null)
      .limit(5)

    return {
      clientsCount: clientsCount || 0,
      activeDashboards: activeDashboards || 0,
      dataSources: dataSources || 0,
      recentImports: recentImports || 0,
      recentErrors: recentErrors || 0,
      recentClients: recentClients || [],
      recentDashboards: recentDashboardsList || [],
      sourcesWithoutImports: sourcesWithoutImports || []
    }
  },

  /**
   * Obtém detalhes completos de um cliente para o Hub Operacional
   */
  async getClientHubDetails(clientId: string) {
    const { createAdminClient } = await import('@/lib/supabase/server')
    const supabase = await createAdminClient()

    // 1. Cliente
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single()

    if (clientError || !client) return null

    // 2. Dashboards
    const { data: dashboards } = await supabase
      .from('dashboards')
      .select('*')
      .eq('client_id', clientId)

    // 3. Fontes de Dados
    const { data: dataSources } = await supabase
      .from('data_sources')
      .select('*')
      .eq('client_id', clientId)

    // 4. Usuários Vinculados (Client Users)
    const { data: userRoles } = await supabase
      .from('client_users')
      .select('id, user_id, role, created_at')
      .eq('client_id', clientId)

    return {
      client,
      dashboards: dashboards || [],
      dataSources: dataSources || [],
      userRoles: userRoles || []
    }
  }
}
