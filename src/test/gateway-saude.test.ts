// Leitura da saúde de um número e retomada do freio (B4-02 e B4-04).
// Gateway simulado: sem rede e sem banco.

import { describe, expect, it } from "vitest"
import {
  GatewayIndisponivel,
  GatewayRecusou,
  type ClienteGateway,
} from "@/lib/whatsapp/gateway/cliente"
import { lerSaudeDoNumero, retomarEnvios, saudeNaTela } from "@/lib/whatsapp/gateway/saude"
import type { SaudeDoNumero as SaudeNoContrato } from "@/lib/whatsapp/gateway/tipos"

const CONEXAO = {
  instanceId: "inst_01HZX8P7A3",
  instanceToken: "token-da-instancia",
  numero: "5511977776666",
  nomeExibicao: "Atacado Exemplo",
}

const CONTRATO: SaudeNoContrato = {
  instance_id: CONEXAO.instanceId,
  state: "connected",
  connected_24h_ms: 82_800_000,
  sent: { last_hour: 12, last_24h: 140 },
  received: { last_hour: 9, last_24h: 118 },
  failures: { failed: 2, sent: 50, ratio: 0.04 },
  caps: { hourly: 24, hourly_used: 12, daily: 200, daily_used: 140 },
  warmup: { active: true, day_of_life: 9, hourly_cap: 24, daily_cap: 200 },
  brake: { braked: false, reason: null, braked_at: null },
  queue: { queued_count: 0 },
}

function clienteFalso(resposta: unknown) {
  const chamadas: Array<{ token: string; caminho: string; metodo?: string }> = []
  const cliente: ClienteGateway = {
    async comServico() {
      throw new Error("A saúde usa a credencial da instância, não a de serviço.")
    },
    async comInstancia(token, pedido) {
      chamadas.push({ token, ...pedido })
      if (resposta instanceof Error) throw resposta
      return resposta as never
    },
  }
  return { cliente, chamadas }
}

describe("tradução da saúde para a tela", () => {
  it("copia os números do contrato, sem recalcular nada", () => {
    const saude = saudeNaTela(CONTRATO, CONEXAO)

    expect(saude.enviadasNaHora).toBe(12)
    expect(saude.enviadasNoDia).toBe(140)
    expect(saude.recebidasNaHora).toBe(9)
    expect(saude.recebidasNoDia).toBe(118)
    expect(saude.tempoConectado24hMs).toBe(82_800_000)
    expect(saude.falhas).toEqual({ falharam: 2, enviadas: 50, proporcao: 0.04 })
  })

  it("os tetos exibidos são os VIGENTES do gateway, não os máximos do sistema", () => {
    const saude = saudeNaTela(CONTRATO, CONEXAO)

    // caps.hourly/daily já vêm com aquecimento e limites aplicados (A8-06).
    expect(saude.tetoHora).toBe(24)
    expect(saude.tetoDia).toBe(200)
  })

  it("aquecimento vem do gateway, e o último dia fica desconhecido: o contrato não o expõe", () => {
    const saude = saudeNaTela(CONTRATO, CONEXAO)

    expect(saude.aquecimento).toEqual({
      ativo: true,
      dia: 9,
      ultimoDia: null,
      tetoHora: 24,
      tetoDia: 200,
    })
  })

  it("freio ativo traz motivo, momento e o que ficou parado", () => {
    const saude = saudeNaTela(
      {
        ...CONTRATO,
        brake: { braked: true, reason: "failure_rate", braked_at: "2026-09-17T11:04:00.000Z" },
        queue: { queued_count: 1840 },
      },
      CONEXAO
    )

    expect(saude.freio).toEqual({
      freado: true,
      motivo: "failure_rate",
      desde: "2026-09-17T11:04:00.000Z",
      mensagensParadas: 1840,
    })
  })

  it("número e nome vêm da conexão do CRM, que é quem os conhece", () => {
    const saude = saudeNaTela(CONTRATO, { numero: null, nomeExibicao: null })

    expect(saude.numero).toBeNull()
    expect(saude.nomeExibicao).toBeNull()
  })

  it("não classifica risco: isso é do CRM, em outro lugar (B4-03)", () => {
    expect(saudeNaTela(CONTRATO, CONEXAO).risco).toEqual({ nivel: "baixo", razoes: [] })
  })

  it("proporção de falhas nula continua nula, e não vira zero", () => {
    const saude = saudeNaTela(
      { ...CONTRATO, failures: { failed: 0, sent: 0, ratio: null } },
      CONEXAO
    )

    expect(saude.falhas.proporcao).toBeNull()
  })
})

