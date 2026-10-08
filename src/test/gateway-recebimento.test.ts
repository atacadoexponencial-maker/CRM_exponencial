// Mensagem recebida pelo gateway virando contato, conversa e mensagem (B6-02).
// Banco e transmissão mockados: nada toca o Supabase.

import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/whatsapp/realtime", () => ({
  transmitirMensagem: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/automacoes/fila", () => ({
  dispararAutomacoes: vi.fn().mockResolvedValue(undefined),
}))

import { transmitirMensagem } from "@/lib/whatsapp/realtime"
import { dispararAutomacoes } from "@/lib/automacoes/fila"
import {
  identificadorDoContato,
  PREFIXO_LID,
  registrarMensagemRecebida,
  traduzirConteudo,
  traduzirTexto,
  type EventoMensagemRecebida,
} from "@/lib/whatsapp/recebimento"
import type { createServiceClient } from "@/integrations/supabase/service"

const WORKSPACE = "11111111-1111-1111-1111-111111111111"
const RECEBIDO_EM = "2026-09-17T14:32:07.412Z"

const TEXTO: EventoMensagemRecebida = {
  message_id: "3EB0C767D26B8F3A1B",
  from: "5511999998888",
  from_is_lid: false,
  type: "text",
  text: "Bom dia, tem no atacado?",
}

type Estado = {
  contato?: { id: string } | null
  conversaAberta?: { id: string; unread_count: number; whatsapp_connection_id?: string | null } | null
  mensagemCitada?: { id: string } | null
  /** B11-04: `false` faz o insert da mensagem falhar. */
  mensagemGravada?: boolean
}

/**
 * Supabase falso que registra o que foi escrito. Cada tabela devolve só os
 * métodos que o módulo usa — se ele chamar outra coisa, o teste quebra, o que é
 * o comportamento desejado.
 */
function supabaseFalso({ contato = null, conversaAberta = null, mensagemCitada = null, mensagemGravada = true }: Estado = {}) {
  const escritas: Array<{ tabela: string; operacao: string; linha: unknown }> = []

  function registra(tabela: string, operacao: string, linha: unknown) {
    escritas.push({ tabela, operacao, linha })
  }

  const client = {
    from: vi.fn((tabela: string) => {
      if (tabela === "contacts") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: contato }),
          insert: vi.fn((linha: unknown) => {
            registra("contacts", "insert", linha)
            return {
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: { id: "contato-novo" }, error: null }),
            }
          }),
        }
      }

      if (tabela === "conversations") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          // A busca da conversa aberta devolve LISTA: a escolha é por número
          // dono, e pode haver mais de uma caixa do mesmo contato.
          limit: vi.fn().mockResolvedValue({
            data: conversaAberta
              ? [{ whatsapp_connection_id: null, ...conversaAberta }]
              : [],
          }),
          update: vi.fn((linha: unknown) => {
            registra("conversations", "update", linha)
            return { eq: vi.fn().mockResolvedValue({ error: null }) }
          }),
          insert: vi.fn((linha: unknown) => {
            registra("conversations", "insert", linha)
            return {
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: { id: "conversa-nova" }, error: null }),
            }
          }),
        }
      }

      if (tabela === "messages") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: mensagemCitada }),
          insert: vi.fn((linha: unknown) => {
            registra("messages", "insert", linha)
            return {
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue(
                mensagemGravada
                  ? { data: { id: "mensagem-nova" }, error: null }
                  : { data: null, error: { code: "23505", message: "duplicate key" } }
              ),
            }
          }),
        }
      }

      throw new Error(`tabela inesperada no teste: ${tabela}`)
    }),
  }

  return { supabase: client as unknown as ReturnType<typeof createServiceClient>, escritas }
}

function escritaDe(escritas: Array<{ tabela: string; operacao: string; linha: unknown }>, tabela: string, operacao: string) {
  return escritas.find((e) => e.tabela === tabela && e.operacao === operacao)?.linha as
    | Record<string, unknown>
    | undefined
}

