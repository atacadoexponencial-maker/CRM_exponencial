// B41-04 — o editor de automações oferece os funis da empresa e as etapas deles, e as
// frases de resumo usam o nome atual do funil e da etapa.

import { describe, expect, it } from "vitest"
import {
  ACOES,
  GATILHOS,
  VERIFICACOES,
  etapasDoFunil,
  funisDoEditor,
  opcoesDaFonte,
  referenciasQueSumiram,
  type OpcoesEditor,
} from "@/app/(auth)/configuracoes/automacoes/components/catalogo"
import { fraseAcao, fraseVerificacao, resumoRegra } from "@/app/(auth)/configuracoes/automacoes/components/frases-fluxo"
import type { Fluxo } from "@/lib/fluxo-automacao"

const FEIRA = "11111111-1111-4111-8111-111111111111"
const posicao = { x: 0, y: 0 }

function opcoes(nomeDoFunil = "Feira de Março", nomeDaEtapa = "Confirmou"): OpcoesEditor {
  return {
    etiquetas: [], atendentes: [], tags: [], times: [], sequencias: [], mensagensRapidas: [], numeros: [],
    horarioComercial: { dias: [1, 2, 3, 4, 5], inicio: "08:00", fim: "18:00" },
    funis: [{ id: FEIRA, nome: nomeDoFunil, etapas: [{ id: "e-convidado", nome: "Convidado" }, { id: "e-confirmou", nome: nomeDaEtapa }, { id: "e-visitou", nome: "Visitou o estande" }] }],
  } as unknown as OpcoesEditor
}

const fluxo: Fluxo = {
  blocos: [
    { id: "g", tipo: "gatilho", gatilho: "card_movido", parametros: { funil: FEIRA, etapa: "e-confirmou" }, posicao },
    { id: "a", tipo: "acao", acao: "mover_card", parametros: { funil: FEIRA, etapa: "e-visitou" }, posicao },
  ],
  ligacoes: [{ de: "g", saida: "proximo", para: "a" }],
}

describe("B41-04 — Funis da empresa no editor de automações", () => {
  it("CA-B41-29: should oferecer Entrada, Recompra e o funil da empresa, com as etapas dele na ordem", () => {
    const o = opcoes()
    // Gatilho e ação usam a fonte "funis" no campo Funil; a condição, o seletor de funil e etapa.
    expect(GATILHOS.card_movido.campos.find((c) => c.chave === "funil")).toMatchObject({ tipo: "opcoes", fonte: "funis" })
    expect(ACOES.mover_card.campos.find((c) => c.chave === "funil")).toMatchObject({ tipo: "opcoes", fonte: "funis" })
    expect(VERIFICACOES.card_etapa.valor.tipo).toBe("funil_etapa")

    expect(opcoesDaFonte("funis", o).map((f) => f.nome)).toEqual(["Funil de Entrada", "Funil de Recompra", "Feira de Março"])
    expect(funisDoEditor(o).map((f) => f.nome)).toEqual(["Funil de Entrada", "Funil de Recompra", "Feira de Março"])
    expect(etapasDoFunil(FEIRA, o).map((e) => e.nome)).toEqual(["Convidado", "Confirmou", "Visitou o estande"])
    // Entrada e Recompra continuam com as etapas de sempre
    expect(etapasDoFunil("entrada", o)[0].nome).toBe("Lead")
    expect(etapasDoFunil("recompra", o)[0].nome).toBe("Onboarding")
    // Sem os funis da empresa (outra empresa, ou funil apagado), não há etapas
    expect(etapasDoFunil(FEIRA, { ...o, funis: [] })).toEqual([])
  })

  it("CA-B41-34: should usar no resumo o nome atual do funil e da etapa", () => {
    expect(resumoRegra(fluxo, opcoes())).toContain('Quando o card entrar em "Confirmou" (Feira de Março)')
    expect(fraseAcao(fluxo.blocos[1] as Extract<Fluxo["blocos"][number], { tipo: "acao" }>, opcoes())).toBe('Mover card para "Visitou o estande" (Feira de Março)')
    expect(fraseVerificacao({ id: "v", tipo: "card_etapa", operador: "esta_em", valor: `${FEIRA}:e-confirmou` }, opcoes())).toContain("Confirmou (Feira de Março)")

    const renomeado = opcoes("Feira de Abril", "Confirmado")
    expect(resumoRegra(fluxo, renomeado)).toContain('Quando o card entrar em "Confirmado" (Feira de Abril)')
    expect(referenciasQueSumiram(fluxo, renomeado)).toEqual({})

    // Funil apagado: a frase diz que não existe mais e o bloco precisa de ajuste
    const semFunil = { ...opcoes(), funis: [] }
    expect(resumoRegra(fluxo, semFunil)).toContain("(não existe mais)")
    expect(referenciasQueSumiram(fluxo, semFunil).g[0]).toContain("precisa de ajuste")
  })
})
