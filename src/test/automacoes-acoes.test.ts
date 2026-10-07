// Testes das ações da B11-11 no motor: tags, remover etiqueta, dado do contato e
// atribuir a um time. O banco é falso (`automacoes-banco-falso.ts`).

import { describe, it, expect, vi } from "vitest"

vi.mock("@/lib/whatsapp-envio", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/whatsapp-envio")>()),
  enviarTextoWhatsApp: vi.fn().mockResolvedValue(true),
}))

import { executarAcao } from "@/lib/automacoes/acoes"
import type { GatilhoAutomacao } from "@/lib/automacoes/contexto"
import type { AcaoTipo, BlocoAcao } from "@/lib/fluxo-automacao"
import { banco } from "./automacoes-banco-falso"

const conversaCriada: GatilhoAutomacao = {
  tipo: "conversa_criada",
  workspaceId: "ws-1",
  contactId: "contato-1",
  conversationId: "conv-1",
}

const cardMovido: GatilhoAutomacao = {
  tipo: "card_movido",
  workspaceId: "ws-1",
  contactId: "contato-1",
  cardId: "card-1",
  funil: "entrada",
  etapa: "sondagem",
}

const acao = (tipo: AcaoTipo, parametros: Record<string, string>): BlocoAcao => ({
  id: "a",
  tipo: "acao",
  acao: tipo,
  parametros,
  posicao: { x: 0, y: 0 },
})

describe("adicionar e remover tag", () => {
  it("adiciona a tag normalizada no contato da empresa", async () => {
    const b = banco({})
    const ok = await executarAcao(b.contexto(conversaCriada), acao("adicionar_tag", { tag: "  VIP " }))

    expect(ok).toBe(true)
    expect(b.gravacoes("contact_tags")[0].args[0]).toEqual({ contact_id: "contato-1", workspace_id: "ws-1", tag: "vip" })
  })

  it("tag que o contato já tem conta como feita", async () => {
    const b = banco({ contact_tags: { erro: { code: "23505" } } })
    expect(await executarAcao(b.contexto(conversaCriada), acao("adicionar_tag", { tag: "vip" }))).toBe(true)
  })

  it("tag com espaço não é gravada", async () => {
    const b = banco({})
    expect(await executarAcao(b.contexto(conversaCriada), acao("adicionar_tag", { tag: "cliente vip" }))).toBe(false)
    expect(b.gravacoes("contact_tags")).toEqual([])
  })

  it("remove a tag do contato, só na empresa dele", async () => {
    const b = banco({})
    const ok = await executarAcao(b.contexto(conversaCriada), acao("remover_tag", { tag: "VIP" }))

    expect(ok).toBe(true)
    expect(b.gravacoes("contact_tags")[0].metodo).toBe("delete")
    expect(b.filtros("contact_tags")).toEqual([
      ["contact_id", "contato-1"],
      ["workspace_id", "ws-1"],
      ["tag", "vip"],
    ])
  })
})

describe("remover etiqueta", () => {
  it("tira a etiqueta da conversa do evento", async () => {
    const b = banco({})
    const ok = await executarAcao(b.contexto(conversaCriada), acao("remover_etiqueta", { label_id: "label-1" }))

    expect(ok).toBe(true)
    expect(b.gravacoes("conversation_labels")[0].metodo).toBe("delete")
    expect(b.filtros("conversation_labels")).toEqual([
      ["conversation_id", "conv-1"],
      ["label_id", "label-1"],
    ])
  })

  it("sem conversa aberta, falha", async () => {
    const b = banco({ conversations: { um: null } })
    expect(await executarAcao(b.contexto(cardMovido), acao("remover_etiqueta", { label_id: "label-1" }))).toBe(false)
  })
})