describe("contato e conversa", () => {
  beforeEach(() => vi.clearAllMocks())

  it("número desconhecido cria contato, abre conversa e grava a mensagem", async () => {
    const { supabase, escritas } = supabaseFalso()

    const resultado = await registrarMensagemRecebida({
      supabase,
      workspaceId: WORKSPACE,
      evento: TEXTO,
      recebidoEm: RECEBIDO_EM,
    })

    expect(escritaDe(escritas, "contacts", "insert")).toEqual({
      workspace_id: WORKSPACE,
      phone_number: "5511999998888",
    })
    expect(escritaDe(escritas, "conversations", "insert")).toMatchObject({
      workspace_id: WORKSPACE,
      contact_id: "contato-novo",
      status: "em_espera",
      unread_count: 1,
      last_message_text: TEXTO.text,
      last_message_at: RECEBIDO_EM,
    })
    expect(escritaDe(escritas, "messages", "insert")).toMatchObject({
      conversation_id: "conversa-nova",
      workspace_id: WORKSPACE,
      direction: "recebida",
      type: "texto",
      content: TEXTO.text,
      wamid: TEXTO.message_id,
      created_at: RECEBIDO_EM,
    })
    expect(resultado.conversaCriada).toBe(true)
  })

  it("contato conhecido com conversa aberta reusa a conversa e incrementa não lidas", async () => {
    const { supabase, escritas } = supabaseFalso({
      contato: { id: "contato-1" },
      conversaAberta: { id: "conversa-1", unread_count: 4 },
    })

    const resultado = await registrarMensagemRecebida({
      supabase,
      workspaceId: WORKSPACE,
      evento: TEXTO,
      recebidoEm: RECEBIDO_EM,
    })

    expect(escritaDe(escritas, "contacts", "insert")).toBeUndefined()
    expect(escritaDe(escritas, "conversations", "insert")).toBeUndefined()
    expect(escritaDe(escritas, "conversations", "update")).toEqual({
      last_message_text: TEXTO.text,
      last_message_at: RECEBIDO_EM,
      unread_count: 5,
      // Conversa sem dono e evento sem conexão: segue sem dono.
      whatsapp_connection_id: null,
    })
    expect(resultado.conversaCriada).toBe(false)
  })

  it("wamid do gateway grava na mesma coluna que a Meta usa", async () => {
    const { supabase, escritas } = supabaseFalso({ contato: { id: "c" }, conversaAberta: { id: "v", unread_count: 0 } })

    await registrarMensagemRecebida({ supabase, workspaceId: WORKSPACE, evento: TEXTO, recebidoEm: RECEBIDO_EM })

    expect(escritaDe(escritas, "messages", "insert")?.wamid).toBe(TEXTO.message_id)
  })
})

