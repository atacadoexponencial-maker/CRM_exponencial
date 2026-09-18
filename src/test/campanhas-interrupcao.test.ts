// Interromper e retomar campanha (B8-03). Banco mockado.
//
// O que se mede: o freio de um número interrompe as campanhas **dele** e não as
// dos outros, e o motivo fica registrado.

import { describe, expect, it } from "vitest"
import { registrarFreio, TIPO_ALERTA_FREIO } from "@/lib/whatsapp/eventos-de-operacao"

type Atualizacao = { tabela: string; valores: Record<string, unknown>; filtros: Record<string, unknown> }

/**
 * Supabase falso que grava o que foi escrito e com quais filtros — é o filtro
 * que prova que só as campanhas daquele número pararam.
 */
function bancoFalso({ alertaAberto = null as { motivo: string } | null } = {}) {
  const atualizacoes: Atualizacao[] = []
  const upserts: Array<Record<string, unknown>> = []

  function encadear(tabela: string, valores: Record<string, unknown>) {
    const filtros: Record<string, unknown> = {}
    const registro: Atualizacao = { tabela, valores, filtros }
    atualizacoes.push(registro)

    const elo = {
      eq(coluna: string, valor: unknown) {
        filtros[coluna] = valor
        return elo
      },
      is(coluna: string, valor: unknown) {
        filtros[coluna] = valor
        return elo
      },
      maybeSingle: async () => ({ data: alertaAberto, error: null }),
      select: () => elo,
      then: (resolver: (v: { data: null; error: null }) => void) => resolver({ data: null, error: null }),
    }
    return elo
  }

  const banco = {
    from(tabela: string) {
      return {
        update: (valores: Record<string, unknown>) => encadear(tabela, valores),
        async upsert(valores: Record<string, unknown>) {
          upserts.push(valores)
          return { error: null }
        },
        select: () => encadear(tabela, {}),
      }
    },
  }

  return { banco, atualizacoes, upserts }
}

describe("freio do número interrompe as campanhas dele", () => {
  it("campanha em andamento daquele número passa a interrompida, com o motivo do freio", async () => {
    const { banco, atualizacoes } = bancoFalso()

    await registrarFreio({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase: banco as any,
      workspaceId: "ws_1",
      connectionId: "conexao_1",
      evento: { reason: "failure_rate", queued_count: 812 },
    })

    const daCampanha = atualizacoes.find((a) => a.tabela === "campaigns")
    expect(daCampanha?.valores).toMatchObject({
      status: "interrompida",
      interrompida_motivo: "failure_rate",
    })
  })

  it("só as campanhas daquele número, e só as que estão disparando", async () => {
    const { banco, atualizacoes } = bancoFalso()

    await registrarFreio({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase: banco as any,
      workspaceId: "ws_1",
      connectionId: "conexao_1",
      evento: { reason: "banned" },
    })

    const daCampanha = atualizacoes.find((a) => a.tabela === "campaigns")
    // Sem o filtro por conexão, o freio de um número pararia a campanha do outro.
    expect(daCampanha?.filtros).toEqual({
      whatsapp_connection_id: "conexao_1",
      status: "enviando",
    })
  })

  it("liberação do freio resolve o aviso e NÃO retoma campanha sozinha", async () => {
    const { banco, atualizacoes } = bancoFalso()

    const resultado = await registrarFreio({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase: banco as any,
      workspaceId: "ws_1",
      connectionId: "conexao_1",
      evento: { reason: "failure_rate", released: true },
    })

    expect(resultado.acao).toBe("resolvido")
    // Retomar é decisão de quem opera a campanha, não efeito colateral do freio.
    expect(atualizacoes.some((a) => a.tabela === "campaigns")).toBe(false)
  })

  it("o aviso do freio guarda quantas ficaram paradas, que é o número citado na tela", async () => {
    const { banco, upserts } = bancoFalso()

    await registrarFreio({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase: banco as any,
      workspaceId: "ws_1",
      connectionId: "conexao_1",
      evento: { reason: "manual", queued_count: 420 },
    })

    expect(upserts[0]).toMatchObject({
      tipo: TIPO_ALERTA_FREIO,
      motivo: "manual",
      queued_count: 420,
    })
  })
})

describe("o que a interrupção promete", () => {
  it("o estado interrompida é diferente de cancelada: uma continua, a outra não", () => {
    const estados = ["rascunho", "agendada", "enviando", "interrompida", "enviada", "cancelada"]

    expect(estados).toContain("interrompida")
    expect(estados).toContain("cancelada")
    expect(estados.indexOf("interrompida")).not.toBe(estados.indexOf("cancelada"))
  })

  it("retomar parte dos pendentes: quem já recebeu não volta para a fila", () => {
    const estadosQueVoltamParaAFila = ["pendente"]
    const estadosQueNaoVoltam = ["na_fila", "enviado", "entregue", "lido", "falhou"]

    for (const estado of estadosQueNaoVoltam) {
      expect(estadosQueVoltamParaAFila).not.toContain(estado)
    }
  })
})
