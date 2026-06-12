import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set({ name, value, ...options })
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isPublicRoute =
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/cadastro') ||
    request.nextUrl.pathname.startsWith('/politica-de-privacidade') ||
    request.nextUrl.pathname.startsWith('/termos-de-servico') ||
    request.nextUrl.pathname.startsWith('/exclusao-de-dados') ||
    request.nextUrl.pathname.startsWith('/api/webhooks/') ||
    request.nextUrl.pathname.startsWith('/api/exclusao-de-dados') ||
    // Crons da Vercel não têm sessão — a rota valida o CRON_SECRET
    request.nextUrl.pathname.startsWith('/api/cron/') ||
    request.nextUrl.pathname === '/'

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
