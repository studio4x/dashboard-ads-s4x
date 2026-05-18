'use server'

import { createClient } from '@/lib/supabase/server'

export async function resetPassword(formData: FormData) {
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (!password || !confirmPassword) {
    return { error: "Por favor, preencha todos os campos." }
  }

  if (password !== confirmPassword) {
    return { error: "As senhas não coincidem. Por favor, tente novamente." }
  }

  if (password.length < 6) {
    return { error: "A senha deve conter no mínimo 6 caracteres." }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    return { error: error.message }
  }

  return { success: "Senha redefinida com sucesso! Você já pode entrar com suas novas credenciais." }
}
