import { createClient } from '@/lib/supabase/server'

export const AuthService = {
  /**
   * Obtém o perfil do usuário atual.
   */
  async getCurrentProfile() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return null

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('auth_user_id', user.id)
      .single()
    
    if (error) return null
    return data
  },

  /**
   * Verifica se o usuário tem permissão de admin.
   */
  async isAdmin() {
    const profile = await this.getCurrentProfile()
    return profile?.role === 'admin' || profile?.role === 'owner'
  }
}
