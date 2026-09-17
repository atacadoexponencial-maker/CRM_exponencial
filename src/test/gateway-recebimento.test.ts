// Mensagem recebida pelo gateway virando contato, conversa e mensagem (B6-02).
// Banco e transmissão mockados: nada toca o Supabase.

import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/whatsapp/realtime", () => ({
  transmitirMensagem: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/automacoes", () => ({
  processarAutomacoes: vi.fn().mockResolvedValue(undefined),
}))

import { transmitirMensagem } from "@/lib/whatsapp/realtime"
import { processarAutomacoes } from "@/lib/automacoes"
import {
  identificadorDoContato,
  PREFIXO_LID,
  registrarMensagemRecebida,
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
  conversaAberta?: { id: string; unread_count: number } | null
  mensagemCitada?: { id: string } | null
}

/**
 * Supabase falso que registra o que foi escrito. Cada tabela devolve só os
 * métodos que o módulo usa — se ele chamar outra coisa, o teste quebra, o que é
 * o comportamento desejado.
 */
function supabaseFalso({ contato = null, conversaAberta = null, mensagemCitada = null }: Estado = {}) {
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
          limit: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: conversaAberta }),
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
              single: vi.fn().mockResolvedValue({ data: { id: "mensagem-nova" }, error: null }),
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

    expect(processarAutomacoes).toHaveBeenCalledWith({
      tipo: "conversa_criada",
      workspaceId: WORKSPACE,
      contactId: "contato-novo",
      conversationId: "conversa-nova",
    })
  })

  it("mensagem em conversa já aberta não dispara automação, igual à Meta hoje", async () => {
    const { supabase } = supabaseFalso({
      contato: { id: "contato-1" },
      conversaAberta: { id: "conversa-1", unread_count: 1 },
    })

    await registrarMensagemRecebida({ supabase, workspaceId: WORKSPACE, evento: TEXTO, recebidoEm: RECEBIDO_EM })

    expect(processarAutomacoes).not.toHaveBeenCalled()
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
