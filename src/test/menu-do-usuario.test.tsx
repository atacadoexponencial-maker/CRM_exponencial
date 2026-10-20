// Bolinha do usuário no topo (pedido dela em 20/10/2026): iniciais; ao clicar,
// nome, e-mail, "Meu perfil" e "Sair", que encerra a sessão sem passar pelo perfil.

import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

const push = vi.fn()
const sair = vi.fn(async () => {})
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }))
vi.mock("@/app/(auth)/perfil/actions", () => ({ realizarLogout: () => sair() }))

import { iniciaisDe, MenuDoUsuario } from "@/components/shared/menu-do-usuario"

describe("iniciais", () => {
  it("duas do nome; uma só vira as duas primeiras letras; sem nome, a do e-mail", () => {
    expect(iniciaisDe("Marcelle Fernandes de Mesquita", "m@x.com")).toBe("MM")
    expect(iniciaisDe("Ana", "a@x.com")).toBe("AN")
    expect(iniciaisDe("", "luan@x.com")).toBe("L")
  })
})

describe("menu do usuário", () => {
  it("mostra as iniciais; ao abrir, nome, e-mail, Meu perfil e Sair", async () => {
    render(<MenuDoUsuario nome="Marcelle Mesquita" email="marcelle@exemplo.com" />)
    const bolinha = screen.getByLabelText("Menu do usuário")
    expect(bolinha.textContent).toBe("MM")

    fireEvent.click(bolinha)
    await waitFor(() => expect(screen.getByText("marcelle@exemplo.com")).toBeTruthy())
    expect(screen.getByText("Marcelle Mesquita")).toBeTruthy()

    fireEvent.click(screen.getByText("Meu perfil"))
    expect(push).toHaveBeenCalledWith("/perfil")

    fireEvent.click(bolinha)
    fireEvent.click(await screen.findByText("Sair"))
    expect(sair).toHaveBeenCalled()
  })
})
