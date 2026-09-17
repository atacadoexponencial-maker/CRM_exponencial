// Régua do sinal de risco (B4-03). Função pura: sem rede, sem banco, sem data.

import { describe, expect, it } from "vitest"
import { classificarRisco, LIMIARES, type IngredientesDoRisco } from "@/lib/risco"

/** Número saudável: volume moderado, conversa de mão dupla, nada falhando. */
const SAUDAVEL: IngredientesDoRisco = {
  enviadasNaHora: 12,
  enviadasNoDia: 140,
  recebidasNoDia: 90,
  tetoHora: 60,
  tetoDia: 500,
  falhas: { falharam: 1, enviadas: 50, proporcao: 0.02 },
  freado: false,
  motivoDoFreio: null,
  estado: "connected",
}

describe("risco baixo", () => {
  it("número saudável não tem razão nenhuma", () => {
    expect(classificarRisco(SAUDAVEL)).toEqual({ nivel: "baixo", razoes: [] })
  })

  it("número quieto não é risco: pouca resposta com pouco volume não conta", () => {
    const quieto = { ...SAUDAVEL, enviadasNoDia: 5, recebidasNoDia: 0 }

    expect(classificarRisco(quieto).nivel).toBe("baixo")
  })

  it("janela de falhas vazia não inventa proporção", () => {
    const semEnvios = {
      ...SAUDAVEL,
      falhas: { falharam: 0, enviadas: 0, proporcao: null },
    }

    expect(classificarRisco(semEnvios).nivel).toBe("baixo")
  })
})

describe("risco médio", () => {
  it("quase no teto do dia", () => {
    const sinal = classificarRisco({ ...SAUDAVEL, enviadasNoDia: 450, recebidasNoDia: 200 })

    expect(sinal.nivel).toBe("medio")
    expect(sinal.razoes[0]).toContain("Quase no teto do dia: 450 de 500")
  })

  it("quase no teto da hora", () => {
    const sinal = classificarRisco({ ...SAUDAVEL, enviadasNaHora: 55 })

    expect(sinal.nivel).toBe("medio")
    expect(sinal.razoes.some((r) => r.includes("teto da hora"))).toBe(true)
  })

  it("falhas acima de 10% e abaixo de 20%", () => {
    const sinal = classificarRisco({
      ...SAUDAVEL,
      falhas: { falharam: 7, enviadas: 50, proporcao: 0.14 },
    })

    expect(sinal.nivel).toBe("medio")
    expect(sinal.razoes[0]).toBe("7 dos últimos 50 envios falharam (14%).")
  })

  it("poucas respostas com volume relevante", () => {
    const sinal = classificarRisco({ ...SAUDAVEL, enviadasNoDia: 100, recebidasNoDia: 4 })

    expect(sinal.nivel).toBe("medio")
    expect(sinal.razoes.some((r) => r.startsWith("Poucas respostas"))).toBe(true)
  })

  it("freio manual da operação é médio: foi decisão nossa, não sinal do WhatsApp", () => {
    const sinal = classificarRisco({ ...SAUDAVEL, freado: true, motivoDoFreio: "manual" })

    expect(sinal.nivel).toBe("medio")
    expect(sinal.razoes[0]).toContain("manualmente")
  })
})

describe("risco alto", () => {
  it("número banido", () => {
    const sinal = classificarRisco({ ...SAUDAVEL, estado: "banned" })

    expect(sinal.nivel).toBe("alto")
    expect(sinal.razoes[0]).toBe("O WhatsApp já bloqueou este número.")
  })

  it("freio por excesso de falhas", () => {
    const sinal = classificarRisco({
      ...SAUDAVEL,
      freado: true,
      motivoDoFreio: "failure_rate",
      falhas: { falharam: 12, enviadas: 50, proporcao: 0.24 },
    })

    expect(sinal.nivel).toBe("alto")
    expect(sinal.razoes[0]).toContain("freio de emergência")
  })

  it("falhas no mesmo limiar com que o gateway freia", () => {
    const sinal = classificarRisco({
      ...SAUDAVEL,
      falhas: { falharam: 10, enviadas: 50, proporcao: LIMIARES.falhasAlto },
    })

    expect(sinal.nivel).toBe("alto")
  })

  it("volume estourando o dia com quase nenhuma resposta", () => {
    const sinal = classificarRisco({ ...SAUDAVEL, enviadasNoDia: 486, recebidasNoDia: 11 })

    expect(sinal.nivel).toBe("alto")
    expect(sinal.razoes.some((r) => r.startsWith("Poucas respostas"))).toBe(true)
  })

  it("sem resposta, mas longe do teto, é médio e não alto", () => {
    const sinal = classificarRisco({ ...SAUDAVEL, enviadasNoDia: 100, recebidasNoDia: 1 })

    expect(sinal.nivel).toBe("medio")
  })
})

describe("as razões", () => {
  it("nível alto lista também o que é médio: o cliente vê tudo o que pesa", () => {
    const sinal = classificarRisco({
      ...SAUDAVEL,
      freado: true,
      motivoDoFreio: "failure_rate",
      enviadasNoDia: 486,
      recebidasNoDia: 11,
      falhas: { falharam: 12, enviadas: 50, proporcao: 0.24 },
    })

    expect(sinal.nivel).toBe("alto")
    expect(sinal.razoes.length).toBeGreaterThanOrEqual(4)
    // A mais grave primeiro: é a que o cliente precisa resolver antes.
    expect(sinal.razoes[0]).toContain("freio de emergência")
  })

  it("toda razão traz número, não só adjetivo", () => {
    const sinal = classificarRisco({ ...SAUDAVEL, enviadasNoDia: 450, recebidasNoDia: 200 })

    for (const razao of sinal.razoes) expect(razao).toMatch(/\d/)
  })

  it("nível baixo nunca traz razão: nada a explicar", () => {
    expect(classificarRisco(SAUDAVEL).razoes).toEqual([])
  })

  it("teto zero não gera proporção infinita na tela", () => {
    const sinal = classificarRisco({ ...SAUDAVEL, tetoHora: 0, tetoDia: 0, enviadasNoDia: 10 })

    for (const razao of sinal.razoes) expect(razao).not.toContain("Infinity")
  })
})