describe("automações", () => {
  beforeEach(() => vi.clearAllMocks())

  it("abrir conversa dispara conversa_criada", async () => {
    const { supabase } = supabaseFalso()

    await registrarMensagemRecebida({ supabase, workspaceId: WORKSPACE, evento: TEXTO, recebidoEm: RECEBIDO_EM })

    expect(dispararAutomacoes).toHaveBeenCalledWith({
      tipo: "conversa_criada",
      workspaceId: WORKSPACE,
      contactId: "contato-novo",
      conversationId: "conversa-nova",
    })
  })

  it("B11-04: mensagem em conversa já aberta não dispara conversa_criada, só mensagem_recebida", async () => {
    const { supabase } = supabaseFalso({
      contato: { id: "contato-1" },
      conversaAberta: { id: "conversa-1", unread_count: 1 },
    })

    await registrarMensagemRecebida({ supabase, workspaceId: WORKSPACE, evento: TEXTO, recebidoEm: RECEBIDO_EM })

    expect(dispararAutomacoes).toHaveBeenCalledTimes(1)
    expect(dispararAutomacoes).toHaveBeenCalledWith({
      tipo: "mensagem_recebida",
      workspaceId: WORKSPACE,
      contactId: "contato-1",
      conversationId: "conversa-1",
      messageId: "mensagem-nova",
      tipoMensagem: "texto",
      texto: TEXTO.text,
    })
  })

  it("B11-04: conversa nova: conversa_criada entra na fila antes, e mensagem_recebida depois de gravar", async () => {
    const { supabase, escritas } = supabaseFalso()
    const gravouAntesDoDisparo: boolean[] = []
    vi.mocked(dispararAutomacoes).mockImplementation(async (gatilho) => {
      if (gatilho.tipo === "mensagem_recebida") gravouAntesDoDisparo.push(Boolean(escritaDe(escritas, "messages", "insert")))
    })

    await registrarMensagemRecebida({ supabase, workspaceId: WORKSPACE, evento: TEXTO, recebidoEm: RECEBIDO_EM })
    vi.mocked(dispararAutomacoes).mockResolvedValue(undefined)

    expect(vi.mocked(dispararAutomacoes).mock.calls.map(([g]) => g.tipo)).toEqual(["conversa_criada", "mensagem_recebida"])
    expect(gravouAntesDoDisparo).toEqual([true])
  })

  it("B11-04: mensagem que não foi gravada (reentrega) não dispara mensagem_recebida", async () => {
    const { supabase } = supabaseFalso({
      contato: { id: "contato-1" },
      conversaAberta: { id: "conversa-1", unread_count: 1 },
      mensagemGravada: false,
    })

    await registrarMensagemRecebida({ supabase, workspaceId: WORKSPACE, evento: TEXTO, recebidoEm: RECEBIDO_EM })

    expect(dispararAutomacoes).not.toHaveBeenCalled()
  })

  describe("B11-04: o tipo e o texto que as regras leem", () => {
    const disparoDe = async (evento: EventoMensagemRecebida) => {
      const { supabase } = supabaseFalso({ contato: { id: "c" }, conversaAberta: { id: "v", unread_count: 0 } })
      await registrarMensagemRecebida({
        supabase,
        workspaceId: WORKSPACE,
        evento,
        recebidoEm: RECEBIDO_EM,
        conteudo: traduzirConteudo(evento, null),
      })
      return vi.mocked(dispararAutomacoes).mock.calls.at(-1)?.[0]
    }

    it("foto com legenda: tipo imagem, e a legenda como texto", async () => {
      expect(await disparoDe({ ...TEXTO, type: "image", text: "segue o catálogo" })).toMatchObject({
        tipoMensagem: "imagem",
        texto: "segue o catálogo",
      })
    })

    it("áudio sem legenda: texto vazio", async () => {
      expect(await disparoDe({ ...TEXTO, type: "voice", text: null })).toMatchObject({ tipoMensagem: "audio", texto: "" })
    })

    it("localização e cartão de contato: o texto montado pelo CRM não conta", async () => {
      expect(
        await disparoDe({ ...TEXTO, type: "location", text: null, location: { latitude: -23.5, longitude: -46.6, name: "Loja" } })
      ).toMatchObject({ tipoMensagem: "localizacao", texto: "" })
      expect(
        await disparoDe({ ...TEXTO, type: "contact", text: "x", contact: { display_name: "Ana", phones: ["5511"] } })
      ).toMatchObject({ tipoMensagem: "contato", texto: "" })
    })

    it("resposta citada (tipo fora do mapa, com texto) conta como texto", async () => {
      expect(await disparoDe({ ...TEXTO, type: "extendedText", text: "sim, esse" })).toMatchObject({
        tipoMensagem: "texto",
        texto: "sim, esse",
      })
    })
  })
})

describe("tempo real", () => {
  beforeEach(() => vi.clearAllMocks())

  it("transmite a mensagem no formato que a caixa de entrada já escuta", async () => {
    const { supabase } = supabaseFalso({ contato: { id: "c" }, conversaAberta: { id: "conversa-1", unread_count: 0 } })

    await registrarMensagemRecebida({ supabase, workspaceId: WORKSPACE, evento: TEXTO, recebidoEm: RECEBIDO_EM })

    expect(transmitirMensagem).toHaveBeenCalledWith({
      id: "mensagem-nova",
      conversation_id: "conversa-1",
      workspace_id: WORKSPACE,
      direction: "recebida",
      type: "texto",
      content: TEXTO.text,
      created_at: RECEBIDO_EM,
      status: null,
    })
  })
})

