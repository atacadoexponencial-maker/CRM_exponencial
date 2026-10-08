// O webhook da API Oficial disparando "mensagem recebida" (B11-04): depois de a
// mensagem ser gravada, com o tipo que a Meta mandou, e nunca para reação.
// Banco, fila e transmissão simulados: nada toca o Supabase.

import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/integrations/supabase/service", () => ({ createServiceClient: vi.fn() }))
vi.mock("@/lib/automacoes/fila", () => ({ dispararAutomacoes: vi.fn().mockResolvedValue(undefined) }))
vi.mock("@/lib/whatsapp/realtime", () => ({ transmitirMensagem: vi.fn().mockResolvedValue(undefined) }))
vi.mock("@/lib/lixeira", () => ({ tirarDaLixeira: vi.fn().mockResolvedValue(undefined) }))

import { createServiceClient } from "@/integrations/supabase/service"
import { dispararAutomacoes } from "@/lib/automacoes/fila"
import { POST } from "@/app/api/webhooks/whatsapp/route"

type Resposta = { data: unknown; error?: unknown }

/**
 * Cada tabela devolve a mesma resposta para o que for consultado nela; as
 * gravações ficam registradas na ordem. Em `conversations`, a busca das
 * abertas (aguardada depois do `limit`) devolve `abertas`, e o insert da
 * conversa nova devolve `{ id: "conversa-nova" }`.
 */
function bancoFalso({
  abertas = [] as Array<{ id: string; unread_count: number; whatsapp_connection_id: string | null }>,
  mensagemGravada = true,
} = {}) {
  const gravacoes: string[] = []
  const from = vi.fn((tabela: string) => {
    const respostas: Record<string, Resposta> = {
      whatsapp_connections: { data: { id: "conexao-1", workspace_id: "ws-1" } },
      contacts: { data: { id: "contato-1", excluido_em: null } },
      conversations: { data: { id: "conversa-nova" } },
      messages: mensagemGravada ? { data: { id: "msg-1" } } : { data: null, error: { code: "23505" } },
    }
    const resposta = respostas[tabela] ?? { data: null }
    const obj: Record<string, unknown> = {}
    for (const m of ["select", "eq", "in", "order"]) obj[m] = vi.fn(() => obj)
    for (const m of ["insert", "update"]) {
      obj[m] = vi.fn(() => {
        gravacoes.push(`${m} ${tabela}`)
        return obj
      })
    }
    obj.limit = vi.fn(() => ({ then: (r: (v: Resposta) => void) => Promise.resolve({ data: abertas }).then(r) }))
    obj.single = vi.fn(() => Promise.resolve(resposta))
    obj.then = (r: (v: Resposta) => void) => Promise.resolve({ data: null, error: null }).then(r)
    return obj
  })
  vi.mocked(createServiceClient).mockReturnValue({ from } as unknown as ReturnType<typeof createServiceClient>)
  return { gravacoes }
}

function requisicao(mensagem: Record<string, unknown>) {
  const corpo = {
    entry: [
      {
        changes: [
          {
            value: {
              metadata: { phone_number_id: "pn-1" },
              messages: [{ from: "5511999998888", id: "wamid.1", timestamp: "1760000000", ...mensagem }],
            },
          },
        ],
      },
    ],
  }
  return new NextRequest("http://localhost/api/webhooks/whatsapp", { method: "POST", body: JSON.stringify(corpo) })
}

const ABERTA = { id: "conversa-1", unread_count: 0, whatsapp_connection_id: "conexao-1" }

describe("B11-04 — mensagem recebida pela API Oficial", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Sem o segredo da Meta, o webhook não confere a assinatura
    delete process.env.META_APP_SECRET
  })

  it("texto em conversa aberta dispara mensagem_recebida, depois de gravar", async () => {
    const { gravacoes } = bancoFalso({ abertas: [ABERTA] })
    let gravouAntes = false
    vi.mocked(dispararAutomacoes).mockImplementationOnce(async () => {
      gravouAntes = gravacoes.includes("insert messages")
    })

    const resposta = await POST(requisicao({ type: "text", text: { body: "Quero o CATÁLOGO" } }))

    expect(resposta.status).toBe(200)
    expect(dispararAutomacoes).toHaveBeenCalledTimes(1)
    expect(dispararAutomacoes).toHaveBeenCalledWith({
      tipo: "mensagem_recebida",
      workspaceId: "ws-1",
      contactId: "contato-1",
      conversationId: "conversa-1",
      messageId: "msg-1",
      tipoMensagem: "texto",
      texto: "Quero o CATÁLOGO",
    })
    expect(gravouAntes).toBe(true)
  })

  it("conversa nova: conversa_criada primeiro, mensagem_recebida depois", async () => {
    bancoFalso()

    await POST(requisicao({ type: "text", text: { body: "oi" } }))

    expect(vi.mocked(dispararAutomacoes).mock.calls.map(([g]) => g.tipo)).toEqual(["conversa_criada", "mensagem_recebida"])
    expect(vi.mocked(dispararAutomacoes).mock.calls[1][0]).toMatchObject({ conversationId: "conversa-nova" })
  })

  it("foto: as regras veem o tipo imagem, mesmo com o webhook gravando como texto", async () => {
    bancoFalso({ abertas: [ABERTA] })

    await POST(requisicao({ type: "image", image: { id: "media-1" } }))

    expect(dispararAutomacoes).toHaveBeenCalledWith(expect.objectContaining({ tipoMensagem: "imagem", texto: "" }))
  })

  it("reação não dispara, e continua sendo gravada como hoje", async () => {
    const { gravacoes } = bancoFalso({ abertas: [ABERTA] })

    await POST(requisicao({ type: "reaction", reaction: { message_id: "wamid.0", emoji: "👍" } }))

    expect(gravacoes).toContain("insert messages")
    expect(dispararAutomacoes).not.toHaveBeenCalled()
  })

  it("mensagem que não foi gravada (reentrega da Meta) não dispara", async () => {
    bancoFalso({ abertas: [ABERTA], mensagemGravada: false })

    await POST(requisicao({ type: "text", text: { body: "Quero o catálogo" } }))

    expect(dispararAutomacoes).not.toHaveBeenCalled()
  })
})
