'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { enforceRateLimitByIdentity } from '@/lib/security/request-guards'

export async function login(formData: FormData) {
  const supabase = await createClient()
  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown'

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const loginLimiter = enforceRateLimitByIdentity(`${ip}:${String(email || '').toLowerCase()}`, {
    key: 'auth:login',
    limit: 8,
    windowMs: 60_000,
  })
  if (loginLimiter) return loginLimiter

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/admin')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()
  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown'

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const name = formData.get('name') as string
  const signupLimiter = enforceRateLimitByIdentity(`${ip}:${String(email || '').toLowerCase()}`, {
    key: 'auth:signup',
    limit: 4,
    windowMs: 60_000,
  })
  if (signupLimiter) return signupLimiter

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
      },
    },
  })

  if (error) {
    return { error: error.message }
  }

  return { success: "Verifique seu e-mail para confirmar o cadastro." }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