describe("LID: remetente sem telefone utilizável", () => {
  beforeEach(() => vi.clearAllMocks())

  it("não usa o LID como telefone", () => {
    expect(identificadorDoContato({ ...TEXTO, from: "217995729215510", from_is_lid: true })).toBe(
      `${PREFIXO_LID}217995729215510`
    )
    expect(identificadorDoContato(TEXTO)).toBe("5511999998888")
  })

  it("mensagem com LID é registrada, e o contato não fica com cara de telefone", async () => {
    const { supabase, escritas } = supabaseFalso()

    await registrarMensagemRecebida({
      supabase,
      workspaceId: WORKSPACE,
      evento: { ...TEXTO, from: "217995729215510", from_is_lid: true },
      recebidoEm: RECEBIDO_EM,
    })

    const contato = escritaDe(escritas, "contacts", "insert")
    expect(contato?.phone_number).toBe(`${PREFIXO_LID}217995729215510`)
    expect(String(contato?.phone_number)).not.toMatch(/^\d+$/)
    // A mensagem não se perde: é o ponto todo da regra.
    expect(escritaDe(escritas, "messages", "insert")?.content).toBe(TEXTO.text)
  })

  it("o mesmo LID cai sempre no mesmo contato", async () => {
    const { supabase, escritas } = supabaseFalso({ contato: { id: "contato-lid" } })

    await registrarMensagemRecebida({
      supabase,
      workspaceId: WORKSPACE,
      evento: { ...TEXTO, from: "217995729215510", from_is_lid: true },
      recebidoEm: RECEBIDO_EM,
    })

    expect(escritaDe(escritas, "contacts", "insert")).toBeUndefined()
  })
})

describe("resposta a outra mensagem", () => {
  beforeEach(() => vi.clearAllMocks())

  it("reply_to conhecido grava o vínculo e a prévia", async () => {
    const { supabase, escritas } = supabaseFalso({
      contato: { id: "c" },
      conversaAberta: { id: "v", unread_count: 0 },
      mensagemCitada: { id: "mensagem-citada" },
    })

    await registrarMensagemRecebida({
      supabase,
      workspaceId: WORKSPACE,
      evento: { ...TEXTO, reply_to: { message_id: "3EB0ANTERIOR", preview_text: "Tem sim" } },
      recebidoEm: RECEBIDO_EM,
    })

    expect(escritaDe(escritas, "messages", "insert")).toMatchObject({
      reply_to_id: "mensagem-citada",
      reply_preview_text: "Tem sim",
    })
  })

  it("mensagem citada que o CRM não tem guarda só a prévia, sem quebrar", async () => {
    const { supabase, escritas } = supabaseFalso({
      contato: { id: "c" },
      conversaAberta: { id: "v", unread_count: 0 },
      mensagemCitada: null,
    })

    await registrarMensagemRecebida({
      supabase,
      workspaceId: WORKSPACE,
      evento: { ...TEXTO, reply_to: { message_id: "desconhecida", preview_text: "Tem sim" } },
      recebidoEm: RECEBIDO_EM,
    })

    expect(escritaDe(escritas, "messages", "insert")).toMatchObject({
      reply_to_id: null,
      reply_preview_text: "Tem sim",
    })
  })
})

describe("tradução de texto", () => {
  it("texto ausente vira conteúdo vazio, não nulo: a coluna é not null", () => {
    expect(traduzirTexto({ ...TEXTO, text: null })).toEqual({ tipo: "texto", conteudo: "", previa: "" })
    expect(traduzirTexto(TEXTO)).toEqual({ tipo: "texto", conteudo: TEXTO.text, previa: TEXTO.text })
  })
})
