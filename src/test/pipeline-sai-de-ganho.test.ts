// QA M2 (06/10/2026, decisão dela em 20/10) — card da Entrada que sai de Ganho desfaz
// a venda: o card da Recompra que nasceu dela é apagado, no CRM e pela automação.
// Clientes do banco falsos; registram o que foi pedido.

import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/automacoes/fila", () => ({ dispararAutomacoes: vi.fn() }))
vi.mock("@/lib/whatsapp-envio", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/whatsapp-envio")>()),
  enviarWhatsAppComMotivo: vi.fn().mockResolvedValue({ ok: true }),
}))
vi.mock("@/lib/automacoes/gatilhos-do-crm", () => ({
  cardsDepoisDoMovimento: vi.fn(),
  prepararGatilhoDeClassificacao: vi.fn(async () => async () => {}),
}))
vi.mock("@/integrations/supabase/server", () => ({ createClient: vi.fn() }))
vi.mock("@/integrations/supabase/service", () => ({ createServiceClient: vi.fn() }))

import { createClient } from "@/integrations/supabase/server"
import { createServiceClient } from "@/integrations/supabase/service"
import { moverCard } from "@/app/(auth)/pipeline/actions"
import { executarAcao } from "@/lib/automacoes/acoes"
import type { GatilhoAutomacao } from "@/lib/automacoes/contexto"
import { banco } from "./automacoes-banco-falso"

type Chamada = { tabela: string; metodo: string; args: unknown[] }

/** Cliente falso: `single` devolve o card; `update`/`delete` ficam registrados. */
function cliente(card: Record<string, unknown> | null) {
  const chamadas: Chamada[] = []
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: "gerente-1" } }, error: null }) },
    from: vi.fn((tabela: string) => {
      const obj: Record<string, unknown> = {}
      let atualizando = false
      for (const m of ["select", "eq"]) obj[m] = vi.fn((...args: unknown[]) => { chamadas.push({ tabela, metodo: m, args }); return obj })
      for (const m of ["update", "delete", "insert"]) {
        obj[m] = vi.fn((...args: unknown[]) => {
          chamadas.push({ tabela, metodo: m, args })
          if (m === "update") atualizando = true
          return obj
        })
      }
      obj.single = vi.fn(async () => ({ data: card, error: null }))
      obj.maybeSingle = vi.fn(async () => ({ data: atualizando ? { id: "card-1" } : null, error: null }))
      obj.then = (resolve: (v: unknown) => void) => Promise.resolve({ data: null, error: null }).then(resolve)
      return obj
    }),
  }
  return { client, chamadas }
}

beforeEach(() => vi.clearAllMocks())

describe("QA M2 — sair de Ganho apaga o card da Recompra", () => {
  it("CRM: card em Ganho movido para Perdido apaga o card da Recompra do contato", async () => {
    const usuario = cliente({ etapa: "ganho", contact_id: "contato-1", workspace_id: "ws-1", funil: "entrada", atendente_id: null })
    const servico = cliente(null)
    vi.mocked(createClient).mockResolvedValue(usuario.client as never)
    vi.mocked(createServiceClient).mockReturnValue(servico.client as never)

    await moverCard("card-1", "perdido")

    const apagou = servico.chamadas.find((c) => c.tabela === "pipeline_cards" && c.metodo === "delete")
    expect(apagou).toBeTruthy()
    const filtros = servico.chamadas.filter((c) => c.tabela === "pipeline_cards" && c.metodo === "eq").map((c) => c.args)
    expect(filtros).toContainEqual(["funil", "recompra"])
    expect(filtros).toContainEqual(["contact_id", "contato-1"])
  })

  it("CRM: card que não estava em Ganho não apaga nada", async () => {
    const usuario = cliente({ etapa: "negociacao", contact_id: "contato-1", workspace_id: "ws-1", funil: "entrada", atendente_id: null })
    const servico = cliente(null)
    vi.mocked(createClient).mockResolvedValue(usuario.client as never)
    vi.mocked(createServiceClient).mockReturnValue(servico.client as never)

    await moverCard("card-1", "perdido")
    expect(servico.chamadas.some((c) => c.metodo === "delete")).toBe(false)
  })

  it("automação: mover de Ganho para Perdido apaga o card da Recompra", async () => {
    const gatilho: GatilhoAutomacao = { tipo: "tag_adicionada", workspaceId: "ws-1", contactId: "contato-1", tag: "cancelou" }
    const b = banco({ pipeline_cards: { umEmOrdem: [{ id: "card-1", etapa: "ganho", atendente_id: null }] } })
    const r = await executarAcao(b.contexto(gatilho), {
      id: "a", tipo: "acao", acao: "mover_card", parametros: { funil: "entrada", etapa: "perdido" }, posicao: { x: 0, y: 0 },
    })
    expect(r).toEqual({ ok: true })
    expect(b.gravacoes("pipeline_cards").map((g) => g.metodo)).toEqual(["update", "delete"])
    expect(b.filtros("pipeline_cards")).toContainEqual(["funil", "recompra"])
  })
})
