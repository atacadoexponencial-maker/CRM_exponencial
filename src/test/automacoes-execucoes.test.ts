// Testes das partes puras do histórico de execuções (B11-03): os passos gravados
// a partir do caminho, o resultado da execução e o evento sem empresa e contato.

import { describe, it, expect } from "vitest"
import { eventoGravado, passosDoCaminho, resultadoDoCaminho } from "@/lib/automacoes/execucoes"
import type { CaminhoPercorrido, Fluxo } from "@/lib/fluxo-automacao"

const posicao = { x: 0, y: 0 }
const fluxo: Fluxo = {
  blocos: [
    { id: "g", tipo: "gatilho", gatilho: "card_movido", parametros: { funil: "entrada" }, posicao },
    { id: "c", tipo: "condicao", verificacoes: [{ id: "v", tipo: "tag_contato", operador: "tem", valor: "vip" }], posicao },
    { id: "a1", tipo: "acao", acao: "aplicar_etiqueta", parametros: { label_id: "l" }, posicao },
    { id: "a2", tipo: "acao", acao: "atribuir_atendente", parametros: { atendente_id: "u" }, posicao },
  ],
  ligacoes: [],
}

const caminho = (parcial: Partial<CaminhoPercorrido>): CaminhoPercorrido => ({
  blocos: [],
  saidas: {},
  falhas: [],
  motivos: {},
  ...parcial,
})

describe("passosDoCaminho", () => {
  it("guarda a cópia de cada bloco, a saída das condições e o resultado das ações", () => {
    const passos = passosDoCaminho(
      fluxo,
      caminho({
        blocos: ["g", "c", "a1", "a2"],
        saidas: { c: "sim" },
        falhas: ["a1"],
        motivos: { a1: "A etiqueta não existe mais" },
      })
    )

    expect(passos.map((p) => [p.bloco.id, p.saida, p.ok, p.motivo])).toEqual([
      ["g", undefined, undefined, undefined],
      ["c", "sim", undefined, undefined],
      ["a1", undefined, false, "A etiqueta não existe mais"],
      ["a2", undefined, true, undefined],
    ])
    expect(passos[2].bloco).toEqual(fluxo.blocos[2])
  })

  it("a condição que deu erro fica marcada com o motivo", () => {
    const passos = passosDoCaminho(
      fluxo,
      caminho({ blocos: ["g", "c"], erro: { bloco: "c", motivo: "erro ao consultar o banco" } })
    )
    expect(passos[1]).toMatchObject({ ok: false, motivo: "erro ao consultar o banco" })
  })
})

describe("resultadoDoCaminho", () => {
  it("concluída sem falhas; falhou com ação que falhou ou condição com erro", () => {
    expect(resultadoDoCaminho(caminho({ blocos: ["g", "a2"] }))).toBe("concluida")
    expect(resultadoDoCaminho(caminho({ falhas: ["a1"] }))).toBe("falhou")
    expect(resultadoDoCaminho(caminho({ erro: { bloco: "c", motivo: "x" } }))).toBe("falhou")
  })
})

describe("eventoGravado", () => {
  it("guarda o que aconteceu, sem a empresa e o contato, que têm coluna própria", () => {
    expect(
      eventoGravado({ tipo: "card_movido", workspaceId: "ws", contactId: "c", cardId: "card", funil: "entrada", etapa: "lead" })
    ).toEqual({ tipo: "card_movido", funil: "entrada", etapa: "lead", cardId: "card" })
    expect(eventoGravado({ tipo: "conversa_criada", workspaceId: "ws", contactId: "c", conversationId: "conv" })).toEqual({
      tipo: "conversa_criada",
      conversationId: "conv",
    })
  })
})
