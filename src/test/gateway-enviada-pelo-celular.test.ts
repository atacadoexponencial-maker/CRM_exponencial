// Mensagem que o vendedor mandou pelo celular entrando na conversa do CRM (B25-02).
// Banco e transmissão mockados: nada toca o Supabase.

import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/whatsapp/realtime", () => ({
  transmitirMensagem: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/automacoes/fila", () => ({
  dispararAutomacoes: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/whatsapp/midia-recebida", () => ({
  guardarMidiaRecebida: vi.fn().mockResolvedValue({
    url: "https://storage.exemplo/foto.jpg",
    mimeType: "image/jpeg",
    filename: null,
  }),
}))

import { transmitirMensagem } from "@/lib/whatsapp/realtime"
import { dispararAutomacoes } from "@/lib/automacoes/fila"
import {
  registrarEnviadaPeloCelular,
  type EventoMensagemEnviadaPeloCelular,
} from "@/lib/whatsapp/enviada-pelo-celular"
import type { createServiceClient } from "@/integrations/supabase/service"

const WORKSPACE = "11111111-1111-1111-1111-111111111111"
const CONEXAO = "conexao-1"
const ENVIADA_EM = "2026-10-19T14:32:07.412Z"

const TEXTO: EventoMensagemEnviadaPeloCelular = {
  message_id: "3EB0CELULAR",
  from: "5511955020972",
  to: "5511999998888",
  to_is_lid: false,
  type: "text",
  text: "Tem sim, segue a tabela",
}

type Conversa = {
  id: string
  status: string
  assigned_to?: string | null
  unread_count: number
  whatsapp_connection_id?: string | null
}

type Estado = {
  contato?: { id: string; name?: string | null; excluido_em?: string | null } | null
  conversas?: Conversa[]
  mensagemCitada?: { id: string } | null
  /** `false` faz o insert da mensagem esbarrar no wamid único. */
  mensagemGravada?: boolean
}

/**
 * Supabase falso que registra o que foi escrito. Tabela que o módulo não deveria
 * tocar (cards, por exemplo) quebra o teste.
 */
