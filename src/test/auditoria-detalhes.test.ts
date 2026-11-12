// Detalhes da auditoria run-2 (09/11/2026): o que sobrou das pistas. O tamanho da
// conferência humana (Turnstile) e o link da loja nas configurações do catálogo.
// A Cloudflare, a sessão e o banco são falsos; nenhuma rede.

import { afterEach, describe, expect, it, vi } from "vitest"

// Cabeçalho de quem pede, apontando para outro site: o link da loja não pode usar
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ host: "golpe.example", "x-forwarded-host": "golpe.example", "x-forwarded-proto": "https" }),
}))
vi.mock("@/lib/sessao", () => ({
  sessaoAtual: async () => ({ user: { id: "u-1" }, perfil: { role: "admin" } }),
}))
vi.mock("@/app/(auth)/catalogo/configuracoes/actions", () => ({
  carregarConfiguracoes: async () => ({ config: {} }),
}))
vi.mock("next/navigation", () => ({
  redirect: (destino: string) => {
    throw new Error(`redirect ${destino}`)
  },
}))

import { passouNaConferenciaHumana, TAMANHO_MAXIMO_CONFERENCIA } from "@/lib/conferencia-humana"
import ConfiguracoesCatalogoPage from "@/app/(auth)/catalogo/configuracoes/page"

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

function cloudflareAceita() {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }))
}

describe("Detalhes da auditoria: tamanho da conferência humana", () => {
  it("should recusar a conferência maior que o máximo da Cloudflare, sem chamá-la", async () => {
    const chamada = cloudflareAceita()
    expect(await passouNaConferenciaHumana("x".repeat(TAMANHO_MAXIMO_CONFERENCIA + 1), "203.0.113.7")).toBe(false)
    expect(chamada).not.toHaveBeenCalled()
  })

  it("should recusar a conferência enorme mesmo com a Cloudflare fora do ar", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("fetch failed"))
    expect(await passouNaConferenciaHumana("x".repeat(1_000_000), "203.0.113.7")).toBe(false)
  })

  it("should mandar à Cloudflare a conferência do tamanho máximo", async () => {
    const chamada = cloudflareAceita()
    expect(await passouNaConferenciaHumana("x".repeat(TAMANHO_MAXIMO_CONFERENCIA), "203.0.113.7")).toBe(true)
    expect(chamada).toHaveBeenCalledTimes(1)
  })
})

describe("Detalhes da auditoria: link da loja nas configurações do catálogo", () => {
  it("should montar o link com o endereço do deploy, não com o host de quem pede", async () => {
    vi.stubEnv("VERCEL_ENV", "production")
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://crmatacadoexp.com")

    const pagina = (await ConfiguracoesCatalogoPage()) as { props: { prefixoLink: string } }

    expect(pagina.props.prefixoLink).toBe("https://crmatacadoexp.com/loja/")
  })
})
