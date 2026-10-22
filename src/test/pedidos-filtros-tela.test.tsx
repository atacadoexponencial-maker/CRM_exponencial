// B39-01 — barra de filtros da tela Pedidos. As actions são mockadas: aqui se
// confere o que a tela mostra e o que ela pede ao servidor.

import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { FILTROS_PADRAO } from "@/lib/catalogo/filtros-pedidos"

const filtrarPedidos = vi.fn()

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }), usePathname: () => "/catalogo/pedidos" }))
vi.mock("@/app/(auth)/catalogo/pedidos/actions", () => ({
  filtrarPedidos: (...args: unknown[]) => filtrarPedidos(...args),
  carregarPedido: vi.fn(),
  mudarSituacaoPedido: vi.fn(),
}))

import { PedidosClient } from "@/app/(auth)/catalogo/pedidos/pedidos-client"

function renderizar() {
  return render(
    <PedidosClient
      inicial={[]}
      totalInicial={0}
      novos={0}
      abertoInicial={null}
      papel="admin"
      produtos={[]}
      atendentes={[{ id: "a1", nome: "Ana" }]}
    />
  )
}

const campo = (rotulo: string) => screen.getByLabelText(rotulo) as HTMLInputElement | HTMLSelectElement

beforeEach(() => {
  filtrarPedidos.mockReset()
  filtrarPedidos.mockResolvedValue({ pedidos: [], total: 0 })
})

describe("B39-01 — filtros da tela Pedidos", () => {
  it("CA-B39-02: should avisar e não filtrar quando o dia final vem antes do inicial", async () => {
    renderizar()
    fireEvent.change(campo("Filtrar por período"), { target: { value: "personalizado" } })
    fireEvent.change(campo("Dia inicial"), { target: { value: "2026-10-15" } })
    fireEvent.change(campo("Dia final"), { target: { value: "2026-10-05" } })

    expect(screen.getByRole("alert").textContent).toBe("O dia final precisa ser depois do inicial")
    await new Promise((r) => setTimeout(r, 500))
    expect(filtrarPedidos).not.toHaveBeenCalled()
  })

  it("CA-B39-10: should voltar todos os filtros ao padrão ao clicar em Limpar filtros", async () => {
    renderizar()
    fireEvent.change(campo("Filtrar por situação"), { target: { value: "fechado" } })
    fireEvent.change(campo("Filtrar por período"), { target: { value: "tudo" } })
    fireEvent.change(campo("Valor mínimo"), { target: { value: "500" } })
    fireEvent.change(campo("Filtrar por cliente nova ou antiga"), { target: { value: "nova" } })
    fireEvent.change(campo("Filtrar por atendente da cliente"), { target: { value: "a1" } })
    await waitFor(() => expect(filtrarPedidos).toHaveBeenCalled())

    fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }))

    await waitFor(() => expect(filtrarPedidos.mock.calls.at(-1)![0]).toEqual(FILTROS_PADRAO))
    expect(campo("Filtrar por situação").value).toBe("")
    expect(campo("Filtrar por período").value).toBe("30")
    expect(campo("Valor mínimo").value).toBe("")
    expect(campo("Filtrar por cliente nova ou antiga").value).toBe("")
    expect(campo("Filtrar por atendente da cliente").value).toBe("")
  })
})
