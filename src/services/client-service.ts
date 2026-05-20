import { createClient, createAdminClient } from '@/lib/supabase/server'

export const ClientService = {
  /**
   * Lista todos os clientes.
   */
  async getAllClients() {
    const supabase = await createClient()
    // Traz o cliente com contagem de relacionamentos
    const { data, error } = await supabase
      .from('clients')
      .select(`
        *,
        dashboards:dashboards(count),
        data_sources:data_sources(count)
      `)
      .order('name')
    
    if (error) throw error
    
    // Formata o retorno para injetar o count na raiz para facilitar na UI
    return data.map((client: any) => ({
      ...client,
      dashboards_count: client.dashboards?.[0]?.count || 0,
      sources_count: client.data_sources?.[0]?.count || 0
    }))
  },

  /**
   * Obtém um cliente por ID.
   */
  async getClientById(id: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('clients')
      .select('*, dashboards(*)')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  },

  /**
   * Cria um novo cliente.
   */
  async createClient(clientData: any) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('clients')
      .insert([clientData])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  /**
   * Atualiza um cliente.
   */
  async updateClient(id: string, clientData: any) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('clients')
      .update(clientData)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  /**
   * Exclui um cliente pelo ID.
   */
  async deleteClient(id: string) {
    const supabase = await createClient()
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    return true
  },

  /**
   * Faz upload do logotipo do cliente para o Supabase Storage
   * e retorna a URL pública.
   */
  async uploadLogo(clientId: string, file: Buffer, mimeType: string, ext: string): Promise<string> {
    // Usa o cliente admin (service_role) para bypass de RLS no Storage
    const supabase = await createAdminClient()
    const path = `clients/${clientId}/logo.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('logos')
      .upload(path, file, { contentType: mimeType, upsert: true })
    
    if (uploadError) throw uploadError

    const { data } = supabase.storage.from('logos').getPublicUrl(path)
    // Adiciona cache-buster para forçar re-render após upload
    return `${data.publicUrl}?t=${Date.now()}`
  }
}
