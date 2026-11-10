// Auditoria de segurança run-2 (06/11/2026), pista 6: o link do e-mail de senha nova e o
// do convite usam o endereço do deploy, não o domínio que veio no cabeçalho de quem pede.
// O banco, o e-mail e a conferência humana são falsos.

import { afterEach, describe, expect, it, vi } from "vitest"

let cabecalhos = new Headers()
vi.mock("next/headers", () => ({ headers: async () => cabecalhos }))
vi.mock("@/lib/conferencia-humana", () => ({ passouNaConferenciaHumana: vi.fn(async () => true) }))
vi.mock("@/lib/limite-de-tentativas", () => ({
  chaveDoEmail: (e: string) => `email:${e}`,
  chaveDoIp: (ip: string) => `ip:${ip}`,
  ipDaRequisicao: vi.fn(async () => "203.0.113.7"),
  reservarTentativa: vi.fn(async () => ({ reservada: true, id: null })),
  liberarTentativa: vi.fn(async () => undefined),
  limparTentativasAntigas: vi.fn(async () => undefined),
}))
const enviados: Array<{ email: string; link: string }> = []
vi.mock("@/lib/email-de-senha-nova", () => ({
  enviarEmailDeSenhaNova: vi.fn(async (email: string, link: string) => { enviados.push({ email, link }); return true }),
}))
vi.mock("@/integrations/supabase/service", () => ({
  createServiceClient: () => {
    const consulta: Record<string, unknown> = {}
    for (const m of ["update", "eq", "is"]) consulta[m] = () => consulta
    consulta.insert = async () => ({ error: null })
    consulta.then = (r: (v: unknown) => void) => Promise.resolve({ error: null }).then(r)
    return { rpc: async () => ({ data: "u-1", error: null }), from: () => consulta }
  },
}))

import { enderecoDoApp } from "@/lib/endereco-do-app"
import { pedirLinkDeSenhaNova } from "@/app/esqueci-minha-senha/actions"

function ambiente(vars: Record<string, string>) {
  for (const nome of ["VERCEL_ENV", "VERCEL_BRANCH_URL", "VERCEL_URL", "NEXT_PUBLIC_APP_URL"]) vi.stubEnv(nome, vars[nome] ?? "")
}
afterEach(() => {
  vi.unstubAllEnvs()
  enviados.length = 0
})

describe("Auditoria run-2, pista 6: endereço do CRM nos links por e-mail", () => {
  it("produção usa o endereço configurado, ou o domínio do CRM", () => {
    ambiente({ VERCEL_ENV: "production", VERCEL_URL: "crm-abc123.vercel.app" })
    expect(enderecoDoApp()).toBe("https://crmatacadoexp.com")

    ambiente({ VERCEL_ENV: "production", NEXT_PUBLIC_APP_URL: "https://crm.exemplo.com/" })
    expect(enderecoDoApp()).toBe("https://crm.exemplo.com")
  })

  it("prévia continua levando à prévia, pelo endereço que a Vercel dá ao deploy", () => {
    ambiente({ VERCEL_ENV: "preview", VERCEL_BRANCH_URL: "crm-git-minha-branch.vercel.app", VERCEL_URL: "crm-abc123.vercel.app" })
    expect(enderecoDoApp()).toBe("https://crm-git-minha-branch.vercel.app")

    ambiente({ VERCEL_ENV: "preview", VERCEL_URL: "crm-abc123.vercel.app" })
    expect(enderecoDoApp()).toBe("https://crm-abc123.vercel.app")
  })

  it("fora da Vercel usa o endereço configurado, ou o local", () => {
    ambiente({})
    expect(enderecoDoApp()).toBe("http://localhost:3000")

    ambiente({ NEXT_PUBLIC_APP_URL: "https://crm.teste" })
    expect(enderecoDoApp()).toBe("https://crm.teste")
  })

  it("pedido com x-forwarded-host forjado manda o link com o domínio do CRM, não o do cabeçalho", async () => {
    ambiente({ VERCEL_ENV: "production" })
    cabecalhos = new Headers({ host: "site-falso.invalid", "x-forwarded-host": "site-falso.invalid", "x-forwarded-proto": "http" })

    expect(await pedirLinkDeSenhaNova({ email: "dona@empresa.com", conferencia: "ok" })).toEqual({ ok: true })

    expect(enviados).toHaveLength(1)
    const link = new URL(enviados[0].link)
    expect(link.origin).toBe("https://crmatacadoexp.com")
    expect(link.pathname).toBe("/redefinir-senha")
    expect(link.searchParams.get("codigo")).toBeTruthy()
    expect(enviados[0].link).not.toContain("site-falso.invalid")
  })
})