function supabaseFalso({ contato = null, conversas = [], mensagemCitada = null, mensagemGravada = true }: Estado = {}) {
  const escritas: Array<{ tabela: string; operacao: string; linha: unknown; id?: unknown }> = []

  const client = {
    from: vi.fn((tabela: string) => {
      if (tabela === "contacts") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: contato }),
          update: vi.fn((linha: unknown) => {
            escritas.push({ tabela, operacao: "update", linha })
            return { eq: vi.fn().mockResolvedValue({ error: null }) }
          }),
          insert: vi.fn((linha: unknown) => {
            escritas.push({ tabela, operacao: "insert", linha })
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
          limit: vi.fn().mockResolvedValue({
            data: conversas.map((c) => ({ assigned_to: null, whatsapp_connection_id: CONEXAO, ...c })),
          }),
          update: vi.fn((linha: unknown) => {
            const registro: { tabela: string; operacao: string; linha: unknown; id?: unknown } = {
              tabela,
              operacao: "update",
              linha,
            }
            escritas.push(registro)
            return {
              eq: vi.fn((_coluna: string, id: unknown) => {
                registro.id = id
                return Promise.resolve({ error: null })
              }),
            }
          }),
          insert: vi.fn((linha: unknown) => {
            escritas.push({ tabela, operacao: "insert", linha })
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
            escritas.push({ tabela, operacao: "insert", linha })
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

function registrar(supabase: ReturnType<typeof createServiceClient>, evento = TEXTO) {
  return registrarEnviadaPeloCelular({
    supabase,
    workspaceId: WORKSPACE,
    evento,
    enviadaEm: ENVIADA_EM,
    connectionId: CONEXAO,
  })
}

describe("B25-02 — mensagem enviada pelo celular na conversa", () => {
  beforeEach(() => vi.clearAllMocks())

  it("CA-B25-05: o mesmo aviso gravado de novo não vira segunda mensagem nem segunda transmissão", async () => {
    const conversas = [{ id: "conversa-1", status: "em_atendimento", unread_count: 0 }]

    const primeira = supabaseFalso({ contato: { id: "contato-1" }, conversas })
    await registrar(primeira.supabase)

    // Reentrega de tentativa que morreu no meio: o wamid já está gravado.
    const segunda = supabaseFalso({ contato: { id: "contato-1" }, conversas, mensagemGravada: false })
    const resultado = await registrar(segunda.supabase)

    expect(resultado.messageId).toBeNull()
    expect(transmitirMensagem).toHaveBeenCalledTimes(1)
  })

  it("CA-B25-06: entra na conversa como enviada pela empresa, marcada do celular, sem atendente, e vira a prévia", async () => {
    const { supabase, escritas } = supabaseFalso({
      contato: { id: "contato-1", name: "Cliente" },
      conversas: [{ id: "conversa-1", status: "em_atendimento", assigned_to: "atendente-1", unread_count: 0 }],
    })

    const resultado = await registrar(supabase)

    const mensagem = escritaDe(escritas, "messages", "insert")
    expect(mensagem).toMatchObject({
      conversation_id: "conversa-1",
      workspace_id: WORKSPACE,
      direction: "enviada",
      type: "texto",
      content: TEXTO.text,
      sent_from_phone: true,
      wamid: TEXTO.message_id,
      created_at: ENVIADA_EM,
    })
    // A tabela de mensagens não tem autor: nenhum atendente é atribuído a ela.
    expect(Object.keys(mensagem!)).not.toContain("sender_id")
    expect(escritaDe(escritas, "conversations", "update")).toMatchObject({
      last_message_text: TEXTO.text,
      last_message_at: ENVIADA_EM,
    })
    expect(resultado.conversationId).toBe("conversa-1")
  })

  it("CA-B25-07: a mensagem vai para a tela pelo mesmo caminho em tempo real das recebidas", async () => {
    const { supabase } = supabaseFalso({
      contato: { id: "contato-1" },
      conversas: [{ id: "conversa-1", status: "em_atendimento", unread_count: 0 }],
    })

    await registrar(supabase)

    expect(transmitirMensagem).toHaveBeenCalledWith({
      id: "mensagem-nova",
      conversation_id: "conversa-1",
      workspace_id: WORKSPACE,
      direction: "enviada",
      type: "texto",
      content: TEXTO.text,
      created_at: ENVIADA_EM,
      status: "enviado",
      sent_from_phone: true,
    })
  })

  it("CA-B25-08: telefone desconhecido cria contato sem nome e conversa com a mensagem, sem card nem automação", async () => {
    const { supabase, escritas } = supabaseFalso()

    const resultado = await registrar(supabase)

    expect(escritaDe(escritas, "contacts", "insert")).toEqual({
      workspace_id: WORKSPACE,
      phone_number: TEXTO.to,
      name: null,
    })
    expect(escritaDe(escritas, "conversations", "insert")).toMatchObject({
      workspace_id: WORKSPACE,
      contact_id: "contato-novo",
      status: "em_espera",
      assigned_to: null,
      unread_count: 0,
      last_message_text: TEXTO.text,
      whatsapp_connection_id: CONEXAO,
    })
    expect(escritaDe(escritas, "messages", "insert")).toMatchObject({ conversation_id: "conversa-nova" })
    expect(resultado.conversaCriada).toBe(true)
    // Card nasceria em outra tabela, que o Supabase falso recusa; e nenhuma
    // automação (que poderia criar card) foi disparada.
    expect(escritas.every((e) => ["contacts", "conversations", "messages"].includes(e.tabela))).toBe(true)
    expect(dispararAutomacoes).not.toHaveBeenCalled()
  })

  it("CA-B25-09: conversa resolvida volta a ficar em atendimento, com a mensagem dentro, sem abrir outra", async () => {
    const { supabase, escritas } = supabaseFalso({
      contato: { id: "contato-1" },
      conversas: [{ id: "conversa-resolvida", status: "resolvida", assigned_to: "atendente-1", unread_count: 0 }],
    })

    const resultado = await registrar(supabase)

    const atualizacao = escritas.find((e) => e.tabela === "conversations" && e.operacao === "update")
    expect(atualizacao?.id).toBe("conversa-resolvida")
    expect(atualizacao?.linha).toMatchObject({ status: "em_atendimento", last_message_text: TEXTO.text })
    expect(escritaDe(escritas, "conversations", "insert")).toBeUndefined()
    expect(escritaDe(escritas, "messages", "insert")).toMatchObject({ conversation_id: "conversa-resolvida" })
    expect(resultado.conversaReaberta).toBe(true)
  })

  it("CA-B25-10: resposta citando mensagem do contato grava a citação da original", async () => {
    const { supabase, escritas } = supabaseFalso({
      contato: { id: "contato-1" },
      conversas: [{ id: "conversa-1", status: "em_atendimento", unread_count: 0 }],
      mensagemCitada: { id: "mensagem-do-contato" },
    })

    await registrar(supabase, {
      ...TEXTO,
      reply_to: { message_id: "3EB0DOCONTATO", preview_text: "Tem no atacado?" },
    })

    expect(escritaDe(escritas, "messages", "insert")).toMatchObject({
      reply_to_id: "mensagem-do-contato",
      reply_preview_text: "Tem no atacado?",
    })
  })

  it("CA-B25-11: enviar pelo celular não soma não lidas", async () => {
    const { supabase, escritas } = supabaseFalso({
      contato: { id: "contato-1" },
      conversas: [{ id: "conversa-1", status: "em_atendimento", unread_count: 3 }],
    })

    await registrar(supabase)

    const atualizacao = escritaDe(escritas, "conversations", "update")
    expect(atualizacao).toBeDefined()
    // Sem unread_count na atualização: as 3 não lidas ficam como estão.
    expect(atualizacao).not.toHaveProperty("unread_count")
  })
})
