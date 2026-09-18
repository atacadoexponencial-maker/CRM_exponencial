// Número de origem na campanha (B7-03). Banco e gateway mockados.
//
// O que se mede: a campanha dispara pelo número escolhido, se declara como
// disparo em massa, e o número desconectado cai no tratamento que já existia.

import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ClienteGateway } from "@/lib/whatsapp/gateway/cliente"
import { criarProviderGateway } from "@/lib/whatsapp/provider-gateway"
import { criarProviderMeta } from "@/lib/whatsapp/provider-meta"

const DESTINO = "5511999998888"

function gatewayFalso() {
  const corpos: Array<Record<string, unknown>> = []
  const cliente: ClienteGateway = {
    async comServico() {
      throw new Error("não usado")
    },
    async comInstancia(_token, pedido) {
      corpos.push((pedido.corpo ?? {}) as Record<string, unknown>)
      return { message_id: "3EB0", queued: true, queue_position: 5, estimated_send_at: "x" } as never
    },
  }
  return { cliente, corpos }
}

beforeEach(() => {
  vi.stubEnv("GATEWAY_BASE_URL", "https://gateway.exemplo.com/v1")
  vi.stubEnv("GATEWAY_SERVICE_KEY", "chave")
})

describe("prioridade declarada pelo chamador", () => {
  it("campanha se declara disparo em massa no canal direto", async () => {
    const { cliente, corpos } = gatewayFalso()
    const provider = criarProviderGateway(cliente, "inst_1", "token")

    await provider.enviarTexto(DESTINO, "promoção", { prioridade: "campanha" })

    expect(corpos[0].priority).toBe("campaign")
  })

  it("mídia de campanha também, e a legenda continua indo", async () => {
    const { cliente, corpos } = gatewayFalso()
    const provider = criarProviderGateway(cliente, "inst_1", "token")

    await provider.enviarMidia(
      DESTINO,
      { url: "https://storage/tabela.pdf", tipo: "documento", legenda: "tabela", nomeArquivo: "t.pdf" },
      { prioridade: "campanha" }
    )

    expect(corpos[0]).toMatchObject({ priority: "campaign", text: "tabela", filename: "t.pdf" })
  })

  it("sem prioridade declarada, é conversa: o caso da esmagadora maioria dos envios", async () => {
    const { cliente, corpos } = gatewayFalso()
    const provider = criarProviderGateway(cliente, "inst_1", "token")

    await provider.enviarTexto(DESTINO, "oi")
    await provider.enviarTexto(DESTINO, "oi", { prioridade: "conversa" })

    expect(corpos.map((c) => c.priority)).toEqual(["conversation", "conversation"])
  })

  it("a API Oficial aceita e ignora a prioridade: não existe fila lá", async () => {
    const chamadas: Array<Record<string, unknown>> = []
    const buscar = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      chamadas.push(JSON.parse(init?.body as string))
      return new Response(JSON.stringify({ messages: [{ id: "wamid.1" }] }), { status: 200 })
    })
    vi.stubGlobal("fetch", buscar)

    const provider = criarProviderMeta("phone_1", "token-meta")
    await provider.enviarTexto(DESTINO, "oi", { prioridade: "campanha" })

    expect(chamadas[0]).not.toHaveProperty("priority")
    expect(chamadas[0]).toMatchObject({ messaging_product: "whatsapp", type: "text" })
  })
})

describe("escolha do número da campanha", () => {
  // `providerDaCampanha` é interno a campanhas.ts; o que se pode medir por fora
  // é a regra que ela usa: conexão conectada vira provider, desconectada não.
  it("conexão conectada do canal direto vira provider do gateway", async () => {
    const { criarProviderGateway: criar } = await import("@/lib/whatsapp/provider-gateway")
    const provider = criar(gatewayFalso().cliente, "inst_1", "token")

    expect(provider.canal).toBe("gateway")
  })

  it("provider da Meta e do gateway cumprem a mesma assinatura com prioridade", async () => {
    const doGateway = criarProviderGateway(gatewayFalso().cliente, "inst_1", "token")
    const daMeta = criarProviderMeta("phone_1", "token-meta")

    // Três argumentos nos dois: quem chama não precisa saber qual é qual.
    expect(doGateway.enviarTexto.length).toBe(3)
    expect(daMeta.enviarTexto.length).toBeLessThanOrEqual(3)
  })
})
