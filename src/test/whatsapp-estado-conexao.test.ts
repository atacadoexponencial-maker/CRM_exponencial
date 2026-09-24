// Estado da conexão do canal direto (B2-04): consulta, tradução do motivo e
// gravação. Gateway falso, banco falso.

import { describe, expect, it } from "vitest"
import { GatewayIndisponivel, GatewayRecusou, type ClienteGateway } from "@/lib/whatsapp/gateway/cliente"
import {
  consultarEstado,
  motivoEmPortugues,
  pareamentoEmAndamento,
  TEXTO_DO_MOTIVO,
} from "@/lib/whatsapp/gateway/estado"
import { aplicarEstadoDaInstancia } from "@/lib/whatsapp/eventos-de-operacao"

const INSTANCIA = "inst_01HZX8P7A3"
const TOKEN = "token-da-instancia"

function gatewayFalso(resposta: unknown) {
  const chamadas: string[] = []
  const cliente: ClienteGateway = {
    async comServico() {
      throw new Error("Consultar estado usa a credencial da instância.")
    },
    async comInstancia(_token, pedido) {
      chamadas.push(pedido.caminho)
      if (resposta instanceof Error) throw resposta
      return resposta as never
    },
  }
  return { cliente, chamadas }
}

function bancoFalso() {
  const updates: Array<Record<string, unknown>> = []
  const supabase = {
    from() {
      return {
        update(valores: Record<string, unknown>) {
          updates.push(valores)
          return { eq: async () => ({ error: null }) }
        },
        // Conectado procura conexões removidas do mesmo telefone; aqui não há.
        select() {
          return { eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }
        },
      }
    },
  }
  return { supabase, updates }
}

describe("consulta de estado", () => {
  it("pergunta ao gateway e devolve estado, número e nome", async () => {
    const gateway = gatewayFalso({
      instance_id: INSTANCIA,
      state: "connected",
      phone_number: "5511777776666",
      display_name: "Atacado Exemplo",
      created_at: "2026-09-17T12:00:00Z",
      last_connected_at: "2026-09-17T12:05:00Z",
    })

    const resultado = await consultarEstado(gateway.cliente, INSTANCIA, TOKEN)

    expect(gateway.chamadas).toEqual([`/instances/${INSTANCIA}`])
    expect(resultado).toEqual({
      ok: true,
      estado: {
        state: "connected",
        phone_number: "5511777776666",
        display_name: "Atacado Exemplo",
        reason: null,
      },
    })
  })

  it("em pareamento o número ainda não existe, e isso não é erro", async () => {
    const gateway = gatewayFalso({
      instance_id: INSTANCIA,
      state: "pairing",
      phone_number: null,
      display_name: null,
      created_at: "2026-09-17T12:00:00Z",
      last_connected_at: null,
    })

    const resultado = await consultarEstado(gateway.cliente, INSTANCIA, TOKEN)

    expect(resultado.ok).toBe(true)
    if (resultado.ok) expect(resultado.estado.phone_number).toBeNull()
  })

  it("instância removida no gateway: mensagem que diz o que fazer", async () => {
    const gateway = gatewayFalso(
      new GatewayRecusou("instance_not_found", "Instância não encontrada.", 404)
    )

    const resultado = await consultarEstado(gateway.cliente, INSTANCIA, TOKEN)

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) expect(resultado.erro).toMatch(/Remova-a do CRM/)
  })

  it("gateway fora do ar não vira exceção na tela", async () => {
    const gateway = gatewayFalso(new GatewayIndisponivel("sem resposta"))

    await expect(consultarEstado(gateway.cliente, INSTANCIA, TOKEN)).resolves.toMatchObject({
      ok: false,
    })
  })
})

describe("motivo em português", () => {
  it("traduz os três valores do contrato", () => {
    expect(motivoEmPortugues("session_closed_on_device")).toBe(
      TEXTO_DO_MOTIVO.session_closed_on_device
    )
    expect(motivoEmPortugues("banned_by_whatsapp")).toBe(TEXTO_DO_MOTIVO.banned_by_whatsapp)
    expect(motivoEmPortugues("connection_lost")).toBe(TEXTO_DO_MOTIVO.connection_lost)
  })

  it("sem motivo é nulo, e não texto vazio na tela", () => {
    expect(motivoEmPortugues(null)).toBeNull()
    expect(motivoEmPortugues(undefined)).toBeNull()
  })

  it("motivo novo, que o gateway passe a mandar, não quebra a tela", () => {
    expect(motivoEmPortugues("motivo_que_ainda_nao_existe")).toBe("A conexão mudou de estado.")
  })
})

describe("quando continuar acompanhando", () => {
  it("acompanha enquanto o pareamento não terminou", () => {
    expect(pareamentoEmAndamento("pairing")).toBe(true)
    expect(pareamentoEmAndamento("connecting")).toBe(true)
  })

  it("para quando terminou, de qualquer forma", () => {
    for (const estado of ["connected", "disconnected", "banned", "removed"]) {
      expect(pareamentoEmAndamento(estado)).toBe(false)
    }
  })

  it("estado desconhecido não mantém a tela perguntando para sempre", () => {
    expect(pareamentoEmAndamento("estado_novo_do_gateway")).toBe(false)
  })
})

describe("gravação do estado", () => {
  it("grava estado e motivo, e o motivo nulo limpa o anterior", async () => {
    const { supabase, updates } = bancoFalso()

    await aplicarEstadoDaInstancia({
      supabase: supabase as never,
      connectionId: "conexao-1",
      evento: { state: "connected", phone_number: "5511777776666", display_name: "Exemplo", reason: null },
    })

    expect(updates[0]).toMatchObject({
      status: "connected",
      state_reason: null,
      phone_number: "5511777776666",
      display_name: "Exemplo",
    })
  })

  it("desconectar não apaga o número que já era conhecido", async () => {
    const { supabase, updates } = bancoFalso()

    await aplicarEstadoDaInstancia({
      supabase: supabase as never,
      connectionId: "conexao-1",
      evento: {
        state: "disconnected",
        phone_number: null,
        display_name: null,
        reason: "connection_lost",
      },
    })

    expect(updates[0]).toEqual({ status: "disconnected", state_reason: "connection_lost" })
    expect(updates[0]).not.toHaveProperty("phone_number")
  })
})
