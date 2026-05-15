import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresca a sessão se estiver expirada
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname;

  // Se não estiver logado e tentar acessar área restrita
  if ((pathname.startsWith('/admin') || pathname.startsWith('/app')) && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Se logado, verificamos a role para proteção de área administrativa
  if (user) {
    // Buscamos o perfil para checar a role (Cacheamos isso no futuro se necessário)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('auth_user_id', user.id)
      .single();

    // 1. Proteção da área /admin
    if (pathname.startsWith('/admin')) {
      if (!profile || (profile.role !== 'admin' && profile.role !== 'owner')) {
        const url = request.nextUrl.clone()
        url.pathname = profile?.role === 'client' ? '/app/dashboards' : '/login'
        return NextResponse.redirect(url)
      }
    }

    // 2. Redireciona /login para a área correta apenas se o perfil existir
    if (pathname === '/login' && profile) {
      const url = request.nextUrl.clone()
      url.pathname = profile.role === 'client' ? '/app/dashboards' : '/admin'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
