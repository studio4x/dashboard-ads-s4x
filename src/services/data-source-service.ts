import { createClient } from '@/lib/supabase/server'

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
      .select('*, google_sheet_sources(*), clients(name), dashboards(name)')
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
    spreadsheetId: string
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
        status: 'active'
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
    const supabase = await createClient()
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
  }
}
