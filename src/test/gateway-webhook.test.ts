// Porta de entrada dos eventos do gateway (B6-01): assinatura, idempotência e
// despacho. Service client mockado — nada toca o banco.

import { describe, it, expect, vi, beforeEach } from "vitest"
import { createHmac } from "node:crypto"

vi.mock("@/integrations/supabase/service", () => ({
  createServiceClient: vi.fn(),
}))

// O conteúdo do evento é da B6-02 em diante e tem teste próprio
// (gateway-recebimento.test.ts). Aqui interessa a porta: assinatura,
// idempotência e despacho.
vi.mock("@/lib/whatsapp/recebimento", () => ({
  receberMensagem: vi.fn().mockResolvedValue({
    tratamento: "mensagem",
    contactId: "c",
    conversationId: "v",
    messageId: "m",
    conversaCriada: false,
  }),
}))

import { createServiceClient } from "@/integrations/supabase/service"
import { POST } from "@/app/api/webhooks/gateway/route"
import { assinaturaHmacValida } from "@/lib/webhooks/assinatura"

const mockCreateServiceClient = vi.mocked(createServiceClient)

const SEGREDO = "s".repeat(64)
const INSTANCIA = "inst_01HZX8P7A3"
const WORKSPACE = "11111111-1111-1111-1111-111111111111"

function envelope(extra: Record<string, unknown> = {}) {
  return {
    event_id: "evt_01HZX9M4K2QWERTY",
    type: "message.received",
    instance_id: INSTANCIA,
    timestamp: "2026-09-17T14:32:07.412Z",
    data: { message_id: "3EB0", from: "5511999998888", from_is_lid: false, type: "text", text: "oi" },
    ...extra,
  }
}

function assinar(corpo: string, segredo = SEGREDO) {
  return "sha256=" + createHmac("sha256", segredo).update(corpo).digest("hex")
}

/** Requisição com corpo bruto, como o gateway envia. */
function pedido(corpo: unknown, assinatura?: string | null) {
  const bruto = typeof corpo === "string" ? corpo : JSON.stringify(corpo)
  const headers = new Headers()
  if (assinatura !== null) headers.set("x-gateway-signature-256", assinatura ?? assinar(bruto))
  return new Request("https://crm.exemplo/api/webhooks/gateway", {
    method: "POST",
    headers,
    body: bruto,
  }) as unknown as Parameters<typeof POST>[0]
}

/**
 * Supabase falso. `conexao` null simula instância desconhecida; `jaProcessado`
 * simula event_id que já chegou e terminou.
 */
function supabaseFalso({
  conexao = { id: "conn-1", workspace_id: WORKSPACE } as { id: string; workspace_id: string } | null,
  registroNovo = true,
  jaProcessado = false,
}: {
  conexao?: { id: string; workspace_id: string } | null
  registroNovo?: boolean
  jaProcessado?: boolean
} = {}) {
  const upserts: unknown[] = []
  const updates: unknown[] = []

  const client = {
    from: vi.fn((tabela: string) => {
      if (tabela === "whatsapp_connections") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi
            .fn()
            .mockResolvedValue({ data: conexao && { ...conexao, instance_token: "tok" } }),
        }
      }
      if (tabela === "gateway_events") {
        return {
          upsert: vi.fn((linha: unknown) => {
            upserts.push(linha)
            return {
              select: vi.fn().mockReturnThis(),
              maybeSingle: vi
                .fn()
                .mockResolvedValue({ data: registroNovo ? { event_id: "evt" } : null }),
            }
          }),
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { processed_at: jaProcessado ? "2026-09-17T14:00:00Z" : null },
          }),
          update: vi.fn((linha: unknown) => {
            updates.push(linha)
            return { eq: vi.fn().mockResolvedValue({ error: null }) }
          }),
        }
      }
      throw new Error(`tabela inesperada no teste: ${tabela}`)
    }),
  }

  mockCreateServiceClient.mockReturnValue(client as unknown as ReturnType<typeof createServiceClient>)
  return { upserts, updates, client }
}

