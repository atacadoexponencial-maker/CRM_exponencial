// B22-35 — "Testar com um contato": a busca ignora acento e maiúscula (baixo do
// QA das automações, 09/10/2026). O banco falso devolve os candidatos que o
// padrão do `ilike` pegaria; a action filtra.

import { describe, it, expect, vi } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/integrations/supabase/service", () => ({ createServiceClient: vi.fn() }))
vi.mock("@/lib/sessao", () => ({ sessaoAtual: vi.fn() }))

import { sessaoAtual } from "@/lib/sessao"
import { buscarContatosTeste } from "@/app/(auth)/configuracoes/automacoes/actions"

function sessao(candidatos: Array<{ id: string; name: string | null; phone_number: string }>) {
  const filtros: string[] = []
  const obj: Record<string, unknown> = {}
  for (const m of ["select", "eq", "is", "limit", "in", "order"]) obj[m] = vi.fn(() => obj)
  obj.or = vi.fn((filtro: string) => {
    filtros.push(filtro)
    return obj
  })
  obj.then = (resolve: (v: unknown) => void) => Promise.resolve({ data: candidatos, error: null }).then(resolve)
  vi.mocked(sessaoAtual).mockResolvedValue({
    supabase: { from: vi.fn(() => obj) },
    user: { id: "admin-1" },
    perfil: { role: "admin", workspace_id: "ws-1" },
  } as unknown as Awaited<ReturnType<typeof sessaoAtual>>)
  return filtros
}

describe("B22-35 — busca de contato sem acento", () => {
  it("'jose' acha 'José', e o que o padrão pegou a mais fica de fora", async () => {
    const filtros = sessao([
      { id: "1", name: "José Lima", phone_number: "5511" },
      { id: "2", name: "Josa Reis", phone_number: "5512" },
    ])
    expect((await buscarContatosTeste("jose")).map((c) => c.nome)).toEqual(["José Lima"])
    expect(filtros[0]).toContain("name.ilike.%j_s_%")
  })

  it("'JOSÉ' também acha 'jose'", async () => {
    sessao([{ id: "1", name: "jose", phone_number: "5511" }])
    expect((await buscarContatosTeste("JOSÉ")).map((c) => c.nome)).toEqual(["jose"])
  })

  it("busca por telefone continua valendo", async () => {
    sessao([{ id: "1", name: "Ana", phone_number: "5511999998888" }])
    expect((await buscarContatosTeste("99999")).map((c) => c.nome)).toEqual(["Ana"])
  })
})
