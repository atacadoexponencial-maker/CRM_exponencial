// Pareamento pelo canal direto (B2-03): pedido de QR, pedido de código,
// validade e renovação. Gateway falso; nenhuma rede e nenhum banco.

import { describe, expect, it } from "vitest"
import { GatewayIndisponivel, GatewayRecusou, type ClienteGateway } from "@/lib/whatsapp/gateway/cliente"
import {
  desenharQr,
  pedirCodigoDoGateway,
  pedirQrDoGateway,
} from "@/lib/whatsapp/gateway/pareamento"

const INSTANCIA = "inst_01HZX8P7A3"
const TOKEN = "token-da-instancia"
const CONTEUDO_DO_QR = "2@Kx9mQ4vB7nZ1pL8sT3wY6hJ0dF5gR2aC4eN7uM9iO1kP3xV5bW8zQ6yH4jS2lD0f"

function gatewayFalso(respostas: unknown[]) {
  const chamadas: Array<{ token: string; caminho: string; corpo?: unknown }> = []
  const fila = [...respostas]

  const cliente: ClienteGateway = {
    async comServico() {
      throw new Error("Parear usa a credencial da instância, não a de serviço.")
    },
    async comInstancia(token, pedido) {
      chamadas.push({ token, caminho: pedido.caminho, corpo: pedido.corpo })
      const resposta = fila.shift()
      if (resposta instanceof Error) throw resposta
      return resposta as never
    },
  }

  return { cliente, chamadas }
}

function vencimento(segundos: number): string {
  return new Date(Date.now() + segundos * 1000).toISOString()
}

describe("pedido do QR", () => {
  it("chama o endpoint da instância e devolve a imagem desenhada", async () => {
    const expira = vencimento(60)
    const gateway = gatewayFalso([{ qr: CONTEUDO_DO_QR, expires_at: expira }])

    const resultado = await pedirQrDoGateway(gateway.cliente, INSTANCIA, TOKEN)

    expect(gateway.chamadas[0]).toMatchObject({
      token: TOKEN,
      caminho: `/instances/${INSTANCIA}/pair/qr`,
    })
    expect(resultado.ok).toBe(true)
    if (resultado.ok) {
      expect(resultado.dados.expiresAt).toBe(expira)
      expect(resultado.dados.imagem.startsWith("data:image/png;base64,")).toBe(true)
    }
  })

  it("a imagem é o desenho do conteúdo, e o conteúdo bruto não vai junto", async () => {
    const gateway = gatewayFalso([{ qr: CONTEUDO_DO_QR, expires_at: vencimento(60) }])

    const resultado = await pedirQrDoGateway(gateway.cliente, INSTANCIA, TOKEN)

    if (!resultado.ok) throw new Error("deveria ter dado certo")
    expect(resultado.dados.imagem).toBe(await desenharQr(CONTEUDO_DO_QR))
    expect(JSON.stringify(resultado.dados)).not.toContain(CONTEUDO_DO_QR)
  })

  it("renovar é pedir de novo: o código muda e o vencimento anda para frente", async () => {
    const primeiro = vencimento(5)
    const segundo = vencimento(60)
    const gateway = gatewayFalso([
      { qr: CONTEUDO_DO_QR, expires_at: primeiro },
      { qr: "2@OutroCodigoCompletamenteDiferente", expires_at: segundo },
    ])

    const antes = await pedirQrDoGateway(gateway.cliente, INSTANCIA, TOKEN)
    const depois = await pedirQrDoGateway(gateway.cliente, INSTANCIA, TOKEN)

    expect(gateway.chamadas).toHaveLength(2)
    if (!antes.ok || !depois.ok) throw new Error("deveriam ter dado certo")
    expect(depois.dados.imagem).not.toBe(antes.dados.imagem)
    expect(new Date(depois.dados.expiresAt).getTime()).toBeGreaterThan(
      new Date(antes.dados.expiresAt).getTime()
    )
  })

  it("instância que não existe mais tem mensagem que diz o que fazer", async () => {
    const gateway = gatewayFalso([
      new GatewayRecusou("instance_not_found", "Instância não encontrada.", 404),
    ])

    const resultado = await pedirQrDoGateway(gateway.cliente, INSTANCIA, TOKEN)

    expect(resultado).toEqual({
      ok: false,
      erro: "Esta conexão não existe mais no gateway. Remova-a do CRM e conecte o número de novo.",
    })
  })

  it("gateway fora do ar não vira exceção na tela", async () => {
    const gateway = gatewayFalso([new GatewayIndisponivel("O gateway não respondeu.")])

    const resultado = await pedirQrDoGateway(gateway.cliente, INSTANCIA, TOKEN)

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) expect(resultado.erro).toMatch(/Tente novamente/)
  })
})

describe("pedido do código digitado", () => {
  it("manda só os dígitos do número informado", async () => {
    const gateway = gatewayFalso([{ pairing_code: "WZQ7-4KDM", expires_at: vencimento(60) }])

    const resultado = await pedirCodigoDoGateway(
      gateway.cliente,
      INSTANCIA,
      TOKEN,
      "+55 (11) 99999-8888"
    )

    expect(gateway.chamadas[0]).toMatchObject({
      caminho: `/instances/${INSTANCIA}/pair/code`,
      corpo: { phone_number: "5511999998888" },
    })
    if (!resultado.ok) throw new Error("deveria ter dado certo")
    expect(resultado.dados.pairing_code).toBe("WZQ7-4KDM")
  })

  it.each(["123", "5511", "55119999988887777"])(
    "número mal formado (%s) é recusado antes de ir à rede",
    async (numero) => {
      const gateway = gatewayFalso([])

      const resultado = await pedirCodigoDoGateway(gateway.cliente, INSTANCIA, TOKEN, numero)

      expect(resultado).toEqual({
        ok: false,
        erro: "Informe o número com código do país, apenas dígitos.",
      })
      expect(gateway.chamadas).toEqual([])
    }
  )

  it("recusa do gateway por corpo inválido chega legível", async () => {
    const gateway = gatewayFalso([
      new GatewayRecusou("invalid_payload", "Corpo malformado.", 400),
    ])

    const resultado = await pedirCodigoDoGateway(
      gateway.cliente,
      INSTANCIA,
      TOKEN,
      "5511999998888"
    )

    expect(resultado).toEqual({
      ok: false,
      erro: "Informe o número com código do país, apenas dígitos.",
    })
  })
})

describe("desenho do QR", () => {
  it("conteúdos diferentes geram imagens diferentes; o mesmo conteúdo, a mesma imagem", async () => {
    const a = await desenharQr("conteudo-a")
    const b = await desenharQr("conteudo-b")

    expect(a).not.toBe(b)
    expect(await desenharQr("conteudo-a")).toBe(a)
  })
})
