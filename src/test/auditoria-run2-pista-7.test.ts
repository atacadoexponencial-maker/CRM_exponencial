// Auditoria run-2, pista 7 (06/11/2026): o pedido da loja pública cria o contato com
// um telefone que ninguém conferiu (`origem = 'loja'`). Nenhuma automação manda
// mensagem a esse contato enquanto ele não escrever para a empresa, qualquer que seja
// o evento: o pedido dispara o card movido e a mudança de classificação.
// O envio de verdade roda sobre o banco falso; só o WhatsApp é simulado.

import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/whatsapp", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/whatsapp")>()),
  resolverProviderDaConversa: vi.fn(),
  resolverProviderDoContato: vi.fn(),
}))
vi.mock("@/lib/whatsapp/realtime", () => ({ transmitirMensagem: vi.fn().mockResolvedValue(undefined) }))

import { resolverProviderDaConversa, resolverProviderDoContato } from "@/lib/whatsapp"
import { executarAcao } from "@/lib/automacoes/acoes"
import type { GatilhoAutomacao } from "@/lib/automacoes/contexto"
import { MOTIVO_CONTATO_DA_LOJA } from "@/lib/automacoes/envio"
import type { AcaoTipo, BlocoAcao } from "@/lib/fluxo-automacao"
import { banco } from "./automacoes-banco-falso"

const cardMovido: GatilhoAutomacao = {
  tipo: "card_movido",
  workspaceId: "ws-1",
  contactId: "contato-1",
  cardId: "card-1",
  funil: "entrada",
  etapa: "lead",
}
// O mesmo pedido também muda a classificação do contato de "sem histórico" para "lead"
const classificacaoVirouLead: GatilhoAutomacao = {
  tipo: "dado_contato_alterado",
  workspaceId: "ws-1",
  contactId: "contato-1",
  campo: "classificacao",
  valor: "lead",
}

const acao = (tipo: AcaoTipo, parametros: Record<string, string>): BlocoAcao => ({
  id: "a",
  tipo: "acao",
  acao: tipo,
  parametros,
  posicao: { x: 0, y: 0 },
})
const enviarOi = acao("enviar_mensagem", { texto: "Oi" })

const DA_LOJA = { phone_number: "5511999998888", origem: "loja" }
// Os contatos com alguma forma do número (o da loja e, às vezes, o que escreveu sem o nove)
const FORMAS_DO_NUMERO = [{ id: "contato-1" }, { id: "contato-sem-o-nove" }]

let provider: { enviarTexto: ReturnType<typeof vi.fn>; enviarMidia: ReturnType<typeof vi.fn>; suporta: ReturnType<typeof vi.fn> }

beforeEach(() => {
  vi.clearAllMocks()
  provider = {
    enviarTexto: vi.fn().mockResolvedValue({ ok: true, mensagemId: "wamid-1" }),
    enviarMidia: vi.fn().mockResolvedValue({ ok: true, mensagemId: "wamid-2" }),
    suporta: vi.fn(() => true),
  }
  const comoProvider = provider as unknown as Awaited<ReturnType<typeof resolverProviderDaConversa>>
  vi.mocked(resolverProviderDaConversa).mockResolvedValue(comoProvider)
  vi.mocked(resolverProviderDoContato).mockResolvedValue(comoProvider)
})

