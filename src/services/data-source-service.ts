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
