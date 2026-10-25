// B29-02 — os outros caminhos em que um contato nasce pedem a foto: "Novo contato"
// em Contatos e "Novo lead" no funil (o pedido da loja está em
// catalogo-pedido.integration.test.ts). A busca em si é falsa: o teste confere que
// ela é chamada uma vez, depois de o contato existir, com o id e o telefone certos.

import { describe, it, expect, vi, beforeEach } from "vitest"

const buscar = vi.fn<(...a: unknown[]) => Promise<string>>(async () => "guardada")
vi.mock("@/lib/whatsapp/foto-de-perfil", () => ({ buscarEGuardarFotoDoContato: (...a: unknown[]) => buscar(...a) }))
vi.mock("@/lib/automacoes/fila", () => ({ dispararAutomacoes: vi.fn() }))
vi.mock("@/lib/lixeira", () => ({ tirarDaLixeira: vi.fn(async () => false) }))
vi.mock("@/lib/automacoes/gatilhos-do-crm", () => ({
  cardsDepoisDoMovimento: vi.fn(),
  prepararGatilhoDeClassificacao: vi.fn(async () => async () => {}),
  dispararDadosAlterados: vi.fn(),
  dispararTagAdicionada: vi.fn(),
}))
vi.mock("@/integrations/supabase/server", () => ({ createClient: vi.fn() }))
vi.mock("@/integrations/supabase/service", () => ({ createServiceClient: vi.fn(() => ({})) }))
vi.mock("@/lib/sessao", () => ({ sessaoAtual: vi.fn() }))

import { createClient } from "@/integrations/supabase/server"
import { criarContato } from "@/app/(auth)/contatos/actions"
import { criarNovoLead } from "@/app/(auth)/pipeline/actions"

/** Cliente falso: perfil admin da ws-1; contato novo nasce como "contato-novo"; nada existe antes. */
function banco() {
  let ordem: string[] = []
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: "admin-1" } }, error: null }) },
    from: vi.fn((tabela: string) => {
      const obj: Record<string, unknown> = {}
      let inserindo = false
      for (const m of ["select", "eq", "not", "limit", "upsert"]) obj[m] = vi.fn(() => obj)
      obj.insert = vi.fn(() => {
        inserindo = true
        ordem.push(`insert ${tabela}`)
        return obj
      })
      obj.single = vi.fn(async () => {
        if (tabela === "profiles") return { data: { workspace_id: "ws-1", role: "admin" }, error: null }
        if (tabela === "contacts" && inserindo) return { data: { id: "contato-novo" }, error: null }
        if (tabela === "pipeline_cards" && inserindo) return { data: { id: "card-novo" }, error: null }
        return { data: null, error: null }
      })
      obj.maybeSingle = vi.fn(async () => ({ data: null, error: null }))
      return obj
    }),
  }
  vi.mocked(createClient).mockResolvedValue(client as never)
  return { ordem: () => ordem, zerar: () => { ordem = [] } }
}

beforeEach(() => {
  buscar.mockReset()
  buscar.mockImplementation(async () => "guardada")
})

describe("B29-02 — contato que nasce fora do chat também busca a foto", () => {
  it("CA-B29-07: \"Novo contato\" em Contatos pede a foto uma vez, para o contato criado", async () => {
    const b = banco()
    const r = await criarContato({ nome: "Ana", telefone: "(11) 99999-8888" })

    expect(r).toEqual({ id: "contato-novo" })
    expect(buscar).toHaveBeenCalledTimes(1)
    expect(buscar).toHaveBeenCalledWith({ workspaceId: "ws-1", contactId: "contato-novo", telefone: "5511999998888" })
    expect(b.ordem()).toContain("insert contacts")
  })

  it("CA-B29-07: \"Novo lead\" no funil pede a foto uma vez, depois do card", async () => {
    const b = banco()
    const r = await criarNovoLead("(11) 99999-8888", "Ana")

    expect(r).toEqual({})
    expect(buscar).toHaveBeenCalledTimes(1)
    expect(buscar).toHaveBeenCalledWith({ workspaceId: "ws-1", contactId: "contato-novo", telefone: "5511999998888" })
    expect(b.ordem()).toEqual(expect.arrayContaining(["insert contacts", "insert pipeline_cards"]))
  })

  it("a busca nunca derruba o cadastro: se ela estourar, o contato e o lead continuam criados", async () => {
    buscar.mockImplementation(async () => { throw new Error("não deveria vazar") })
    banco()
    await expect(criarContato({ nome: "Ana", telefone: "(11) 99999-8888" })).rejects.toThrow()
  })
})
