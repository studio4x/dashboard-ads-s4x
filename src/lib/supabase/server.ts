import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // O método setAll pode ser chamado de Server Components,
            // onde cookies não podem ser modificados. Ignoramos o erro.
          }
        },
      },
    }
  )
}

/**
 * Cliente com Service Role para operações administrativas (bypass RLS).
 * NUNCA use este cliente no lado do navegador.
 */
export async function createAdminClient(context?: { actor?: string; action?: string }) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada.");
  }
  const scopedContext = `${context?.actor || "system"}:${context?.action || process.env.S4X_ADMIN_CONTEXT || "unspecified"}`;
  if (process.env.NODE_ENV !== "production") {
    console.info("[SECURITY] createAdminClient invoked", { context: scopedContext });
  } else {
    console.info("[SECURITY] createAdminClient invoked", { context: scopedContext });
  }
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return [] },
        setAll() {},
      },
    }
  )
}
