// B22-41 — baixos do QA das automações (09/10/2026): o motivo diz "na última hora"
// (e não "nas últimas 1 horas"), e o horário comercial aceita o dia inteiro.

import { describe, expect, it, vi } from "vitest"
import { motivoParaIgnorar } from "@/lib/automacoes/execucoes"
import { FIM_DO_DIA, dentroDoHorario, descreverHorario, problemaDoHorario } from "@/lib/horario-comercial"
import type { ServiceClient } from "@/lib/automacoes/contexto"

/** Banco em que a regra já rodou para o contato, que não está esperando nela (B28-02). */
function jaRodou(): ServiceClient {
  const obj: Record<string, unknown> = {}
  let procuraEspera = false
  for (const m of ["select", "eq", "neq", "contains", "gte", "limit"]) {
    obj[m] = vi.fn((...args: unknown[]) => {
      if (m === "select") procuraEspera = false
      if (m === "eq" && args[0] === "resultado" && args[1] === "esperando") procuraEspera = true
      return obj
    })
  }
  obj.maybeSingle = vi.fn(async () => ({ data: procuraEspera ? null : { id: "run-1" }, error: null }))
  return { from: vi.fn(() => obj) } as unknown as ServiceClient
}

describe("B22-41 — motivo da proteção de repetição", () => {
  it("uma hora: 'na última hora'", async () => {
    const motivo = await motivoParaIgnorar(jaRodou(), { id: "r1", nome: "R", repeticao: { modo: "a_cada_horas", horas: 1 } }, "c1")
    expect(motivo).toBe("Já rodou para este contato na última hora (proteção de repetição)")
  })

  it("várias horas: 'nas últimas N horas'", async () => {
    const motivo = await motivoParaIgnorar(jaRodou(), { id: "r1", nome: "R", repeticao: { modo: "a_cada_horas", horas: 24 } }, "c1")
    expect(motivo).toBe("Já rodou para este contato nas últimas 24 horas (proteção de repetição)")
  })
})

describe("B22-41 — horário comercial o dia inteiro", () => {
  const diaInteiro = { dias: [0, 1, 2, 3, 4, 5, 6], inicio: "00:00", fim: FIM_DO_DIA }

  it("aceita fim 24:00, e só no fim", () => {
    expect(problemaDoHorario(diaInteiro)).toBeNull()
    expect(problemaDoHorario({ ...diaInteiro, inicio: "24:00" })).toBe("Use horas no formato 08:00")
  })

  it("23:59 em Brasília está dentro", () => {
    // 23:59 de uma segunda em São Paulo = 02:59 UTC de terça
    expect(dentroDoHorario(diaInteiro, new Date("2026-10-13T02:59:00Z"))).toBe(true)
    expect(dentroDoHorario({ ...diaInteiro, fim: "23:59" }, new Date("2026-10-13T02:59:00Z"))).toBe(false)
  })

  it("descrição: 'o dia inteiro'", () => {
    expect(descreverHorario(diaInteiro)).toBe("Todos os dias, o dia inteiro")
    expect(descreverHorario({ dias: [1, 2, 3, 4, 5], inicio: "00:00", fim: FIM_DO_DIA })).toBe("Seg a Sex, o dia inteiro")
  })
})
