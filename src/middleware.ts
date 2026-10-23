import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Rotas que não exigem sessão. O porteiro nem consulta o Auth nelas.
// (B24, 23/10: o matcher lá embaixo também libera .json, .webm e .mp4, os vídeos e
// ícones animados da landing em public/landing.)
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

const ROTAS_DE_ENTRADA = ['/login', '/cadastro']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const rotaDeEntrada = ROTAS_DE_ENTRADA.includes(pathname)
  if (rotaPublica(pathname) && !rotaDeEntrada) {
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

  // B27-01: confere a assinatura da sessão ali mesmo, com a chave pública
  // guardada em memória. O getUser ia ao Auth em Oregon a cada clique (~220 ms
  // a partir de São Paulo). Usuário desativado com a assinatura ainda válida
  // passa daqui e é barrado por `sessaoAtual()`, no servidor das telas.
  const { data, error } = await supabase.auth.getClaims()

  // QA baixos (06/10): quem já está logado não vê o formulário de login nem o de cadastro.
  if (rotaDeEntrada) {
    if (!data?.claims) return supabaseResponse
    // 20/10: desativado com a assinatura ainda válida chega aqui mandado por
    // `sessaoAtual()`. Devolvê-lo ao Dashboard fechava um laço (tela → login →
    // Dashboard → ...), e ele ficava só com o menu, sem aviso. Aqui a sessão é
    // apagada e a tela de login abre com o aviso.
    if (pathname === '/login' && request.nextUrl.searchParams.get('motivo') === 'desativada') {
      for (const { name } of request.cookies.getAll()) {
        if (name.startsWith('sb-') && name.includes('-auth-token')) supabaseResponse.cookies.delete(name)
      }
      return supabaseResponse
    }
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    url.search = ''
    return NextResponse.redirect(url)
  }

  if (!data?.claims) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    // B20-02: usuário desativado é banido no Auth; a tela de login avisa o porquê.
    if (error?.code === 'user_banned') url.searchParams.set('motivo', 'desativada')
    // QA baixos (06/10): depois de entrar, volta para a página que a pessoa tentou abrir.
    else if (pathname !== '/dashboard') url.searchParams.set('voltar', pathname + request.nextUrl.search)
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  // Fora do porteiro: rotas de API (webhooks e crons validam a si mesmas),
  // arquivos do Next, fontes, favicon e qualquer arquivo estático por extensão.
  matcher: [
    '/((?!api/|_next/static|_next/image|fonts/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|css|js|map|txt|xml|webmanifest|json|webm|mp4)$).*)',
  ],
}
