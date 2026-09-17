// Alertas de número na central (B4-03). Banco simulado: sem escrita real.

import { describe, expect, it } from "vitest"
import {
  abrirAlertaDeNumero,
  listarAlertasDeNumero,
  refletirEstadoNaCentral,
  refletirRiscoNaCentral,
  resolverAlertaDeNumero,
  TIPO_ALERTA_BANIDO,
  TIPO_ALERTA_DESCONECTADO,
  TIPO_ALERTA_RISCO_ALTO,
  type BancoDeAlertas,
} from "@/lib/whatsapp/alertas-de-numero"
import type { createServiceClient } from "@/integrations/supabase/service"

type ServiceClient = ReturnType<typeof createServiceClient>

const WORKSPACE = "ws_1"
const CONEXAO = "conn_1"

/**
 * Supabase falso para escrita: guarda o que foi inserido e o que foi resolvido.
 * `abertos` decide se o select de duplicata encontra algo.
 */
function bancoDeEscrita({ abertos = [] as string[] } = {}) {
  const inseridos: Array<Record<string, unknown>> = []
  const resolvidos: Array<{ tipos: string[] }> = []

  const supabase = {
    from() {
      return {
        select() {
          return {
            eq() {
              return {
                eq(_coluna: string, tipo: string) {
                  return {
                    is: () => ({
                      maybeSingle: async () => ({
                        data: abertos.includes(tipo) ? { id: "existente" } : null,
                      }),
                    }),
                  }
                },
              }
            },
          }
        },
        async insert(linha: Record<string, unknown>) {
          inseridos.push(linha)
          return { error: null }
        },
        update() {
          return {
            eq() {
              return {
                in(_coluna: string, tipos: string[]) {
                  return {
                    is: async () => {
                      resolvidos.push({ tipos })
                      return { error: null }
                    },
                  }
                },
              }
            },
          }
        },
      }
    },
  } as unknown as ServiceClient

  return { supabase, inseridos, resolvidos }
}

describe("abrir alerta de número", () => {
  it("abre quando não há outro igual em aberto", async () => {
    const banco = bancoDeEscrita()

    const resultado = await abrirAlertaDeNumero({
      supabase: banco.supabase,
      workspaceId: WORKSPACE,
      connectionId: CONEXAO,
      tipo: TIPO_ALERTA_DESCONECTADO,
      motivo: "connection_lost",
    })

    expect(resultado).toEqual({ aberto: true })
    expect(banco.inseridos[0]).toEqual({
      workspace_id: WORKSPACE,
      connection_id: CONEXAO,
      tipo: TIPO_ALERTA_DESCONECTADO,
      motivo: "connection_lost",
    })
  })

  it("não duplica: o mesmo alerta aberto não gera outra linha", async () => {
    const banco = bancoDeEscrita({ abertos: [TIPO_ALERTA_DESCONECTADO] })

    const resultado = await abrirAlertaDeNumero({
      supabase: banco.supabase,
      workspaceId: WORKSPACE,
      connectionId: CONEXAO,
      tipo: TIPO_ALERTA_DESCONECTADO,
    })

    expect(resultado).toEqual({ aberto: false })
    expect(banco.inseridos).toEqual([])
  })
})

describe("risco na central", () => {
  it("risco alto abre alerta com a razão principal", async () => {
    const banco = bancoDeEscrita()

    await refletirRiscoNaCentral({
      supabase: banco.supabase,
      workspaceId: WORKSPACE,
      connectionId: CONEXAO,
      nivel: "alto",
      razaoPrincipal: "12 dos últimos 50 envios falharam (24%).",
    })

    expect(banco.inseridos[0]).toMatchObject({
      tipo: TIPO_ALERTA_RISCO_ALTO,
      motivo: "12 dos últimos 50 envios falharam (24%).",
    })
  })

  it.each(["baixo", "medio"] as const)("risco %s fecha o alerta e não abre nada", async (nivel) => {
    const banco = bancoDeEscrita()

    await refletirRiscoNaCentral({
      supabase: banco.supabase,
      workspaceId: WORKSPACE,
      connectionId: CONEXAO,
      nivel,
    })

    expect(banco.inseridos).toEqual([])
    expect(banco.resolvidos).toEqual([{ tipos: [TIPO_ALERTA_RISCO_ALTO] }])
  })

  it("risco que continua alto não vira segunda linha", async () => {
    const banco = bancoDeEscrita({ abertos: [TIPO_ALERTA_RISCO_ALTO] })

    await refletirRiscoNaCentral({
      supabase: banco.supabase,
      workspaceId: WORKSPACE,
      connectionId: CONEXAO,
      nivel: "alto",
    })

    expect(banco.inseridos).toEqual([])
  })
})

