'use server'

import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

export async function forgotPassword(formData: FormData) {
  const email = formData.get('email') as string
  if (!email) {
    return { error: "Por favor, digite um e-mail válido." }
  }

  const supabase = await createClient()
  const headersList = await headers()
  const host = headersList.get('host') ?? 'localhost:3000'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const origin = `${protocol}://${host}`

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: "E-mail de recuperação enviado com sucesso. Verifique sua caixa de entrada e spam!" }
}
