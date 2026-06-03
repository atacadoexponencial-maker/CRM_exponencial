import { describe, it, expect } from "vitest"
import { calcularClassificacao } from "@/app/(auth)/contatos/actions"

describe("Issue 11 — Classificação automática derivada do pipeline", () => {
  it("Contato sem card retorna classificação 'sem_historico'", () => {
    expect(calcularClassificacao([])).toBe("sem_historico")
  })

  it("Contato com card em Expansão (etapa != 'primeira_compra') retorna 'lead'", () => {
    expect(calcularClassificacao([{ funil: "expansao", etapa: "lead" }])).toBe("lead")
    expect(calcularClassificacao([{ funil: "expansao", etapa: "em_qualificacao" }])).toBe("lead")
    expect(calcularClassificacao([{ funil: "expansao", etapa: "em_negociacao" }])).toBe("lead")
    expect(calcularClassificacao([{ funil: "expansao", etapa: "primeira_compra" }])).toBe("lead")
  })

  it("Contato com card em Retenção na etapa 'em_onboarding' retorna 'ativo'", () => {
    expect(calcularClassificacao([{ funil: "retencao", etapa: "em_onboarding" }])).toBe("ativo")
  })

  it("Contato com card em Retenção na etapa 'cliente_ativo' retorna 'ativo'", () => {
    expect(calcularClassificacao([{ funil: "retencao", etapa: "cliente_ativo" }])).toBe("ativo")
  })

  it("Contato com card em Retenção na etapa 'aguardando_recompra' retorna 'ativo'", () => {
    expect(calcularClassificacao([{ funil: "retencao", etapa: "aguardando_recompra" }])).toBe("ativo")
  })

  it("Contato com card em Retenção na etapa 'recompra_realizada' retorna 'ativo'", () => {
    expect(calcularClassificacao([{ funil: "retencao", etapa: "recompra_realizada" }])).toBe("ativo")
  })

  it("Contato com card em Retenção na etapa 'em_risco' retorna 'em_risco'", () => {
    expect(calcularClassificacao([{ funil: "retencao", etapa: "em_risco" }])).toBe("em_risco")
  })

  it("Contato com card em Retenção na etapa 'inativo' retorna 'inativo'", () => {
    expect(calcularClassificacao([{ funil: "retencao", etapa: "inativo" }])).toBe("inativo")
  })

  it("Contato com card em Retenção na etapa 'perdido' retorna 'perdido'", () => {
    expect(calcularClassificacao([{ funil: "retencao", etapa: "perdido" }])).toBe("perdido")
  })

  it("Quando há card em Expansão e Retenção simultaneamente, Retenção tem precedência", () => {
    const cards = [
      { funil: "expansao", etapa: "em_qualificacao" },
      { funil: "retencao", etapa: "cliente_ativo" },
    ]
    expect(calcularClassificacao(cards)).toBe("ativo")
  })

  it("Retenção 'em_risco' tem precedência sobre card de Expansão", () => {
    const cards = [
      { funil: "expansao", etapa: "lead" },
      { funil: "retencao", etapa: "em_risco" },
    ]
    expect(calcularClassificacao(cards)).toBe("em_risco")
  })
})