describe("leitura da saúde no gateway", () => {
  it("chama o endpoint de saúde com a credencial da instância", async () => {
    const { cliente, chamadas } = clienteFalso(CONTRATO)

    const resultado = await lerSaudeDoNumero({ cliente, conexao: CONEXAO })

    expect(resultado.ok).toBe(true)
    expect(chamadas).toEqual([
      { token: CONEXAO.instanceToken, caminho: `/instances/${CONEXAO.instanceId}/health` },
    ])
  })

  it("gateway fora do ar devolve erro legível, e não zero", async () => {
    const { cliente } = clienteFalso(new GatewayIndisponivel("O gateway não respondeu."))

    const resultado = await lerSaudeDoNumero({ cliente, conexao: CONEXAO })

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) expect(resultado.erro).toMatch(/não respondeu/)
  })

  it("instância removida no gateway tem mensagem própria", async () => {
    const { cliente } = clienteFalso(
      new GatewayRecusou("instance_not_found", "Instância não encontrada.", 404)
    )

    const resultado = await lerSaudeDoNumero({ cliente, conexao: CONEXAO })

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) expect(resultado.erro).toMatch(/não encontra mais este número/)
  })

  it("recusa sem mensagem própria repassa a do gateway", async () => {
    const { cliente } = clienteFalso(new GatewayRecusou("invalid_payload", "Corpo inválido.", 400))

    const resultado = await lerSaudeDoNumero({ cliente, conexao: CONEXAO })

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) expect(resultado.erro).toBe("Corpo inválido.")
  })
})

describe("retomada dos envios", () => {
  it("chama o endpoint de liberação e devolve o motivo que estava freando", async () => {
    const { cliente, chamadas } = clienteFalso({ braked: false, released_reason: "failure_rate" })

    const resultado = await retomarEnvios({ cliente, conexao: CONEXAO })

    expect(resultado).toEqual({ ok: true, motivoLiberado: "failure_rate" })
    expect(chamadas[0]).toEqual({
      token: CONEXAO.instanceToken,
      caminho: `/instances/${CONEXAO.instanceId}/brake/release`,
      metodo: "POST",
    })
  })

  it("banimento não é retomável: a mensagem diz o que fazer em vez de repetir o código", async () => {
    const { cliente } = clienteFalso(
      new GatewayRecusou("brake_not_releasable", "O número está banido pelo WhatsApp.", 409)
    )

    const resultado = await retomarEnvios({ cliente, conexao: CONEXAO })

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) {
      expect(resultado.erro).toMatch(/banido/)
      expect(resultado.erro).toMatch(/Conecte outro número/)
    }
  })

  it("número que não estava freado responde sem parecer erro do usuário", async () => {
    const { cliente } = clienteFalso(
      new GatewayRecusou("instance_not_braked", "Não está freada.", 409)
    )

    const resultado = await retomarEnvios({ cliente, conexao: CONEXAO })

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) expect(resultado.erro).toMatch(/já estavam liberados/)
  })

  it("gateway fora do ar: os envios continuam parados, e a tela diz isso", async () => {
    const { cliente } = clienteFalso(new GatewayIndisponivel("sem resposta"))

    const resultado = await retomarEnvios({ cliente, conexao: CONEXAO })

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) expect(resultado.erro).toMatch(/continuam interrompidos/)
  })
})
