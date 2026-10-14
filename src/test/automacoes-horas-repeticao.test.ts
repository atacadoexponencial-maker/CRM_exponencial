// B22-12 — horas de "no máximo a cada N horas" (achado M11 do QA das automações,
// 09/10/2026). A tela e o servidor conferem pela mesma função. O campo na tela é
// conferido no preview (e2e/preview/roteiro-b22-12.cjs).

import { describe, expect, it } from "vitest"
import { HORAS_MAXIMAS, horasValidas, lerRepeticao } from "@/lib/fluxo-automacao"

describe("B22-12 — horas da repetição", () => {
  it("aceita inteiros de 1 a um ano", () => {
    expect(horasValidas(1)).toBe(true)
    expect(horasValidas(48)).toBe(true)
    expect(horasValidas(HORAS_MAXIMAS)).toBe(true)
  })

  it("recusa campo vazio (0), fração e acima de um ano", () => {
    expect(horasValidas(0)).toBe(false)
    expect(horasValidas(1.5)).toBe(false)
    expect(horasValidas(99999)).toBe(false)
    expect(horasValidas(HORAS_MAXIMAS + 1)).toBe(false)
    expect(horasValidas(Number.NaN)).toBe(false)
    expect(horasValidas("48")).toBe(false)
  })

  it("lerRepeticao continua aceitando só as horas válidas", () => {
    expect(lerRepeticao({ modo: "a_cada_horas", horas: 48 })).toEqual({ modo: "a_cada_horas", horas: 48 })
    expect(lerRepeticao({ modo: "a_cada_horas", horas: 1.5 })).toEqual({ modo: "sempre" })
  })
})
