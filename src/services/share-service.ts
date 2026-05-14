import { createClient, createAdminClient } from '@/lib/supabase/server'
import crypto from 'crypto'

export const ShareService = {
  /**
   * Cria um link de compartilhamento para o dashboard
   */
  async createShareLink(dashboardId: string, name?: string, expiresAt?: string) {
    const supabase = await createClient()

    // Obter o client_id associado ao dashboard para segurança e tracking
    const { data: dashboard, error: dbError } = await supabase
      .from('dashboards')
      .select('client_id')
      .eq('id', dashboardId)
      .single()

    if (dbError || !dashboard) throw new Error("Dashboard não encontrado")

    // Gerar token forte (64 chars)
    const rawToken = crypto.randomBytes(32).toString('hex')
    // Gerar hash para o banco (SHA-256)
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')

    // Pega o ID do criador
    const { data: { session } } = await supabase.auth.getSession()
    const createdBy = session?.user?.id

    const { data: link, error: insertError } = await supabase
      .from('dashboard_share_links')
      .insert([{
        dashboard_id: dashboardId,
        client_id: dashboard.client_id,
        token_hash: tokenHash,
        name: name || 'Link Compartilhado',
        expires_at: expiresAt || null,
        created_by: createdBy
      }])
      .select()
      .single()

    if (insertError) throw insertError

    return {
      link,
      rawToken // O token cru só é retornado uma única vez na criação
    }
  },

  /**
   * Valida o token de compartilhamento e retorna os dados do dashboard se válido
   */
  async validateShareToken(rawToken: string) {
    const supabase = await createAdminClient()
    
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')

    const { data: link, error } = await supabase
      .from('dashboard_share_links')
      .select('*, dashboards(id, name, slug, clients(id, name, logo_url))')
      .eq('token_hash', tokenHash)
      .single()

    if (error || !link) {
      return { isValid: false, reason: 'not_found' }
    }

    if (link.status === 'revoked') {
      return { isValid: false, reason: 'revoked' }
    }

    if (link.status === 'expired' || (link.expires_at && new Date(link.expires_at) < new Date())) {
      // Opcional: atualizar status para expired no banco se não estiver
      return { isValid: false, reason: 'expired' }
    }

    return { isValid: true, link }
  },

  /**
   * Registra um novo acesso ao link (incrementa contador e last_accessed_at)
   */
  async registerShareAccess(linkId: string) {
    const supabase = await createAdminClient() // precisa de admin por ser rota publica sem auth
    
    // Atualiza diretamente via admin para não ter problemas de RLS público
    const { error } = await supabase.rpc('increment_share_access', { link_id: linkId })
    
    // Se não tivermos RPC para isso, podemos usar um update normal, mas como a tabela
    // tá bloqueada para update por users não logados, o admin client ignora RLS.
    if (error) {
       // Fallback caso não haja RPC
       const { data: current } = await supabase.from('dashboard_share_links').select('access_count').eq('id', linkId).single()
       if (current) {
          await supabase.from('dashboard_share_links').update({
            access_count: (current.access_count || 0) + 1,
            last_accessed_at: new Date().toISOString()
          }).eq('id', linkId)
       }
    }
  },

  /**
   * Lista todos os links de um dashboard (Para Admin)
   */
  async listShareLinks(dashboardId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('dashboard_share_links')
      .select('*')
      .eq('dashboard_id', dashboardId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  /**
   * Revoga um link de compartilhamento
   */
  async revokeShareLink(linkId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('dashboard_share_links')
      .update({
        status: 'revoked',
        revoked_at: new Date().toISOString()
      })
      .eq('id', linkId)
      .select()
      .single()
    
    if (error) throw error
    return data
  }
}
