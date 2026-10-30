// B35-02 — diálogos de transferir e remover carteira: confirmação e papel.

import { describe, it, expect, vi, beforeEach } from "vitest"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
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

describe("B53-14 — carteiras: total do atendente e remover sem diálogo preso", () => {
  it("CA-B53-27: o atendente com 2 contatos vê \"2 na carteira\" e nenhum selo \"Minha carteira 1\"", () => {
    const doAtendente: ResultadoCarteiras = { papel: "atendente", painel: calcularPainelDeCarteiras([contato("c1", ANA), contato("c2", ANA)], [VENDEDORES[0]]), historico: null }
    render(<CarteirasClient inicial={doAtendente} />)
    const titulo = screen.getByRole("heading", { name: /Minha carteira/ })
    expect(titulo.textContent?.trim()).toBe("Minha carteira")
    expect(screen.queryByTestId("selo-vendedores")).toBeNull()
    expect(screen.getByTestId(`vendedor-${ANA}`)).toHaveTextContent("2 na carteira")
  })

  it("CA-B53-28: na linha do vendedor com 0 contatos, \"Remover da carteira\" não está disponível", async () => {
    render(<CarteirasClient inicial={resultado("admin")} />)
    // Bruno não tem contato; Ana tem 3 e segue com o botão disponível.
    expect(screen.getByTestId(`vendedor-${BRUNO}`)).toHaveTextContent("0 na carteira")
    const doBruno = within(screen.getByTestId(`acoes-${BRUNO}`)).getByRole("button", { name: /Remover da carteira/ })
    expect(doBruno).toBeDisabled()
    fireEvent.click(doBruno)
    await new Promise((r) => setTimeout(r, 50))
    expect(screen.queryByTestId("confirmacao-remover")).toBeNull()
    expect(within(screen.getByTestId(`acoes-${ANA}`)).getByRole("button", { name: /Remover da carteira/ })).not.toBeDisabled()
  })

  it("CA-B53-29: confirmar \"Remover da carteira\" de quem tem 3 contatos fecha o diálogo e a linha mostra 0", async () => {
    removerCarteira.mockResolvedValue({ quantidade: 3 })
    // Depois de remover, o painel recarrega com os 3 contatos sem vendedor.
    buscarCarteiras.mockResolvedValue({ ...resultado("admin"), painel: calcularPainelDeCarteiras([contato("c1", null), contato("c2", null), contato("c3", null)], VENDEDORES) })
    render(<CarteirasClient inicial={resultado("admin")} />)
    expect(screen.getByTestId(`vendedor-${ANA}`)).toHaveTextContent("3 na carteira")
    fireEvent.click(within(screen.getByTestId(`acoes-${ANA}`)).getByRole("button", { name: /Remover da carteira/ }))
    expect(await screen.findByTestId("confirmacao-remover")).toHaveTextContent("Deixar 3 contatos de Ana sem vendedor?")
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }))
    await waitFor(() => expect(removerCarteira).toHaveBeenCalledWith(ANA))
    await waitFor(() => expect(screen.queryByTestId("confirmacao-remover")).toBeNull())
    await waitFor(() => expect(screen.getByTestId(`vendedor-${ANA}`)).toHaveTextContent("0 na carteira"))
  })
})
