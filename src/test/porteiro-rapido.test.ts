// @vitest-environment node
// B27-01: o porteiro confere a sessão com a chave pública guardada em memória,
// sem ir ao serviço de logins a cada clique. Chave ES256 gerada aqui; a lista
// de chaves e o Auth são falsos, e toda requisição de rede é contada.

import { NextRequest } from "next/server"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { middleware } from "@/middleware"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const COOKIE = `sb-${new URL(SUPABASE_URL).hostname.split(".")[0]}-auth-token`
const APP = "http://localhost:3000"
const KID = "chave-do-teste"
const USUARIO = "11111111-1111-1111-1111-111111111111"

type Chaves = { privada: CryptoKey; jwk: JsonWebKey & { kid: string; alg: string } }

let certa: Chaves
let outra: Chaves
let chamadas: string[] = []

async function gerarChaves(kid: string): Promise<Chaves> {
  const par = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"])
  const jwk = await crypto.subtle.exportKey("jwk", par.publicKey)
  return { privada: par.privateKey, jwk: { ...jwk, kid, alg: "ES256" } }
}

const b64url = (dados: string | Uint8Array) =>
  Buffer.from(dados).toString("base64url")

async function assinar(chaves: Chaves, payload: Record<string, unknown>, kid = chaves.jwk.kid) {
  const cabecalho = b64url(JSON.stringify({ alg: "ES256", typ: "JWT", kid }))
  const corpo = b64url(JSON.stringify(payload))
  const assinatura = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    chaves.privada,
    new TextEncoder().encode(`${cabecalho}.${corpo}`)
  )
  return `${cabecalho}.${corpo}.${b64url(new Uint8Array(assinatura))}`
}

async function sessao(chaves: Chaves, { venceEmSegundos = 3600, kid }: { venceEmSegundos?: number; kid?: string } = {}) {
  const agora = Math.floor(Date.now() / 1000)
  const exp = agora + venceEmSegundos
  const access_token = await assinar(
    chaves,
    { sub: USUARIO, aud: "authenticated", role: "authenticated", iat: agora - 60, exp, session_id: "s1" },
    kid
  )
  return {
    access_token,
    token_type: "bearer",
    expires_in: venceEmSegundos,
    expires_at: exp,
    refresh_token: "renovacao-valida",
    user: { id: USUARIO, aud: "authenticated", role: "authenticated", email: "ana@empresa.com" },
  }
}

const cookieDaSessao = (s: object) => `${COOKIE}=base64-${b64url(JSON.stringify(s))}`

function pedido(caminho: string, cookie?: string) {
  return new NextRequest(`${APP}${caminho}`, { headers: cookie ? { cookie } : {} })
}

const passou = (r: Response) => r.headers.get("x-middleware-next") === "1"
const destino = (r: Response) => {
  const local = r.headers.get("location")
  return local ? new URL(local) : null
}

beforeAll(async () => {
  certa = await gerarChaves(KID)
  outra = await gerarChaves("chave-de-fora")
})

beforeEach(() => {
  chamadas = []
  vi.stubGlobal(
    "fetch",
    vi.fn(async (entrada: RequestInfo | URL, init?: RequestInit) => {
      const url = String(entrada instanceof Request ? entrada.url : entrada)
      chamadas.push(`${init?.method ?? "GET"} ${new URL(url).pathname}${new URL(url).search}`)
      if (url.endsWith("/.well-known/jwks.json")) {
        return Response.json({ keys: [certa.jwk] })
      }
      if (url.includes("/auth/v1/token") && url.includes("refresh_token")) {
        return Response.json(await sessao(certa))
      }
      // /auth/v1/user: o Auth recusa qualquer sessão que chegue até ele.
      return Response.json({ code: 401, error_code: "bad_jwt", msg: "invalid JWT" }, { status: 401 })
    })
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("porteiro rápido", () => {
  it("CA-B27-01: clique de quem está logado não pergunta ao serviço de logins", async () => {
    const cookie = cookieDaSessao(await sessao(certa))

    // Primeiro clique da instância: busca a lista pública de chaves e guarda.
    expect(passou(await middleware(pedido("/contatos", cookie)))).toBe(true)
    expect(chamadas.filter((c) => !c.endsWith("/.well-known/jwks.json"))).toEqual([])

    // Cliques seguintes: nenhuma requisição de rede.
    chamadas = []
    expect(passou(await middleware(pedido("/configuracoes/whatsapp", cookie)))).toBe(true)
    expect(passou(await middleware(pedido("/chat", cookie)))).toBe(true)
    expect(chamadas).toEqual([])
  })

  it("CA-B27-02: sem sessão, vai para o login sem aviso", async () => {
    const resposta = await middleware(pedido("/contatos"))

    expect(destino(resposta)?.pathname).toBe("/login")
    expect(destino(resposta)?.search).toBe("")
  })

  it("CA-B27-03: sessão assinada com outra chave não entra", async () => {
    const cookie = cookieDaSessao(await sessao(outra))

    const resposta = await middleware(pedido("/contatos", cookie))

    expect(destino(resposta)?.pathname).toBe("/login")
  })

  it("CA-B27-03: sessão com o conteúdo alterado não entra", async () => {
    const original = await sessao(certa)
    const [cabecalho, , assinatura] = original.access_token.split(".")
    const corpoAlterado = b64url(JSON.stringify({ sub: "22222222-2222-2222-2222-222222222222", aud: "authenticated", role: "authenticated", exp: original.expires_at }))
    const cookie = cookieDaSessao({ ...original, access_token: `${cabecalho}.${corpoAlterado}.${assinatura}` })

    const resposta = await middleware(pedido("/contatos", cookie))

    expect(destino(resposta)?.pathname).toBe("/login")
  })

  it("CA-B27-04: sessão vencida é renovada e a tela abre", async () => {
    const vencida = await sessao(certa, { venceEmSegundos: -60 })

    const resposta = await middleware(pedido("/contatos", cookieDaSessao(vencida)))

    expect(passou(resposta)).toBe(true)
    expect(chamadas.some((c) => c.startsWith("POST /auth/v1/token"))).toBe(true)
    const novo = resposta.cookies.getAll().find((c) => c.name.startsWith(COOKIE))
    expect(novo?.value).toBeTruthy()
    expect(novo?.value).not.toBe(cookieDaSessao(vencida).split("=")[1])
  })

  it("CA-B27-05: telas públicas abrem sem sessão e sem rede", async () => {
    for (const caminho of ["/login", "/cadastro", "/politica-de-privacidade", "/loja/minha-loja"]) {
      expect(passou(await middleware(pedido(caminho)))).toBe(true)
    }
    expect(chamadas).toEqual([])
  })
})
