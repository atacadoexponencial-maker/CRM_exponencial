// B22-13 — "Duplicar" no painel do bloco (pedido U1 da Marcelle, 09/10/2026): a
// cópia leva os mesmos parâmetros e verificações, com ids novos, e não divide
// objetos com o original. O botão na tela é conferido no preview
// (e2e/preview/roteiro-b22-13.cjs).

import { describe, expect, it } from "vitest"
import { copiaDoBloco, type BlocoAcao, type BlocoCondicao } from "@/lib/fluxo-automacao"

const ids = () => {
  let n = 0
  return () => `v-novo-${++n}`
}

describe("B22-13 — cópia de um bloco", () => {
  it("ação: mesmos parâmetros, id e posição novos", () => {
    const original: BlocoAcao = {
      id: "a",
      tipo: "acao",
      acao: "enviar_mensagem",
      parametros: { texto: "Olá, {{nome_contato}}" },
      posicao: { x: 0, y: 200 },
    }
    const copia = copiaDoBloco(original, "a2", { x: 40, y: 400 }, ids()) as BlocoAcao
    expect(copia).toEqual({ ...original, id: "a2", posicao: { x: 40, y: 400 } })
    copia.parametros.texto = "mudado"
    expect(original.parametros.texto).toBe("Olá, {{nome_contato}}")
  })

  it("condição: mesmas verificações, cada uma com id novo", () => {
    const original: BlocoCondicao = {
      id: "c",
      tipo: "condicao",
      verificacoes: [
        { id: "v1", tipo: "tag_contato", operador: "tem", valor: "vip" },
        { id: "v2", tipo: "canal", operador: "e", valor: "oficial" },
      ],
      posicao: { x: 0, y: 100 },
    }
    const copia = copiaDoBloco(original, "c2", { x: 40, y: 300 }, ids()) as BlocoCondicao
    expect(copia.id).toBe("c2")
    expect(copia.verificacoes.map((v) => v.id)).toEqual(["v-novo-1", "v-novo-2"])
    expect(copia.verificacoes.map(({ tipo, operador, valor }) => ({ tipo, operador, valor }))).toEqual(
      original.verificacoes.map(({ tipo, operador, valor }) => ({ tipo, operador, valor }))
    )
    copia.verificacoes[0].valor = "atacado"
    expect(original.verificacoes[0].valor).toBe("vip")
  })
})
