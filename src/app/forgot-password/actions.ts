'use server'

import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { enforceRateLimitByIdentity } from '@/lib/security/request-guards'

export async function forgotPassword(formData: FormData) {
  const email = formData.get('email') as string
  if (!email) {
    return { error: "Por favor, digite um e-mail válido." }
  }

  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || headersList.get('x-real-ip') || 'unknown'
  const resetLimiter = enforceRateLimitByIdentity(`${ip}:${String(email || '').toLowerCase()}`, {
    key: 'auth:forgot-password',
    limit: 5,
    windowMs: 60_000,
  })
  if (resetLimiter) return resetLimiter

  const supabase = await createClient()
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