describe("alterar dado do contato", () => {
  it("troca o tipo", async () => {
    const b = banco({})
    const ok = await executarAcao(b.contexto(conversaCriada), acao("alterar_dado_contato", { campo: "tipo", valor: "lojista" }))

    expect(ok).toBe(true)
    expect(b.gravacoes("contacts")[0].args[0]).toEqual({ tipo: "lojista" })
    expect(b.filtros("contacts")).toEqual([
      ["id", "contato-1"],
      ["workspace_id", "ws-1"],
    ])
  })

  it("acrescenta uma linha às observações", async () => {
    const b = banco({ contacts: { um: { observacoes: "Cliente desde 2024\n" } } })
    await executarAcao(b.contexto(conversaCriada), acao("alterar_dado_contato", { campo: "observacoes", valor: "Entrou em sondagem" }))

    expect(b.gravacoes("contacts")[0].args[0]).toEqual({ observacoes: "Cliente desde 2024\nEntrou em sondagem" })
  })

  it("observações vazias recebem a linha como texto inteiro", async () => {
    const b = banco({ contacts: { um: { observacoes: null } } })
    await executarAcao(b.contexto(conversaCriada), acao("alterar_dado_contato", { campo: "observacoes", valor: "Primeira nota" }))

    expect(b.gravacoes("contacts")[0].args[0]).toEqual({ observacoes: "Primeira nota" })
  })

  it("classificação e tipo inventado não são gravados", async () => {
    const b = banco({})
    const contexto = b.contexto(conversaCriada)

    expect(await executarAcao(contexto, acao("alterar_dado_contato", { campo: "classificacao", valor: "ativo" }))).toBe(false)
    expect(await executarAcao(contexto, acao("alterar_dado_contato", { campo: "tipo", valor: "atacadista" }))).toBe(false)
    expect(b.gravacoes("contacts")).toEqual([])
  })
})

describe("atribuir a um time", () => {
  const time = {
    user_teams: { lista: [{ user_id: "bruno" }, { user_id: "ana" }, { user_id: "carla" }] },
    profiles: {
      lista: [
        { id: "bruno", name: "Bruno" },
        { id: "ana", name: "Ana" },
        { id: "carla", name: "Carla" },
      ],
    },
  }

  it("escolhe o membro com menos conversas abertas e passa a conversa e o card para ele", async () => {
    const b = banco({
      ...time,
      // Bruno com 2 abertas, Ana com 1, Carla com nenhuma
      conversations: { lista: [{ assigned_to: "bruno" }, { assigned_to: "bruno" }, { assigned_to: "ana" }], um: { id: "conv-9" } },
    })
    const ok = await executarAcao(b.contexto(cardMovido), acao("atribuir_time", { time_id: "time-1" }))

    expect(ok).toBe(true)
    expect(b.gravacoes("conversations")[0].args[0]).toEqual({ assigned_to: "carla" })
    expect(b.gravacoes("pipeline_cards")[0].args[0]).toEqual({ atendente_id: "carla" })
  })

  it("no empate, fica com o primeiro pelo nome", async () => {
    const b = banco({ ...time, conversations: { lista: [] } })
    await executarAcao(b.contexto(conversaCriada), acao("atribuir_time", { time_id: "time-1" }))

    expect(b.gravacoes("conversations")[0].args[0]).toEqual({ assigned_to: "ana" })
  })

  it("só conta conversas abertas dos membros, na empresa do evento", async () => {
    const b = banco({ ...time, conversations: { lista: [] } })
    await executarAcao(b.contexto(conversaCriada), acao("atribuir_time", { time_id: "time-1" }))

    const filtrosEmIn = b.chamadas.filter((c) => c.tabela === "conversations" && c.metodo === "in").map((c) => c.args)
    expect(filtrosEmIn).toContainEqual(["status", ["em_espera", "em_atendimento"]])
    expect(b.filtros("profiles")).toEqual([
      ["workspace_id", "ws-1"],
      ["status", "active"],
    ])
  })

  it("time sem membro ativo falha e não grava nada", async () => {
    const b = banco({ user_teams: { lista: [{ user_id: "bruno" }] }, profiles: { lista: [] } })
    expect(await executarAcao(b.contexto(conversaCriada), acao("atribuir_time", { time_id: "time-1" }))).toBe(false)
    expect(b.gravacoes("conversations")).toEqual([])
  })
})
