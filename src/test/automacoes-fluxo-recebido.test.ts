// Testes do formato do fluxo conferido no servidor (B11-10) e do que o fluxo
// cita de fora dele (etiquetas, atendentes, números e etapas).

import { describe, it, expect } from "vitest"
import { lerFluxo } from "@/lib/automacoes/fluxo-recebido"
import { dadoDoContatoValido, etapaValida, referenciasDoFluxo } from "@/lib/automacoes/referencias"
import type { Fluxo } from "@/lib/fluxo-automacao"

const posicao = { x: 10, y: 20 }

const fluxoValido: Fluxo = {
  blocos: [
    { id: "g", tipo: "gatilho", gatilho: "card_movido", parametros: { funil: "entrada", etapa: "sondagem" }, posicao },
    {
      id: "c",
      tipo: "condicao",
      verificacoes: [
        { id: "v1", tipo: "etiqueta_conversa", operador: "tem", valor: "label-1" },
        { id: "v2", tipo: "atendente", operador: "e", valor: "user-1" },
        { id: "v3", tipo: "canal", operador: "e", valor: "numero:conn-1" },
        { id: "v4", tipo: "card_etapa", operador: "esta_em", valor: "recompra:ativos" },
      ],
      posicao,
    },
    { id: "a1", tipo: "acao", acao: "atribuir_atendente", parametros: { atendente_id: "user-2" }, posicao },
    { id: "a2", tipo: "acao", acao: "aplicar_etiqueta", parametros: { label_id: "label-1" }, posicao },
    { id: "a3", tipo: "acao", acao: "mover_card", parametros: { funil: "entrada", etapa: "negociacao" }, posicao },
  ],
  ligacoes: [
    { de: "g", saida: "proximo", para: "c" },
    { de: "c", saida: "sim", para: "a1" },
    { de: "c", saida: "nao", para: "a2" },
    { de: "a2", saida: "proximo", para: "a3" },
  ],
}

describe("lerFluxo", () => {
  it("aceita o formato que o editor manda", () => {
    expect(lerFluxo(fluxoValido)).toEqual(fluxoValido)
  })

  it("descarta campos que não fazem parte do fluxo", () => {
    const comSobra = {
      ...fluxoValido,
      extra: "x",
      blocos: fluxoValido.blocos.map((b) => ({ ...b, selected: true, data: { qualquer: 1 } })),
    }
    const lido = lerFluxo(comSobra)
    expect(lido).toEqual(fluxoValido)
  })

  it("recusa gatilho ou ação que não existem", () => {
    const gatilhoInventado = { ...fluxoValido, blocos: [{ ...fluxoValido.blocos[0], gatilho: "apagar_tudo" }] }
    const acaoInventada = {
      ...fluxoValido,
      blocos: [fluxoValido.blocos[0], { id: "a", tipo: "acao", acao: "apagar_tudo", parametros: {}, posicao }],
    }
    expect(lerFluxo(gatilhoInventado)).toBeNull()
    expect(lerFluxo(acaoInventada)).toBeNull()
  })

  it("recusa blocos com o mesmo id, ligação com saída inventada e parâmetro que não é texto", () => {
    const idRepetido = { ...fluxoValido, blocos: [fluxoValido.blocos[0], { ...fluxoValido.blocos[2], id: "g" }] }
    const saidaInventada = { ...fluxoValido, ligacoes: [{ de: "g", saida: "talvez", para: "c" }] }
    const parametroNumero = {
      ...fluxoValido,
      blocos: [{ ...fluxoValido.blocos[0], parametros: { funil: 1 } }],
    }
    expect(lerFluxo(idRepetido)).toBeNull()
    expect(lerFluxo(saidaInventada)).toBeNull()
    expect(lerFluxo(parametroNumero)).toBeNull()
  })

  it("recusa o que nem é um fluxo", () => {
    expect(lerFluxo(null)).toBeNull()
    expect(lerFluxo("fluxo")).toBeNull()
    expect(lerFluxo({ blocos: "x", ligacoes: [] })).toBeNull()
  })
})

describe("referenciasDoFluxo", () => {
  it("junta etiquetas, atendentes, números e etapas citados em blocos e verificações", () => {
    const refs = referenciasDoFluxo(fluxoValido)
    expect(refs.etiquetas).toEqual(["label-1"])
    expect(refs.atendentes.sort()).toEqual(["user-1", "user-2"])
    expect(refs.conexoes).toEqual(["conn-1"])
    // Na ordem dos blocos: gatilho, verificação da condição, ação "mover card"
    expect(refs.etapas).toEqual([
      { funil: "entrada", etapa: "sondagem" },
      { funil: "recompra", etapa: "ativos" },
      { funil: "entrada", etapa: "negociacao" },
    ])
  })

  it("atendente 'sem atendente' não cita ninguém", () => {
    const fluxo: Fluxo = {
      blocos: [
        {
          id: "c",
          tipo: "condicao",
          verificacoes: [{ id: "v", tipo: "atendente", operador: "sem_atendente", valor: "" }],
          posicao,
        },
      ],
      ligacoes: [],
    }
    expect(referenciasDoFluxo(fluxo).atendentes).toEqual([])
  })
})

describe("referencias das ações da B11-11", () => {
  it("junta os times e os dados do contato citados", () => {
    const fluxo: Fluxo = {
      blocos: [
        { id: "a1", tipo: "acao", acao: "atribuir_time", parametros: { time_id: "time-1" }, posicao },
        { id: "a2", tipo: "acao", acao: "alterar_dado_contato", parametros: { campo: "tipo", valor: "lojista" }, posicao },
      ],
      ligacoes: [],
    }
    const refs = referenciasDoFluxo(fluxo)
    expect(refs.times).toEqual(["time-1"])
    expect(refs.dadosDoContato).toEqual([{ campo: "tipo", valor: "lojista" }])
  })
})

describe("dadoDoContatoValido", () => {
  it("aceita tipo da lista, nicho, cidade e observações", () => {
    expect(dadoDoContatoValido("tipo", "lojista")).toBe(true)
    expect(dadoDoContatoValido("nicho", "Moda praia")).toBe(true)
    expect(dadoDoContatoValido("cidade", "Fortaleza")).toBe(true)
    expect(dadoDoContatoValido("observacoes", "Pediu catálogo")).toBe(true)
  })

  it("recusa classificação, campo inventado, tipo fora da lista, valor vazio e texto longo demais", () => {
    expect(dadoDoContatoValido("classificacao", "ativo")).toBe(false)
    expect(dadoDoContatoValido("telefone", "999")).toBe(false)
    expect(dadoDoContatoValido("tipo", "atacadista")).toBe(false)
    expect(dadoDoContatoValido("tipo", "toString")).toBe(false)
    expect(dadoDoContatoValido("cidade", "   ")).toBe(false)
    expect(dadoDoContatoValido("nicho", "x".repeat(101))).toBe(false)
  })
})

describe("etapaValida", () => {
  it("aceita etapa do funil e 'qualquer etapa'", () => {
    expect(etapaValida({ funil: "entrada", etapa: "sondagem" })).toBe(true)
    expect(etapaValida({ funil: "recompra", etapa: "ativos" })).toBe(true)
    expect(etapaValida({ funil: "entrada", etapa: "" })).toBe(true)
  })

  it("recusa funil que não existe e etapa de outro funil", () => {
    expect(etapaValida({ funil: "vendas", etapa: "" })).toBe(false)
    expect(etapaValida({ funil: "entrada", etapa: "ativos" })).toBe(false)
  })
})
