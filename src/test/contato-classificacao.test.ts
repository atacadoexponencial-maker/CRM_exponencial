import { describe, it, expect } from "vitest"
import { calcularClassificacao } from "@/app/(auth)/contatos/classificacao"

describe("Issue 11 — Classificação automática derivada do pipeline", () => {
  it("Contato sem card retorna classificação 'sem_historico'", () => {
    expect(calcularClassificacao([])).toBe("sem_historico")
  })

  it("Contato com card em Entrada (etapa != 'ganho') retorna 'lead'", () => {
    expect(calcularClassificacao([{ funil: "entrada", etapa: "lead" }])).toBe("lead")
    expect(calcularClassificacao([{ funil: "entrada", etapa: "sondagem" }])).toBe("lead")
    expect(calcularClassificacao([{ funil: "entrada", etapa: "negociacao" }])).toBe("lead")
    expect(calcularClassificacao([{ funil: "entrada", etapa: "ganho" }])).toBe("lead")
  })

  it("Contato com card em Recompra na etapa 'onboarding' retorna 'ativo'", () => {
    expect(calcularClassificacao([{ funil: "recompra", etapa: "onboarding" }])).toBe("ativo")
  })

  it("Contato com card em Recompra na etapa 'ativos' retorna 'ativo'", () => {
    expect(calcularClassificacao([{ funil: "recompra", etapa: "ativos" }])).toBe("ativo")
  })

  it("Contato com card em Recompra na etapa 'reposicao' retorna 'ativo'", () => {
    expect(calcularClassificacao([{ funil: "recompra", etapa: "reposicao" }])).toBe("ativo")
  })

  it("B15-01 — Contato com card em Recompra na etapa 'inativos_rp' retorna 'inativo'", () => {
    expect(calcularClassificacao([{ funil: "recompra", etapa: "inativos_rp" }])).toBe("inativo")
  })

  it("Contato com card em Recompra na etapa 'ativos_ri' retorna 'em_risco'", () => {
    expect(calcularClassificacao([{ funil: "recompra", etapa: "ativos_ri" }])).toBe("em_risco")
  })

  it("Contato com card em Recompra na etapa 'inativos' retorna 'inativo'", () => {
    expect(calcularClassificacao([{ funil: "recompra", etapa: "inativos" }])).toBe("inativo")
  })

  it("Contato com card em Recompra na etapa 'perdidos' retorna 'perdido'", () => {
    expect(calcularClassificacao([{ funil: "recompra", etapa: "perdidos" }])).toBe("perdido")
  })

  it("Quando há card em Entrada e Recompra simultaneamente, Recompra tem precedência", () => {
    const cards = [
      { funil: "entrada", etapa: "sondagem" },
      { funil: "recompra", etapa: "ativos" },
    ]
    expect(calcularClassificacao(cards)).toBe("ativo")
  })

  it("Recompra 'em_risco' tem precedência sobre card de Entrada", () => {
    const cards = [
      { funil: "entrada", etapa: "lead" },
      { funil: "recompra", etapa: "ativos_ri" },
    ]
    expect(calcularClassificacao(cards)).toBe("em_risco")
  })
})
