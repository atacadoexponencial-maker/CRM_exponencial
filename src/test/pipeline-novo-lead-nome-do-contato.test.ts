// QA C3 (06/10/2026) — "Novo lead" com telefone de contato que já existe não
// apaga nem troca o nome do contato. Antes era um upsert que regravava
// `name` com o que viesse do formulário, inclusive null. O cliente do banco
// é falso e responde por tabela.

import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/automacoes/fila", () => ({ dispararAutomacoes: vi.fn() }))
vi.mock("@/lib/sequencias", () => ({ processarGatilhoSequencia: vi.fn() }))
vi.mock("@/lib/lixeira", () => ({ tirarDaLixeira: vi.fn(async () => {}) }))
vi.mock("@/lib/automacoes/gatilhos-do-crm", () => ({
  cardsDepoisDoMovimento: vi.fn(),
  prepararGatilhoDeClassificacao: vi.fn(async () => async () => {}),
}))
vi.mock("@/integrations/supabase/server", () => ({ createClient: vi.fn() }))
vi.mock("@/integrations/supabase/service", () => ({ createServiceClient: vi.fn() }))

import { createClient } from "@/integrations/supabase/server"
import { criarNovoLead } from "@/app/(auth)/pipeline/actions"

let contatosInseridos: Array<Record<string, unknown>>
let contatosAtualizados: Array<Record<string, unknown>>
let upserts: number

/** `contatoExistente`: o que a busca por telefone acha em `contacts`. */
function banco({ contatoExistente = null as { id: string; name: string | null } | null } = {}) {
  contatosInseridos = []
  contatosAtualizados = []
  upserts = 0
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: "admin-1" } }, error: null }) },
    from: vi.fn((tabela: string) => {
      const obj: Record<string, unknown> = {}
      let inserindo = false
      for (const m of ["select", "eq", "limit"]) obj[m] = vi.fn(() => obj)
      obj.upsert = vi.fn(() => {
        upserts++
        return obj
      })
      obj.update = vi.fn((valores: Record<string, unknown>) => {
        if (tabela === "contacts") contatosAtualizados.push(valores)
        return obj
      })
      obj.insert = vi.fn((valores: Record<string, unknown>) => {
        inserindo = true
        if (tabela === "contacts") contatosInseridos.push(valores)
        return obj
      })
      obj.single = vi.fn(async () => {
        if (tabela === "profiles") return { data: { workspace_id: "ws-1", role: "admin" }, error: null }
        if (tabela === "contacts" && inserindo) return { data: { id: "contato-novo" }, error: null }
        if (tabela === "pipeline_cards" && inserindo) return { data: { id: "card-novo" }, error: null }
        return { data: null, error: null }
      })
      obj.maybeSingle = vi.fn(async () => ({ data: tabela === "contacts" ? contatoExistente : null, error: null }))
      // `update(...).eq(...)` é aguardado direto
      obj.then = undefined
      return obj
    }),
  }
  vi.mocked(createClient).mockResolvedValue(client as never)
}

beforeEach(() => vi.clearAllMocks())

describe("QA C3 — novo lead não apaga o nome do contato", () => {
  it("contato existente com nome: mantém o nome, mesmo com outro nome digitado", async () => {
    banco({ contatoExistente: { id: "contato-1", name: "Ana Souza" } })
    expect(await criarNovoLead("5511999998888", "Ana")).toEqual({})
    expect(contatosAtualizados).toEqual([])
    expect(contatosInseridos).toEqual([])
    expect(upserts).toBe(0)
  })

  it("contato existente com nome e lead sem nome: nada muda no contato", async () => {
    banco({ contatoExistente: { id: "contato-1", name: "Ana Souza" } })
    expect(await criarNovoLead("5511999998888", null)).toEqual({})
    expect(contatosAtualizados).toEqual([])
    expect(upserts).toBe(0)
  })

  it("contato existente sem nome: recebe o nome digitado", async () => {
    banco({ contatoExistente: { id: "contato-1", name: null } })
    expect(await criarNovoLead("5511999998888", " Ana ")).toEqual({})
    expect(contatosAtualizados).toEqual([{ name: "Ana" }])
    expect(contatosInseridos).toEqual([])
  })

  it("contato novo: nasce com o nome do formulário", async () => {
    banco()
    expect(await criarNovoLead("5511999998888", "Ana")).toEqual({})
    expect(contatosInseridos).toEqual([{ workspace_id: "ws-1", phone_number: "5511999998888", name: "Ana" }])
    expect(contatosAtualizados).toEqual([])
  })
})
