// Provider do gateway e o seletor com dois caminhos (B1-02).
// Cliente do gateway simulado: sem rede, sem banco.

import { beforeEach, describe, expect, it, vi } from "vitest"
import { GatewayIndisponivel, GatewayRecusou, type ClienteGateway } from "@/lib/whatsapp/gateway/cliente"
import { criarProviderGateway } from "@/lib/whatsapp/provider-gateway"
import { providerDaConexao, type ConexaoParaProvider } from "@/lib/whatsapp"

const INSTANCIA = "inst_01HZX8P7A3"
const TOKEN = "token-da-instancia"
const DESTINO = "5511999998888"

const ENFILEIRADO = {
  message_id: "3EB0C767D26B8F3A1B",
  queued: true,
  queue_position: 12,
  estimated_send_at: "2026-09-17T14:41:00Z",
}

function clienteFalso(resposta: unknown = ENFILEIRADO) {
  const chamadas: Array<{ token: string; caminho: string; metodo?: string; corpo?: unknown }> = []
  const cliente: ClienteGateway = {
    async comServico() {
      throw new Error("O provider não usa a credencial de serviço.")
    },
    async comInstancia(token, pedido) {
      chamadas.push({ token, ...pedido })
      if (resposta instanceof Error) throw resposta
      // `null` representa resposta sem corpo, como a de `read`.
      return (resposta === null ? undefined : resposta) as never
    },
  }
  return { cliente, chamadas }
}

function providerCom(resposta?: unknown) {
  const { cliente, chamadas } = clienteFalso(resposta)
  return { provider: criarProviderGateway(cliente, INSTANCIA, TOKEN), chamadas }
}

describe("provider do gateway — envio", () => {
  it("texto vai para o endpoint de mensagens da instância, com a credencial dela", async () => {
    const { provider, chamadas } = providerCom()

    const resultado = await provider.enviarTexto(DESTINO, "Segue a tabela")

    expect(resultado).toEqual({ ok: true, mensagemId: ENFILEIRADO.message_id })
    expect(chamadas).toHaveLength(1)
    expect(chamadas[0]).toMatchObject({
      token: TOKEN,
      caminho: `/instances/${INSTANCIA}/messages`,
      metodo: "POST",
    })
    expect(chamadas[0].corpo).toEqual({
      to: DESTINO,
      type: "text",
      text: "Segue a tabela",
      priority: "conversation",
    })
  })

  it("canal se declara como gateway", () => {
    expect(providerCom().provider.canal).toBe("gateway")
  })

  it.each([
    ["imagem", "image"],
    ["video", "video"],
    ["audio", "audio"],
    ["documento", "document"],
  ] as const)("mídia do tipo %s vira %s, com a URL que o gateway vai baixar", async (nosso, deles) => {
    const { provider, chamadas } = providerCom()

    await provider.enviarMidia(DESTINO, {
      url: "https://supabase.exemplo/storage/arquivo",
      tipo: nosso,
    })

    expect(chamadas[0].corpo).toEqual({
      to: DESTINO,
      type: deles,
      media_url: "https://supabase.exemplo/storage/arquivo",
      priority: "conversation",
    })
  })

  it("legenda e nome de arquivo só entram quando existem", async () => {
    const { provider, chamadas } = providerCom()

    await provider.enviarMidia(DESTINO, {
      url: "https://supabase.exemplo/nota.pdf",
      tipo: "documento",
      legenda: "",
      nomeArquivo: "nota.pdf",
    })
    await provider.enviarMidia(DESTINO, { url: "https://supabase.exemplo/foto.jpg", tipo: "imagem" })

    // Legenda vazia é legenda: presença é `!== undefined`, não truthiness.
    expect(chamadas[0].corpo).toMatchObject({ text: "", filename: "nota.pdf" })
    expect(chamadas[1].corpo).not.toHaveProperty("text")
    expect(chamadas[1].corpo).not.toHaveProperty("filename")
  })

  it("marcar como lida usa o destino, não o identificador da mensagem", async () => {
    const { provider, chamadas } = providerCom(null)

    const resultado = await provider.marcarComoLida({ mensagemId: "3EB0", destino: DESTINO })

    expect(chamadas[0].caminho).toBe(`/instances/${INSTANCIA}/read`)
    expect(chamadas[0].corpo).toEqual({ to: DESTINO })
    // Recibo de leitura não entra na fila: responde sem message_id.
    expect(resultado).toEqual({ ok: true, mensagemId: null })
  })
})

