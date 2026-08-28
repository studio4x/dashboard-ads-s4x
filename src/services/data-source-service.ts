import { createClient, createAdminClient } from '@/lib/supabase/server'
import { selectPreferredSnapshotSourceIds, type DashboardSourceCandidate } from '@/lib/dashboard/source-priority'

function relation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] || null : value || null
}

export const DataSourceService = {
  async getDashboardSourcesByRole(dashboardId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('data_sources')
      .select('id, dashboard_id, google_sheet_sources(source_role)')
      .eq('dashboard_id', dashboardId)
      .eq('type', 'google_sheets')

    if (error) throw error
    return data || []
  },

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
      .select('*, google_sheet_sources(*), google_ads_sources(*), meta_ad_sources(*), clients(name), dashboards:dashboards!data_sources_dashboard_id_fkey(name, dashboard_type)')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  async getDashboardSourceCandidates(dashboardId: string): Promise<DashboardSourceCandidate[]> {
    const supabase = await createAdminClient({ actor: "system", action: "resolve_dashboard_source_priority" })
    const { data, error } = await supabase
      .from('data_sources')
      .select('id,type,status,google_sheet_sources(source_role,last_import_status),google_ads_sources(last_import_status),meta_ad_sources(last_import_status)')
      .eq('dashboard_id', dashboardId)
    if (error) throw error
    return (data || []).map((source: any) => {
      const sheet = relation<any>(source.google_sheet_sources)
      const google = relation<any>(source.google_ads_sources)
      const meta = relation<any>(source.meta_ad_sources)
      return {
        id: source.id,
        type: source.type,
        status: source.status,
        sourceRole: sheet?.source_role || null,
        lastImportStatus: google?.last_import_status || meta?.last_import_status || sheet?.last_import_status || null,
      }
    })
  },

  async getPreferredSnapshotSourceIds(dashboardId: string, templateId: string, configuredSourceId?: string | null) {
    const candidates = await this.getDashboardSourceCandidates(dashboardId)
    return selectPreferredSnapshotSourceIds(templateId, candidates, configuredSourceId)
  },

  async getActiveSourceForDashboard(sourceId: string, dashboardId: string) {
    const supabase = await createAdminClient()
    const { data, error } = await supabase
      .from('data_sources')
      .select('id, dashboard_id, client_id, name, type, status')
      .eq('id', sourceId)
      .eq('dashboard_id', dashboardId)
      .eq('status', 'active')
      .maybeSingle()

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
    syncInterval?: string,
    dashboardType?: string,
    sourceRole?: "google_ads" | "meta_ads" | null
  }) {
    const supabase = await createClient()

    if (config.dashboardType) {
      const { error: dashboardError } = await supabase
        .from('dashboards')
        .update({ dashboard_type: config.dashboardType })
        .eq('id', config.dashboardId);

      if (dashboardError) throw dashboardError;
    }

    if (config.dashboardType === "google_meta_ads_s4x") {
      if (!config.sourceRole) {
        throw new Error("Para o template integrado, o papel da fonte é obrigatório (google_ads ou meta_ads).");
      }
      const sources = await this.getDashboardSourcesByRole(config.dashboardId);
      const roleInUse = sources.some((source: any) => {
        const role = Array.isArray(source.google_sheet_sources)
          ? source.google_sheet_sources[0]?.source_role
          : source.google_sheet_sources?.source_role;
        return role === config.sourceRole;
      });
      if (roleInUse) {
        throw new Error(`Já existe uma fonte com papel "${config.sourceRole}" para este dashboard integrado.`);
      }
    }

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
        spreadsheet_id: config.spreadsheetId,
        source_role: config.sourceRole || null,
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
  async getImportLogs(limit = 200) {
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
    lastImportAt: string,
    metaValidationStatus?: "not_configured" | "ok" | "missing_metrics",
    metaValidationNotes?: Record<string, unknown>,
    metaValidationUpdatedAt?: string
  }) {
    const supabase = await createAdminClient()
    const updatePayload: Record<string, unknown> = {
      last_import_status: config.status,
      last_import_at: config.lastImportAt,
      updated_at: new Date().toISOString(),
    };

    if (config.metaValidationStatus !== undefined) {
      updatePayload.meta_validation_status = config.metaValidationStatus;
    }
    if (config.metaValidationNotes !== undefined) {
      updatePayload.meta_validation_notes = config.metaValidationNotes;
    }
    if (config.metaValidationUpdatedAt !== undefined) {
      updatePayload.meta_validation_updated_at = config.metaValidationUpdatedAt;
    }
    
    const { error } = await supabase
      .from('google_sheet_sources')
      .update(updatePayload)
      .eq('data_source_id', config.sourceId)

    if (error) throw error
  },

  /**
   * Atualiza uma fonte de dados Google Sheets.
   */
  async updateGoogleSheetSource(id: string, config: {
    name: string,
    spreadsheetId: string,
    syncInterval?: string,
    sourceRole?: "google_ads" | "meta_ads" | null
  }) {
    const supabase = await createClient()

    const { data: sourceData, error: sourceFetchError } = await supabase
      .from('data_sources')
      .select('dashboard_id, dashboards:dashboards!data_sources_dashboard_id_fkey(dashboard_type)')
      .eq('id', id)
      .single()

    if (sourceFetchError) throw sourceFetchError

    const dashboardType = Array.isArray((sourceData as any)?.dashboards)
      ? (sourceData as any)?.dashboards?.[0]?.dashboard_type
      : (sourceData as any)?.dashboards?.dashboard_type;
    const dashboardId = (sourceData as any)?.dashboard_id;

    if (dashboardType === "google_meta_ads_s4x") {
      if (!config.sourceRole) {
        throw new Error("Para o template integrado, o papel da fonte é obrigatório (google_ads ou meta_ads).");
      }
      const sources = await this.getDashboardSourcesByRole(dashboardId);
      const roleInUse = sources.some((source: any) => {
        if (source.id === id) return false;
        const role = Array.isArray(source.google_sheet_sources)
          ? source.google_sheet_sources[0]?.source_role
          : source.google_sheet_sources?.source_role;
        return role === config.sourceRole;
      });
      if (roleInUse) {
        throw new Error(`Já existe uma fonte com papel "${config.sourceRole}" para este dashboard integrado.`);
      }
    }

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
      .update({
        spreadsheet_id: config.spreadsheetId,
        source_role: config.sourceRole || null,
      })
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
  },

  /**
   * Remove logs antigos com base em uma janela de retenção (em dias).
   */
  async clearLogsOlderThanDays(retentionDays = 90) {
    const supabase = await createAdminClient()
    const days = Number.isFinite(retentionDays) ? Math.max(1, Math.floor(retentionDays)) : 90
    const cutoffDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000)).toISOString()

    const { error, count } = await supabase
      .from('import_logs')
      .delete({ count: 'exact' })
      .lt('started_at', cutoffDate)

    if (error) throw error
    return count || 0
  }
}