describe("Auditoria run-2, pista 7 — contato que veio da loja", () => {
  it("card movido, sem conversa: a mensagem não sai e o motivo fica no histórico", async () => {
    const b = banco({ contacts: { um: DA_LOJA }, conversations: { lista: [], um: null } })

    expect(await executarAcao(b.contexto(cardMovido), enviarOi)).toEqual({ ok: false, motivo: MOTIVO_CONTATO_DA_LOJA })
    expect(provider.enviarTexto).not.toHaveBeenCalled()
    expect(b.gravacoes("messages")).toEqual([])
    // a origem é lida do contato, na empresa do evento
    expect(b.filtros("contacts")).toEqual(expect.arrayContaining([["id", "contato-1"], ["workspace_id", "ws-1"]]))
  })

  it("a classificação que virou lead, no mesmo pedido: a mensagem também não sai", async () => {
    const b = banco({ contacts: { um: DA_LOJA }, conversations: { lista: [], um: null } })

    expect(await executarAcao(b.contexto(classificacaoVirouLead), enviarOi)).toEqual({ ok: false, motivo: MOTIVO_CONTATO_DA_LOJA })
    expect(provider.enviarTexto).not.toHaveBeenCalled()
  })

  it("a mensagem rápida também para", async () => {
    const b = banco({ contacts: { um: DA_LOJA }, conversations: { lista: [], um: null }, quick_replies: { um: { content: "Oi" } } })

    expect(await executarAcao(b.contexto(cardMovido), acao("enviar_mensagem_rapida", { mensagem_rapida_id: "r-1" }))).toEqual({
      ok: false,
      motivo: MOTIVO_CONTATO_DA_LOJA,
    })
    expect(provider.enviarTexto).not.toHaveBeenCalled()
    expect(provider.enviarMidia).not.toHaveBeenCalled()
  })

  it("com conversa, mas sem mensagem recebida: a mensagem não sai", async () => {
    const b = banco({
      contacts: { um: DA_LOJA, lista: FORMAS_DO_NUMERO },
      conversations: { lista: [{ id: "conv-1" }], um: null },
      messages: { um: null },
    })

    expect(await executarAcao(b.contexto(cardMovido), enviarOi)).toEqual({ ok: false, motivo: MOTIVO_CONTATO_DA_LOJA })
    expect(provider.enviarTexto).not.toHaveBeenCalled()
  })

  it("depois que o contato escreveu para a empresa (mesmo pelo número sem o nove), a mensagem sai", async () => {
    const b = banco({
      contacts: { um: DA_LOJA, lista: FORMAS_DO_NUMERO },
      conversations: { lista: [{ id: "conv-1" }], um: null },
      messages: { um: { id: "recebida-1" } },
      whatsapp_connections: { um: { id: "conexao-1" } },
    })

    expect(await executarAcao(b.contexto(cardMovido), enviarOi)).toEqual({ ok: true })
    expect(provider.enviarTexto).toHaveBeenCalledWith("5511999998888", "Oi")
    // as duas formas do número, as conversas desses contatos, na empresa, e só as recebidas
    expect(b.chamadas).toContainEqual({ tabela: "contacts", metodo: "in", args: ["phone_number", ["5511999998888", "551199998888"]] })
    expect(b.chamadas).toContainEqual({ tabela: "conversations", metodo: "in", args: ["contact_id", ["contato-1", "contato-sem-o-nove"]] })
    expect(b.filtros("conversations")).toEqual(expect.arrayContaining([["workspace_id", "ws-1"]]))
    expect(b.filtros("messages")).toEqual(expect.arrayContaining([["workspace_id", "ws-1"], ["direction", "recebida"]]))
    expect(b.chamadas).toContainEqual({ tabela: "messages", metodo: "in", args: ["conversation_id", ["conv-1"]] })
  })

  it("contato que não veio da loja: a mensagem sai como antes, sem olhar as mensagens", async () => {
    const b = banco({
      contacts: { um: { phone_number: "5511999998888", origem: null } },
      conversations: { um: null },
      whatsapp_connections: { um: { id: "conexao-1" } },
    })

    expect(await executarAcao(b.contexto(cardMovido), enviarOi)).toEqual({ ok: true })
    expect(provider.enviarTexto).toHaveBeenCalledWith("5511999998888", "Oi")
    expect(b.chamadas.filter((c) => c.tabela === "messages" && c.metodo === "select")).toHaveLength(0)
  })
})