describe("provider do gateway — recusa e falha", () => {
  it("recusa do gateway vira ok false com a mensagem legível", async () => {
    const { provider } = providerCom(
      new GatewayRecusou("instance_not_connected", "A instância não está conectada.", 409)
    )

    const resultado = await provider.enviarTexto(DESTINO, "oi")

    expect(resultado).toEqual({ ok: false, motivo: "A instância não está conectada." })
  })

  it.each([
    "instance_banned",
    "instance_braked",
    "recipient_not_on_whatsapp",
    "media_too_large",
    "media_type_unsupported",
    "invalid_credentials",
    "instance_forbidden",
  ])("recusa %s não vira exceção: o chamador recebe o motivo", async (code) => {
    const { provider } = providerCom(new GatewayRecusou(code, `recusado: ${code}`, 409))

    await expect(provider.enviarTexto(DESTINO, "oi")).resolves.toEqual({
      ok: false,
      motivo: `recusado: ${code}`,
    })
  })

  it("gateway fora do ar NÃO é capturado: a exceção sobe, como no provider Meta", async () => {
    const { provider } = providerCom(new GatewayIndisponivel("O gateway não respondeu."))

    await expect(provider.enviarTexto(DESTINO, "oi")).rejects.toBeInstanceOf(GatewayIndisponivel)
  })
})

describe("provider do gateway — recursos", () => {
  it("templates não existe no canal direto; mídia e marcar lida existem", () => {
    const { provider } = providerCom()

    expect(provider.suporta("templates")).toBe(false)
    expect(provider.suporta("midia")).toBe(true)
    expect(provider.suporta("marcar_lida")).toBe(true)
  })
})

describe("seletor: escolhe pelo canal da conexão", () => {
  const DO_GATEWAY: ConexaoParaProvider = {
    canal: "gateway",
    phone_number_id: null,
    access_token: null,
    instance_id: INSTANCIA,
    instance_token: TOKEN,
  }
  const DA_META: ConexaoParaProvider = {
    canal: "meta",
    phone_number_id: "1167696503100575",
    access_token: "token-meta",
    instance_id: null,
    instance_token: null,
  }

  beforeEach(() => {
    vi.stubEnv("GATEWAY_BASE_URL", "https://gateway.exemplo.com/v1")
    vi.stubEnv("GATEWAY_SERVICE_KEY", "chave-de-servico")
  })

  it("conexão do gateway devolve o provider do gateway", () => {
    expect(providerDaConexao(DO_GATEWAY)?.canal).toBe("gateway")
  })

  it("conexão da Meta devolve o provider da Meta", () => {
    expect(providerDaConexao(DA_META)?.canal).toBe("meta")
  })

  it("conexão sem canal preenchido é da Meta: é o default da coluna", () => {
    expect(providerDaConexao({ ...DA_META, canal: null })?.canal).toBe("meta")
  })

  it("conexão incompleta para o canal dela devolve null, em vez de provider quebrado", () => {
    expect(providerDaConexao({ ...DO_GATEWAY, instance_token: null })).toBeNull()
    expect(providerDaConexao({ ...DA_META, access_token: null })).toBeNull()
  })

  it("os dois providers cumprem o mesmo contrato: quem chama não distingue", () => {
    const gateway = providerDaConexao(DO_GATEWAY)!
    const meta = providerDaConexao(DA_META)!

    for (const operacao of ["enviarTexto", "enviarMidia", "marcarComoLida", "suporta"] as const) {
      expect(typeof gateway[operacao]).toBe("function")
      expect(typeof meta[operacao]).toBe("function")
    }
  })
})
