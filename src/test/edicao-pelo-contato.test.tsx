// B23-05 — Mensagem editada ou apagada pelo contato no balão do chat (parte de tela
// dos CA-B23-24 e CA-B23-25).

import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { BalaoMensagem } from "@/app/(auth)/chat/components/balao-mensagem"
import type { Mensagem } from "@/app/(auth)/chat/tipos-mensagem"

const recebida: Mensagem = {
  id: "msg-1",
  conversaId: "conv-1",
  tipo: "texto",
  direcao: "recebida",
  conteudo: "Quero 20 caixas",
  horario: "10:05",
}

describe("B23-05 — Edição e exclusão pelo contato no balão", () => {
  it('CA-B23-24: should mostrar o texto novo com a marca "editada"', () => {
    render(<BalaoMensagem mensagem={{ ...recebida, conteudo: "Quero 25 caixas", editada: true }} />)
    expect(screen.getByText("Quero 25 caixas")).toBeTruthy()
    expect(screen.getByText("editada")).toBeTruthy()
    expect(screen.queryByText("Quero 20 caixas")).toBeNull()
  })

  it('CA-B23-25: should mostrar "Mensagem apagada" no lugar do conteúdo', () => {
    render(<BalaoMensagem mensagem={{ ...recebida, id: "msg-2", apagada: true }} />)
    expect(screen.getByText("Mensagem apagada")).toBeTruthy()
    expect(screen.queryByText("Quero 20 caixas")).toBeNull()
  })

  it("CA-B23-24: should not marcar nada numa mensagem que o contato não editou nem apagou", () => {
    render(<BalaoMensagem mensagem={{ ...recebida, id: "msg-3" }} />)
    expect(screen.getByText("Quero 20 caixas")).toBeTruthy()
    expect(screen.queryByText("editada")).toBeNull()
    expect(screen.queryByText("Mensagem apagada")).toBeNull()
  })
})