describe("assinatura do webhook do gateway", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv("GATEWAY_WEBHOOK_SECRET", SEGREDO)
  })

  it("assinatura correta responde 2xx", async () => {
    supabaseFalso()

    const resposta = await POST(pedido(envelope()))

    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toEqual({ status: "ok" })
  })

  it("assinatura errada responde 401 e não escreve nada", async () => {
    const { client } = supabaseFalso()

    const resposta = await POST(pedido(envelope(), assinar("outro corpo")))

    expect(resposta.status).toBe(401)
    expect(client.from).not.toHaveBeenCalled()
  })

  it("assinatura ausente responde 401", async () => {
    supabaseFalso()

    const resposta = await POST(pedido(envelope(), null))

    expect(resposta.status).toBe(401)
  })

  it("segredo não configurado é recusa, não liberação", async () => {
    vi.stubEnv("GATEWAY_WEBHOOK_SECRET", "")
    const { client } = supabaseFalso()

    const resposta = await POST(pedido(envelope()))

    expect(resposta.status).toBe(401)
    expect(client.from).not.toHaveBeenCalled()
  })

  it("assinatura de segredo diferente é recusada", async () => {
    supabaseFalso()
    const corpo = JSON.stringify(envelope())

    const resposta = await POST(pedido(corpo, assinar(corpo, "outro-segredo")))

    expect(resposta.status).toBe(401)
  })

  it("a conferência é sobre o corpo bruto: um byte a mais invalida", async () => {
    const corpo = JSON.stringify(envelope())
    const assinatura = assinar(corpo)

    expect(assinaturaHmacValida({ corpoBruto: corpo, assinatura, segredo: SEGREDO })).toBe(true)
    expect(assinaturaHmacValida({ corpoBruto: corpo + " ", assinatura, segredo: SEGREDO })).toBe(false)
  })

  it("o segredo não aparece na resposta", async () => {
    supabaseFalso()

    const resposta = await POST(pedido(envelope(), "sha256=errado"))

    expect(JSON.stringify(await resposta.json())).not.toContain(SEGREDO)
  })
})

describe("envelope e despacho", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv("GATEWAY_WEBHOOK_SECRET", SEGREDO)
  })

  it("corpo que não é JSON responde 400", async () => {
    supabaseFalso()

    const resposta = await POST(pedido("não é json"))

    expect(resposta.status).toBe(400)
  })

  it.each(["event_id", "type", "instance_id"])("envelope sem %s responde 400", async (campo) => {
    supabaseFalso()
    const semCampo = envelope()
    delete (semCampo as Record<string, unknown>)[campo]

    const resposta = await POST(pedido(semCampo))

    expect(resposta.status).toBe(400)
  })

  it("instância desconhecida responde 2xx sem registrar evento", async () => {
    const { upserts } = supabaseFalso({ conexao: null })

    const resposta = await POST(pedido(envelope()))

    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toMatchObject({ motivo: "instancia_desconhecida" })
    expect(upserts).toEqual([])
  })

  it("tipo desconhecido responde 2xx e fica registrado como processado", async () => {
    const { updates } = supabaseFalso()

    const resposta = await POST(pedido(envelope({ type: "coisa.nova" })))

    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toMatchObject({ motivo: "tipo_desconhecido" })
    expect(updates).toHaveLength(1)
  })

  it("registra o evento com workspace, tipo e momento do fato", async () => {
    const { upserts } = supabaseFalso()

    await POST(pedido(envelope()))

    expect(upserts[0]).toEqual({
      event_id: "evt_01HZX9M4K2QWERTY",
      type: "message.received",
      instance_id: INSTANCIA,
      workspace_id: WORKSPACE,
      event_at: "2026-09-17T14:32:07.412Z",
    })
  })
})

describe("idempotência", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv("GATEWAY_WEBHOOK_SECRET", SEGREDO)
  })

  it("evento já processado responde 2xx sem reprocessar", async () => {
    const { updates } = supabaseFalso({ registroNovo: false, jaProcessado: true })

    const resposta = await POST(pedido(envelope()))

    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toMatchObject({ motivo: "evento_repetido" })
    expect(updates).toEqual([])
  })

  it("tentativa anterior que não terminou é processada de novo, não dada por feita", async () => {
    const { updates } = supabaseFalso({ registroNovo: false, jaProcessado: false })

    const resposta = await POST(pedido(envelope()))

    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toEqual({ status: "ok" })
    expect(updates).toHaveLength(1)
  })
})
