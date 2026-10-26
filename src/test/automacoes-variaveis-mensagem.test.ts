// B22-14 — botões de variável no campo "Mensagem" (pedido U3 da Marcelle,
// 09/10/2026): a variável entra no cursor ou no lugar da seleção, e o cursor fica
// depois dela. Os botões na tela são conferidos no preview (e2e/preview/roteiro-b22-14.cjs).

import { describe, expect, it } from "vitest"
import { VARIAVEIS_DA_MENSAGEM, inserirNoCursor } from "@/app/(auth)/configuracoes/automacoes/components/variaveis-mensagem"
import { textoComVariaveis } from "@/lib/automacoes/envio"

describe("B22-14 — inserir variável no cursor", () => {
  it("no meio do texto", () => {
    expect(inserirNoCursor("Oi , tudo bem?", 3, 3, "{{primeiro_nome}}")).toEqual({
      texto: "Oi {{primeiro_nome}}, tudo bem?",
      cursor: 20,
    })
  })

  it("no lugar do trecho selecionado", () => {
    expect(inserirNoCursor("Oi FULANO!", 3, 9, "{{nome_contato}}")).toEqual({ texto: "Oi {{nome_contato}}!", cursor: 19 })
  })

  it("no campo vazio", () => {
    expect(inserirNoCursor("", 0, 0, "{{nome_vendedor}}")).toEqual({ texto: "{{nome_vendedor}}", cursor: 17 })
  })

  // B38-05: o botão insere a variável com o texto reserva
  it("todo botão insere uma variável que o envio preenche", () => {
    for (const { chave } of VARIAVEIS_DA_MENSAGEM) {
      const variavel = `{{${chave}|reserva}}`
      const enviado = textoComVariaveis(variavel, { nomeContato: "Ana Souza", primeiroNome: "Ana", nomeVendedor: "Bruno" })
      expect(enviado, variavel).not.toContain("{{")
    }
  })
})
