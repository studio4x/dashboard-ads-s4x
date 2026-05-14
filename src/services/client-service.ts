import { createClient } from '@/lib/supabase/server'

export const ClientService = {
  /**
   * Lista todos os clientes.
   */
  async getAllClients() {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('name')
    
    if (error) throw error
    return data
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
  }
}
