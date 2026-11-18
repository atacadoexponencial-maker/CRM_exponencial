// B23-04 — A mensagem que o vendedor mandou pelo celular (número em coexistência)
// aparece no balão do chat do lado da empresa, com "Enviada pelo celular" (parte de
// tela do CA-B23-19). O mesmo balão da B25-02, agora alimentado pelo eco da Meta.

import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { BalaoMensagem } from "@/app/(auth)/chat/components/balao-mensagem"
import type { Mensagem } from "@/app/(auth)/chat/tipos-mensagem"

const doCelular: Mensagem = {
  id: "eco-1",
  conversaId: "conv-1",
  tipo: "texto",
  direcao: "enviada",
  conteudo: "Fechado, mando hoje",
  horario: "09:12",
  status: "enviado",
  enviadaPeloCelular: true,
}

describe("B23-04 — Eco do celular no balão", () => {
  it('CA-B23-19: should mostrar a mensagem do lado da empresa com "Enviada pelo celular"', () => {
    const { container } = render(<BalaoMensagem mensagem={doCelular} />)
    expect(screen.getByText("Enviada pelo celular")).toBeTruthy()
    expect(screen.getByText("Fechado, mando hoje")).toBeTruthy()
    expect(container.firstElementChild?.className).toContain("justify-end")
  })
})