describe("estado da conexão na central", () => {
  it("desconectado abre alerta de desconexão, com o motivo do gateway", async () => {
    const banco = bancoDeEscrita()

    await refletirEstadoNaCentral({
      supabase: banco.supabase,
      workspaceId: WORKSPACE,
      connectionId: CONEXAO,
      estado: "disconnected",
      motivo: "session_closed_on_device",
    })

    expect(banco.inseridos[0]).toMatchObject({
      tipo: TIPO_ALERTA_DESCONECTADO,
      motivo: "session_closed_on_device",
    })
  })

  it("banido abre alerta próprio e fecha o de desconexão: reconectar não resolve banimento", async () => {
    const banco = bancoDeEscrita()

    await refletirEstadoNaCentral({
      supabase: banco.supabase,
      workspaceId: WORKSPACE,
      connectionId: CONEXAO,
      estado: "banned",
      motivo: "banned_by_whatsapp",
    })

    expect(banco.resolvidos).toEqual([{ tipos: [TIPO_ALERTA_DESCONECTADO] }])
    expect(banco.inseridos[0]).toMatchObject({ tipo: TIPO_ALERTA_BANIDO })
  })

  it("reconectado fecha desconexão e banimento", async () => {
    const banco = bancoDeEscrita()

    await refletirEstadoNaCentral({
      supabase: banco.supabase,
      workspaceId: WORKSPACE,
      connectionId: CONEXAO,
      estado: "connected",
    })

    expect(banco.inseridos).toEqual([])
    expect(banco.resolvidos).toEqual([
      { tipos: [TIPO_ALERTA_DESCONECTADO, TIPO_ALERTA_BANIDO] },
    ])
  })

  it("connecting não abre nem fecha: o gateway está tentando voltar sozinho", async () => {
    const banco = bancoDeEscrita()

    await refletirEstadoNaCentral({
      supabase: banco.supabase,
      workspaceId: WORKSPACE,
      connectionId: CONEXAO,
      estado: "connecting",
    })

    expect(banco.inseridos).toEqual([])
    expect(banco.resolvidos).toEqual([])
  })

  it("pairing também não mexe na central", async () => {
    const banco = bancoDeEscrita()

    await refletirEstadoNaCentral({
      supabase: banco.supabase,
      workspaceId: WORKSPACE,
      connectionId: CONEXAO,
      estado: "pairing",
    })

    expect(banco.inseridos).toEqual([])
    expect(banco.resolvidos).toEqual([])
  })
})

describe("resolver e listar", () => {
  it("resolver fecha só os tipos pedidos", async () => {
    const banco = bancoDeEscrita()

    await resolverAlertaDeNumero({
      supabase: banco.supabase,
      connectionId: CONEXAO,
      tipos: [TIPO_ALERTA_RISCO_ALTO],
    })

    expect(banco.resolvidos).toEqual([{ tipos: [TIPO_ALERTA_RISCO_ALTO] }])
  })

  it("a listagem traz o número da conexão e o que ficou parado", async () => {
    const supabase = {
      from() {
        return {
          select() {
            return {
              eq() {
                return {
                  is: () => ({
                    order: async () => ({
                      data: [
                        {
                          id: "a1",
                          tipo: "numero_freado",
                          motivo: "failure_rate",
                          queued_count: 1840,
                          created_at: "2026-09-17T11:04:00.000Z",
                          connection_id: CONEXAO,
                          conexao: { phone_number: "5511977776666", display_name: "Expansão" },
                        },
                      ],
                    }),
                  }),
                }
              },
            }
          },
        }
      },
    } as unknown as BancoDeAlertas

    const alertas = await listarAlertasDeNumero(supabase, WORKSPACE)

    expect(alertas).toEqual([
      {
        id: "a1",
        tipo: "numero_freado",
        motivo: "failure_rate",
        mensagensParadas: 1840,
        criadoEm: "2026-09-17T11:04:00.000Z",
        connectionId: CONEXAO,
        numero: "5511977776666",
        nomeExibicao: "Expansão",
      },
    ])
  })

  it("workspace sem alerta devolve lista vazia", async () => {
    const supabase = {
      from() {
        return {
          select() {
            return { eq: () => ({ is: () => ({ order: async () => ({ data: null }) }) }) }
          },
        }
      },
    } as unknown as BancoDeAlertas

    expect(await listarAlertasDeNumero(supabase, WORKSPACE)).toEqual([])
  })
})
