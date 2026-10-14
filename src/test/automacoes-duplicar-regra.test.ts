// B22-18 — duplicar uma regra de nome longo mantém o "(cópia)" (achado M15 do QA
// das automações, 09/10/2026). A sessão e o banco são falsos: o banco devolve a
// regra pedida e guarda o que foi inserido.

import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/integrations/supabase/service", () => ({ createServiceClient: vi.fn() }))
vi.mock("@/lib/sessao", () => ({ sessaoAtual: vi.fn() }))

import { sessaoAtual } from "@/lib/sessao"
import { duplicarRegra } from "@/app/(auth)/configuracoes/automacoes/actions"

const FLUXO = {
  blocos: [{ id: "g", tipo: "gatilho", gatilho: "conversa_criada", parametros: {}, posicao: { x: 0, y: 0 } }],
  ligacoes: [],
}

let inserida: Record<string, unknown> | null

function sessaoComRegra(nome: string) {
  const obj: Record<string, unknown> = {}
  for (const m of ["select", "eq"]) obj[m] = vi.fn(() => obj)
  obj.maybeSingle = vi.fn(() => Promise.resolve({ data: { nome, fluxo: FLUXO, repeticao: { modo: "sempre" } }, error: null }))
  obj.insert = vi.fn((linha: Record<string, unknown>) => {
    inserida = linha
    return Promise.resolve({ error: null })
  })
  vi.mocked(sessaoAtual).mockResolvedValue({
    supabase: { from: vi.fn(() => obj) },
    user: { id: "admin-1" },
    perfil: { role: "admin", workspace_id: "ws-1" },
  } as unknown as Awaited<ReturnType<typeof sessaoAtual>>)
}

beforeEach(() => {
  inserida = null
})

describe("B22-18 — nome da cópia", () => {
  it("nome curto: acrescenta '(cópia)'", async () => {
    sessaoComRegra("Boas-vindas")
    expect(await duplicarRegra("r1")).toEqual({})
    expect(inserida?.nome).toBe("Boas-vindas (cópia)")
  })

  it("nome de 120 caracteres: encurta o original e mantém '(cópia)' em até 120", async () => {
    sessaoComRegra("x".repeat(120))
    await duplicarRegra("r1")
    const nome = inserida?.nome as string
    expect(nome.endsWith(" (cópia)")).toBe(true)
    expect(nome).toHaveLength(120)
  })

  it("o corte não deixa espaço antes de '(cópia)'", async () => {
    sessaoComRegra(`${"a".repeat(111)} ${"b".repeat(8)}`)
    await duplicarRegra("r1")
    expect(inserida?.nome).toBe(`${"a".repeat(111)} (cópia)`)
  })

  it("a cópia nasce pausada", async () => {
    sessaoComRegra("Boas-vindas")
    await duplicarRegra("r1")
    expect(inserida?.ativa).toBe(false)
  })
})
