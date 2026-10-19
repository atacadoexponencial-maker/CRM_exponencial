// Marca "Enviada pelo celular" no balão do chat (B25-02): a mensagem que o
// vendedor mandou pelo aparelho aparece do lado da empresa, marcada; a enviada
// pelo CRM, não.

import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { BalaoMensagem } from "@/app/(auth)/chat/components/balao-mensagem"
import type { Mensagem } from "@/app/(auth)/chat/mock-mensagens"

const doCelular: Mensagem = {
  id: "msg-1",
  conversaId: "conv-1",
  tipo: "texto",
  direcao: "enviada",
  conteudo: "Tem sim, segue a tabela",
  horario: "14:32",
  status: "enviado",
  enviadaPeloCelular: true,
}

describe("B25-02 — mensagem enviada pelo celular no balão", () => {
  it("CA-B25-06: a mensagem do celular aparece do lado da empresa com \"Enviada pelo celular\"; a do CRM, sem a marca", () => {
    const { container, unmount } = render(<BalaoMensagem mensagem={doCelular} />)
    expect(screen.getByText("Enviada pelo celular")).toBeTruthy()
    expect(screen.getByText(doCelular.conteudo)).toBeTruthy()
    // Lado da empresa: o mesmo alinhamento à direita das enviadas pelo CRM.
    expect(container.firstElementChild?.className).toContain("justify-end")
    unmount()

    render(<BalaoMensagem mensagem={{ ...doCelular, id: "msg-2", enviadaPeloCelular: undefined }} />)
    expect(screen.queryByText("Enviada pelo celular")).toBeNull()
  })
})
