import { describe, it, expect } from "vitest"
import { calcularClassificacao } from "@/app/(auth)/contatos/classificacao"

describe("Issue 11 — Classificação automática derivada do pipeline", () => {
  it("Contato sem card retorna classificação 'sem_historico'", () => {
    expect(calcularClassificacao([])).toBe("sem_historico")
  })

  it("Contato com card em Entrada (etapa != 'primeira_compra') retorna 'lead'", () => {
    expect(calcularClassificacao([{ funil: "entrada", etapa: "lead" }])).toBe("lead")
    expect(calcularClassificacao([{ funil: "entrada", etapa: "em_qualificacao" }])).toBe("lead")
    expect(calcularClassificacao([{ funil: "entrada", etapa: "em_negociacao" }])).toBe("lead")
    expect(calcularClassificacao([{ funil: "entrada", etapa: "primeira_compra" }])).toBe("lead")
  })

  it("Contato com card em Recompra na etapa 'em_onboarding' retorna 'ativo'", () => {
    expect(calcularClassificacao([{ funil: "recompra", etapa: "em_onboarding" }])).toBe("ativo")
  })

  it("Contato com card em Recompra na etapa 'cliente_ativo' retorna 'ativo'", () => {
    expect(calcularClassificacao([{ funil: "recompra", etapa: "cliente_ativo" }])).toBe("ativo")
  })

  it("Contato com card em Recompra na etapa 'aguardando_recompra' retorna 'ativo'", () => {
    expect(calcularClassificacao([{ funil: "recompra", etapa: "aguardando_recompra" }])).toBe("ativo")
  })

  it("Contato com card em Recompra na etapa 'recompra_realizada' retorna 'ativo'", () => {
    expect(calcularClassificacao([{ funil: "recompra", etapa: "recompra_realizada" }])).toBe("ativo")
  })

  it("Contato com card em Recompra na etapa 'em_risco' retorna 'em_risco'", () => {
    expect(calcularClassificacao([{ funil: "recompra", etapa: "em_risco" }])).toBe("em_risco")
  })

  it("Contato com card em Recompra na etapa 'inativo' retorna 'inativo'", () => {
    expect(calcularClassificacao([{ funil: "recompra", etapa: "inativo" }])).toBe("inativo")
  })

  it("Contato com card em Recompra na etapa 'perdido' retorna 'perdido'", () => {
    expect(calcularClassificacao([{ funil: "recompra", etapa: "perdido" }])).toBe("perdido")
  })

  it("Quando há card em Entrada e Recompra simultaneamente, Recompra tem precedência", () => {
    const cards = [
      { funil: "entrada", etapa: "em_qualificacao" },
      { funil: "recompra", etapa: "cliente_ativo" },
    ]
    expect(calcularClassificacao(cards)).toBe("ativo")
  })

  it("Recompra 'em_risco' tem precedência sobre card de Entrada", () => {
    const cards = [
      { funil: "entrada", etapa: "lead" },
      { funil: "recompra", etapa: "em_risco" },
    ]
    expect(calcularClassificacao(cards)).toBe("em_risco")
  })
})
