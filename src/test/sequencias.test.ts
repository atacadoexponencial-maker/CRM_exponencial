// Testes unitários do Módulo 4: helpers do motor de sequências e cálculo de alertas.

import { describe, it, expect } from "vitest"
import { substituirVariaveis, calcularProximaExecucao } from "@/lib/sequencias"
import { calcularAlertas, CONFIG_ALERTAS_PADRAO, type CardParaAlerta } from "@/lib/alertas"

describe("substituirVariaveis", () => {
  it("substitui nome do contato e do vendedor", () => {
    const resultado = substituirVariaveis(
      "Olá {{nome_contato}}! Aqui é {{nome_vendedor}}.",
      { nomeContato: "Padaria Central", nomeVendedor: "Ana" }
    )
    expect(resultado).toBe("Olá Padaria Central! Aqui é Ana.")
  })

  it("substitui múltiplas ocorrências da mesma variável", () => {
    const resultado = substituirVariaveis(
      "{{nome_contato}}, confirma? {{nome_contato}}?",
      { nomeContato: "João", nomeVendedor: "" }
    )
    expect(resultado).toBe("João, confirma? João?")
  })

  it("mantém o texto sem variáveis intacto", () => {
    expect(substituirVariaveis("Sem variáveis", { nomeContato: "X", nomeVendedor: "Y" })).toBe(
      "Sem variáveis"
    )
  })
})

describe("calcularProximaExecucao", () => {
  it("soma o prazo em dias à data base", () => {
    const base = new Date("2026-06-10T10:00:00")
    const proxima = calcularProximaExecucao(base, 3)
    expect(proxima.getDate()).toBe(13)
  })

  it("prazo 0 mantém o mesmo dia", () => {
    const base = new Date("2026-06-10T10:00:00")
    const proxima = calcularProximaExecucao(base, 0)
    expect(proxima.getTime()).toBe(base.getTime())
  })
})

describe("calcularAlertas", () => {
  const agora = new Date("2026-06-12T12:00:00")

  function card(parcial: Partial<CardParaAlerta> & { id: string }): CardParaAlerta {
    return {
      funil: "expansao",
      etapa: "lead",
      etapa_changed_at: "2026-06-10T10:00:00",
      contact_id: `contato-${parcial.id}`,
      contatoNome: "Contato Teste",
      atendenteNome: null,
      ultimaAtividade: null,
      ...parcial,
    }
  }

  it("gera alerta de lead sem resposta após o limiar", () => {
    const cards = [
      card({ id: "1", ultimaAtividade: "2026-06-08T10:00:00" }), // 4 dias
      card({ id: "2", ultimaAtividade: "2026-06-11T10:00:00" }), // 1 dia
    ]
    const alertas = calcularAlertas(cards, CONFIG_ALERTAS_PADRAO, [], agora)
    expect(alertas).toHaveLength(1)
    expect(alertas[0].cardId).toBe("1")
    expect(alertas[0].tipo).toBe("lead_sem_resposta")
  })

  it("não gera alerta de lead para card em primeira_compra", () => {
    const cards = [card({ id: "1", etapa: "primeira_compra", ultimaAtividade: "2026-05-01T10:00:00" })]
    expect(calcularAlertas(cards, CONFIG_ALERTAS_PADRAO, [], agora)).toHaveLength(0)
  })

  it("gera alertas de retenção por tempo parado na etapa", () => {
    const cards = [
      card({ id: "r1", funil: "retencao", etapa: "aguardando_recompra", etapa_changed_at: "2026-05-01T10:00:00" }), // 42 dias
      card({ id: "r2", funil: "retencao", etapa: "em_risco", etapa_changed_at: "2026-06-01T10:00:00" }), // 11 dias
      card({ id: "r3", funil: "retencao", etapa: "inativo", etapa_changed_at: "2026-06-05T10:00:00" }), // 7 dias < 15
    ]
    const alertas = calcularAlertas(cards, CONFIG_ALERTAS_PADRAO, [], agora)
    const tipos = alertas.map((a) => a.tipo)
    expect(tipos).toContain("sem_recompra")
    expect(tipos).toContain("em_risco")
    expect(tipos).not.toContain("inativo")
  })

  it("respeita limiares configurados", () => {
    const cards = [card({ id: "r1", funil: "retencao", etapa: "inativo", etapa_changed_at: "2026-06-05T10:00:00" })]
    const config = { ...CONFIG_ALERTAS_PADRAO, inativoDias: 5 }
    expect(calcularAlertas(cards, config, [], agora)).toHaveLength(1)
  })

  it("não regera alerta dispensado com a mesma referência", () => {
    const cards = [
      card({ id: "r1", funil: "retencao", etapa: "em_risco", etapa_changed_at: "2026-06-01T10:00:00" }),
    ]
    const dismissals = [{ card_id: "r1", tipo: "em_risco", referencia: "2026-06-01T10:00:00" }]
    expect(calcularAlertas(cards, CONFIG_ALERTAS_PADRAO, dismissals, agora)).toHaveLength(0)
  })

  it("regera alerta quando a referência muda (card voltou a atingir o limiar)", () => {
    const cards = [
      card({ id: "r1", funil: "retencao", etapa: "em_risco", etapa_changed_at: "2026-06-03T10:00:00" }),
    ]
    const dismissals = [{ card_id: "r1", tipo: "em_risco", referencia: "2026-05-01T10:00:00" }]
    expect(calcularAlertas(cards, CONFIG_ALERTAS_PADRAO, dismissals, agora)).toHaveLength(1)
  })
})
