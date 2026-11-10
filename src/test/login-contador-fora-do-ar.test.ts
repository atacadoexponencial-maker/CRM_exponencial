// @vitest-environment node
// Detalhes da auditoria run-2 (10/11/2026), achado do revisor: com o contador de tentativas
// fora do ar, o login conferia a senha sem limite e sem conferência humana. Agora pede a
// conferência e avisa o Sentry. O banco, o Sentry e o Supabase Auth são falsos.

import { beforeEach, describe, expect, it, vi } from "vitest"

const capturar = vi.fn()
vi.mock("@sentry/nextjs", () => ({ captureException: (...a: unknown[]) => capturar(...a) }))

// O RPC do contador falha; o resto do banco responde normalmente
const apagar = vi.fn()
vi.mock("@/integrations/supabase/service", () => ({
  createServiceClient: () => ({
    rpc: async () => ({ data: null, error: { message: "connection refused" } }),
    from: () => ({
      insert: async () => ({ error: null }),
      delete: () => ({ eq: apagar, lt: apagar }),
    }),
  }),
}))
vi.mock("next/headers", () => ({
  cookies: async () => ({ set: vi.fn() }),
  headers: async () => new Headers({ "x-forwarded-for": "203.0.113.9" }),
}))
vi.mock("next/navigation", () => ({
  redirect: () => {
    throw new Error("NEXT_REDIRECT")
  },
}))
const entrar = vi.fn(async () => ({ data: { user: null }, error: { code: "invalid_credentials" } }))
vi.mock("@/integrations/supabase/server", () => ({
  createClient: async () => ({ auth: { signInWithPassword: entrar, signOut: vi.fn() } }),
}))

import { reservarTentativa } from "@/lib/limite-de-tentativas"
import { realizarLogin } from "@/app/login/actions"

beforeEach(() => vi.clearAllMocks())

describe("Detalhes da auditoria: contador de tentativas fora do ar", () => {
  it("should avisar quem chama e o Sentry quando o contador não responde", async () => {
    expect(await reservarTentativa("login", "chave", 10, 15)).toEqual({ reservada: true, id: null, contadorFora: true })
    expect(capturar).toHaveBeenCalledTimes(1)
  })

  it("should pedir a conferência humana no login sem conferir a senha", async () => {
    const resultado = await realizarLogin("ana@exemplo.com", "chute", null, null)

    expect(resultado.pedirConferencia).toBe(true)
    expect(entrar).not.toHaveBeenCalled()
  })

  it("should conferir a senha quando a conferência humana vem junto", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "1x0000000000000000000000000000000AA")
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }))

    const resultado = await realizarLogin("ana@exemplo.com", "chute", null, "XXXX.DUMMY.TOKEN.XXXX")

    expect(entrar).toHaveBeenCalledTimes(1)
    expect(resultado).toEqual({ erro: "E-mail ou senha incorretos", pedirConferencia: true })
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })
})
