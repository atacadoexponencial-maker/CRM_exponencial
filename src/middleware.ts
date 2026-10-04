import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Rotas que não exigem sessão. O porteiro nem consulta o Auth nelas.
const PREFIXOS_PUBLICOS = [
  '/login',
  '/cadastro',
  '/politica-de-privacidade',
  '/termos-de-servico',
  '/exclusao-de-dados',
  '/loja', // vitrine do catálogo: a cliente da loja abre sem login (B16)
]

function rotaPublica(pathname: string): boolean {
  if (pathname === '/') return true
  return PREFIXOS_PUBLICOS.some((p) => pathname.startsWith(p))
}

export async function middleware(request: NextRequest) {
  if (rotaPublica(request.nextUrl.pathname)) {
    return NextResponse.next({ request })
  }

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

  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  // Fora do porteiro: rotas de API (webhooks e crons validam a si mesmas),
  // arquivos do Next, fontes, favicon e qualquer arquivo estático por extensão.
  matcher: [
    '/((?!api/|_next/static|_next/image|fonts/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|css|js|map|txt|xml|webmanifest)$).*)',
  ],
}
