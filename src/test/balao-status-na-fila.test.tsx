// Mensagem "Na fila do número" no balão do chat (B26-02): relógio enquanto o
// número do canal direto não a envia, e ✓ quando chega o aviso de que saiu.

import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { BalaoMensagem } from "@/app/(auth)/chat/components/balao-mensagem"
import { aplicarStatus } from "@/app/(auth)/chat/mensagens-locais"
import type { Mensagem } from "@/app/(auth)/chat/mock-mensagens"

const naFila: Mensagem = {
  id: "msg-1",
  conversaId: "conv-1",
  tipo: "texto",
  direcao: "enviada",
  conteudo: "Segue o catálogo",
  horario: "15:17",
  status: "na_fila",
}

describe("B26-02 — mensagem na fila no balão", () => {
  it("CA-B26-01: mensagem aceita pela fila mostra o relógio e \"Na fila do número\", e não ✓", () => {
    const { container } = render(<BalaoMensagem mensagem={naFila} />)
    expect(screen.getByText("Na fila do número")).toBeTruthy()
    expect(container.querySelector(".lucide-clock")).not.toBeNull()
    expect(container.querySelector(".lucide-check")).toBeNull()
  })

  it("CA-B26-04: quando chega o aviso de que saiu, o relógio vira ✓", () => {
    const { lista } = aplicarStatus([naFila], "msg-1", "enviado")
    const { container } = render(<BalaoMensagem mensagem={lista[0]} />)
    expect(screen.queryByText("Na fila do número")).toBeNull()
    expect(container.querySelector(".lucide-clock")).toBeNull()
    expect(container.querySelector(".lucide-check")).not.toBeNull()
  })
})
