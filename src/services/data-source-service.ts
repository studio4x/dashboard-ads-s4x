import { createClient, createAdminClient } from '@/lib/supabase/server'

export const DataSourceService = {
  /**
   * Obtém a configuração de Google Sheets de um dashboard.
   */
  async getGoogleSheetsConfig(dashboardId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('data_sources')
      .select('*, google_sheet_sources(*)')
      .eq('dashboard_id', dashboardId)
      .eq('type', 'google_sheets')
      .single()
    
    if (error) return null
    return data
  },

  /**
   * Lista todas as fontes de dados (para o Admin).
   */
  async getAllSources() {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('data_sources')
      .select('*, google_sheet_sources(*), clients(name), dashboards(name, dashboard_type)')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  /**
   * Cria uma nova fonte de dados Google Sheets.
   */
  async createGoogleSheetSource(config: {
    clientId: string,
    dashboardId: string,
    name: string,
    spreadsheetId: string,
    syncInterval?: string
  }) {
    const supabase = await createClient()

    // 1. Cria a entrada na data_sources
    const { data: source, error: sourceError } = await supabase
      .from('data_sources')
      .insert([{
        client_id: config.clientId,
        dashboard_id: config.dashboardId,
        name: config.name,
        type: 'google_sheets',
        status: 'active',
        sync_interval: config.syncInterval || 'daily'
      }])
      .select()
      .single()

    if (sourceError) throw sourceError

    // 2. Cria a configuração específica de Google Sheets
    const { error: configError } = await supabase
      .from('google_sheet_sources')
      .insert([{
        data_source_id: source.id,
        spreadsheet_id: config.spreadsheetId
      }])

    if (configError) throw configError
    
    return source
  },

  /**
   * Salva um log de importação.
   */
  async saveImportLog(log: any) {
    const supabase = await createAdminClient()
    const { data, error } = await supabase
      .from('import_logs')
      .insert([log])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  /**
   * Lista logs de importação.
   */
  async getImportLogs(limit = 50) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('import_logs')
      .select('*, clients(name), dashboards(name)')
      .order('started_at', { ascending: false })
      .limit(limit)
    
    if (error) throw error
    return data
  },

  /**
   * Busca todas as fontes de Google Sheets ativas para automação.
   */
  async getActiveGoogleSheetsSources() {
    const supabase = await createAdminClient()
    const { data, error } = await supabase
      .from('data_sources')
      .select('*, google_sheet_sources(*)')
      .eq('type', 'google_sheets')
      .eq('status', 'active')
    
    if (error) throw error
    return data
  },

  /**
   * Atualiza o status da última importação da fonte.
   */
  async updateGoogleSheetSourceStatus(config: {
    sourceId: string,
    status: string,
    lastImportAt: string
  }) {
    const supabase = await createAdminClient()
    
    const { error } = await supabase
      .from('google_sheet_sources')
      .update({
        last_import_status: config.status,
        last_import_at: config.lastImportAt,
        updated_at: new Date().toISOString()
      })
      .eq('data_source_id', config.sourceId)

    if (error) throw error
  },

  /**
   * Atualiza uma fonte de dados Google Sheets.
   */
  async updateGoogleSheetSource(id: string, config: {
    name: string,
    spreadsheetId: string,
    syncInterval?: string
  }) {
    const supabase = await createClient()

    // 1. Atualiza a entrada na data_sources
    const { error: sourceError } = await supabase
      .from('data_sources')
      .update({ 
        name: config.name,
        sync_interval: config.syncInterval
      })
      .eq('id', id)

    if (sourceError) throw sourceError

    // 2. Atualiza a configuração específica de Google Sheets
    const { error: configError } = await supabase
      .from('google_sheet_sources')
      .update({ spreadsheet_id: config.spreadsheetId })
      .eq('data_source_id', id)

    if (configError) throw configError
    
    return true
  },

  /**
   * Remove uma fonte de dados.
   */
  async deleteSource(id: string) {
    const supabase = await createClient()
    const { error } = await supabase
      .from('data_sources')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    return true
  },

  /**
   * Limpa todos os logs de importação.
   */
  async clearAllLogs() {
    const supabase = await createAdminClient()
    const { error } = await supabase
      .from('import_logs')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Deleta tudo que não tem esse ID fake (basicamente tudo)
    
    if (error) throw error
    return true
  }
}
