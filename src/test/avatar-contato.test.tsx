// Círculo do contato no chat: iniciais com nome, ícone de pessoa sem nome
// (antes aparecia o primeiro dígito do telefone).

import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { AvatarContato } from "@/components/shared/avatar-contato"

describe("AvatarContato", () => {
  it("com nome, mostra as iniciais do primeiro e do último nome", () => {
    const { container } = render(<AvatarContato nome="maria  da Silva" />)
    expect(container.textContent).toBe("MS")
    expect(screen.queryByLabelText("Contato sem nome")).toBeNull()
  })

  it("nome de uma palavra mostra uma inicial", () => {
    const { container } = render(<AvatarContato nome="Joana" />)
    expect(container.textContent).toBe("J")
  })

  it("sem nome, ou só com espaços, mostra o ícone de pessoa e nenhum dígito", () => {
    for (const nome of [null, "   "]) {
      const { container, unmount } = render(<AvatarContato nome={nome} />)
      expect(screen.getByLabelText("Contato sem nome")).toBeTruthy()
      expect(container.textContent).toBe("")
      unmount()
    }
  })

  it("com foto, mostra a imagem com o nome como texto alternativo", () => {
    render(<AvatarContato nome="Ana Souza" fotoUrl="https://assinada/ws/c.jpg?t=1" />)
    const img = screen.getByRole("img", { name: "Ana Souza" })
    expect(img.getAttribute("src")).toBe("https://assinada/ws/c.jpg?t=1")
  })

  it("CA-B29-16: foto que não carrega volta às iniciais, sem imagem quebrada", () => {
    const { container } = render(<AvatarContato nome="Ana Souza" fotoUrl="https://assinada/ws/c.jpg?t=vencido" />)
    fireEvent.error(screen.getByRole("img"))
    expect(container.querySelector("img")).toBeNull()
    expect(container.textContent).toBe("AS")
  })
})
