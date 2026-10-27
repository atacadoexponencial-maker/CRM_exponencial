// @vitest-environment node
// B44-04 — depois de entrar, a pessoa volta só para página do próprio CRM
// (auditoria de 27/10/2026). Supabase, cabeçalhos e limite de tentativas simulados:
// o que se confere é para onde o login manda.

import { beforeEach, describe, expect, it, vi } from "vitest"

const destinos: string[] = []
vi.mock("next/navigation", () => ({
  redirect: vi.fn((destino: string) => {
    destinos.push(destino)
    throw new Error("NEXT_REDIRECT")
  }),
}))
vi.mock("next/headers", () => ({
  cookies: async () => ({ set: vi.fn() }),
  headers: async () => new Headers({ "x-forwarded-for": "203.0.113.9" }),
}))
vi.mock("@/lib/limite-de-tentativas", () => ({
  chaveDoEmail: (email: string) => `email:${email}`,
  chaveDoIp: (ip: string) => `ip:${ip}`,
  ipDaRequisicao: async () => "203.0.113.9",
  passouDoLimite: vi.fn().mockResolvedValue(false),
  registrarTentativa: vi.fn(),
}))
vi.mock("@/integrations/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      signInWithPassword: async () => ({ data: { user: { id: "usuario-1" } }, error: null }),
      signOut: vi.fn(),
    },
    from: () => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: { role: "atendente", tema: "claro" } }) }) }),
    }),
  }),
}))

import { realizarLogin } from "@/app/login/actions"

/** Entra com e-mail e senha certos e devolve para onde o login mandou. */
async function entrarCom(voltar: string) {
  destinos.length = 0
  await realizarLogin("ana@exemplo.com", "senha-certa", voltar).catch((e: Error) => {
    if (e.message !== "NEXT_REDIRECT") throw e
  })
  return destinos[0]
}

beforeEach(() => vi.clearAllMocks())

describe("B44-04 — Login volta só para dentro do CRM", () => {
  it("CA-B44-16: should mandar ao Dashboard quando o destino de volta leva a outro site", async () => {
    for (const voltar of ["/\\outro-site.com", "/\\\\outro-site.com", "/\t/outro-site.com", "/\n/outro-site.com", "\t//outro-site.com", "/\\outro-site.com/contatos"]) {
      expect(await entrarCom(voltar), JSON.stringify(voltar)).toBe("/dashboard")
    }
  })

  it("CA-B44-17: should levar para a página do CRM pedida no link de login", async () => {
    expect(await entrarCom("/contatos?busca=ana")).toBe("/contatos?busca=ana")
  })
})
