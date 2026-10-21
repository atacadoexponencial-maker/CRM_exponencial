// B35-02 — diálogos de transferir e remover carteira: confirmação e papel.

import { describe, it, expect, vi, beforeEach } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { calcularPainelDeCarteiras, type ContatoDaCarteira } from "@/lib/relatorios/carteiras"

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
const transferirCarteira = vi.fn()
const removerCarteira = vi.fn()
const buscarCarteiras = vi.fn()
vi.mock("@/app/(auth)/relatorios/actions", () => ({
  buscarCarteiras: (...a: unknown[]) => buscarCarteiras(...a),
  transferirCarteira: (...a: unknown[]) => transferirCarteira(...a),
  removerCarteira: (...a: unknown[]) => removerCarteira(...a),
}))
import { CarteirasClient } from "@/app/(auth)/relatorios/components/carteiras-client"
import type { ResultadoCarteiras } from "@/app/(auth)/relatorios/actions"

const ANA = "a1", BRUNO = "b1"
const contato = (id: string, atendenteId: string | null): ContatoDaCarteira => ({ id, atendenteId, temCompra: false, ativo: false })
const VENDEDORES = [{ id: ANA, nome: "Ana" }, { id: BRUNO, nome: "Bruno" }]
const resultado = (papel: ResultadoCarteiras["papel"]): ResultadoCarteiras => ({
  papel,
  painel: calcularPainelDeCarteiras([contato("c1", ANA), contato("c2", ANA), contato("c3", ANA)], papel === "atendente" ? [VENDEDORES[0]] : VENDEDORES),
  historico: papel === "atendente" ? null : [],
})

beforeEach(() => {
  transferirCarteira.mockReset()
  removerCarteira.mockReset()
  buscarCarteiras.mockReset()
})

describe("B35-02 — transferir e remover carteira (tela)", () => {
  it("CA-B35-07: abrir o diálogo, escolher o destino e cancelar não chama a ação", async () => {
    render(<CarteirasClient inicial={resultado("admin")} />)
    fireEvent.click(screen.getAllByRole("button", { name: /Transferir carteira/ })[0])
    const select = await screen.findByLabelText("Para quem")
    fireEvent.change(select, { target: { value: BRUNO } })
    expect(screen.getByTestId("confirmacao-transferir")).toHaveTextContent("Transferir 3 contatos de Ana para Bruno?")
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    await waitFor(() => expect(screen.queryByTestId("confirmacao-transferir")).toBeNull())
    expect(transferirCarteira).not.toHaveBeenCalled()

    // Confirmar chama a ação com de → para e recarrega.
    transferirCarteira.mockResolvedValue({ quantidade: 3 })
    buscarCarteiras.mockResolvedValue(resultado("admin"))
    fireEvent.click(screen.getAllByRole("button", { name: /Transferir carteira/ })[0])
    fireEvent.change(await screen.findByLabelText("Para quem"), { target: { value: BRUNO } })
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }))
    await waitFor(() => expect(transferirCarteira).toHaveBeenCalledWith(ANA, BRUNO))
    await waitFor(() => expect(buscarCarteiras).toHaveBeenCalled())

    // Remover: cancelar também não chama.
    fireEvent.click(screen.getAllByRole("button", { name: /Remover da carteira/ })[0])
    expect(await screen.findByTestId("confirmacao-remover")).toHaveTextContent("Deixar 3 contatos de Ana sem vendedor?")
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    await waitFor(() => expect(screen.queryByTestId("confirmacao-remover")).toBeNull())
    expect(removerCarteira).not.toHaveBeenCalled()
  })

  it("CA-B35-04: o Atendente não vê os botões de transferir e remover", () => {
    render(<CarteirasClient inicial={resultado("atendente")} />)
    expect(screen.getByText("Minha carteira")).toBeTruthy()
    expect(screen.queryByRole("button", { name: /Transferir carteira/ })).toBeNull()
    expect(screen.queryByRole("button", { name: /Remover da carteira/ })).toBeNull()
  })
})
