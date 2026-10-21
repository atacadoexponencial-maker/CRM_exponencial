// B32-03 — tela Relatórios: item no menu, abas, atalhos de período e filtro de atendente.

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { calcularCartoes, calcularGraficos, historicoDe25Meses, periodoPadrao, variacaoPorUf } from "@/lib/relatorios/visao-geral"

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))
vi.mock("@/components/shared/menu-do-usuario", () => ({ MenuDoUsuario: () => null }))

const buscarVisaoGeral = vi.fn()
vi.mock("@/app/(auth)/relatorios/actions", () => ({ buscarVisaoGeral: (...args: unknown[]) => buscarVisaoGeral(...args) }))

import { SidebarNav } from "@/components/shared/sidebar-nav"
import { RelatoriosClient } from "@/app/(auth)/relatorios/components/relatorios-client"

const HOJE = "2026-10-21"
const visao = (periodo = periodoPadrao(HOJE)) => ({ ...calcularCartoes([], periodo, HOJE), graficos: calcularGraficos([], periodo, HOJE, {}), tabela: [], porUf: variacaoPorUf([], periodo, HOJE), mesesHistorico: historicoDe25Meses([], HOJE), atendenteId: null })

function renderTela(papel = "admin") {
  return render(
    <RelatoriosClient
      visaoInicial={visao()}
      atendentes={[{ id: "a1", nome: "Ana" }, { id: "b1", nome: "Bruno" }]}
      papel={papel}
      hoje={HOJE}
    />
  )
}

beforeEach(() => {
  buscarVisaoGeral.mockReset()
  buscarVisaoGeral.mockImplementation(async (f: { periodo: Parameters<typeof calcularCartoes>[1] }) => visao(f.periodo))
})

describe("B32-03 — tela Relatórios", () => {
  it("CA-B32-01: o menu tem 'Relatórios' logo abaixo de 'Dashboard', para admin, gerente e atendente", () => {
    for (const papel of ["admin", "gerente", "atendente"] as const) {
      const { unmount, container } = render(
        <SidebarNav papel={papel} nomeUsuario="X" email="x@x" atrasados={0} pedidosNovos={0} recolhidoInicial={false} />
      )
      const links = Array.from(container.querySelectorAll("a")).map((a) => [a.textContent?.trim(), a.getAttribute("href")])
      const i = links.findIndex(([t]) => t === "Dashboard")
      expect(i).toBeGreaterThanOrEqual(0)
      expect(links[i + 1]).toEqual(["Relatórios", "/relatorios"])
      unmount()
    }
  })

  it("CA-B32-24: 'Visão Geral' ativa e Coorte, Funil de clientes e Carteiras desativadas com 'em breve' (RFV abriu na B33)", () => {
    renderTela()
    const abas = within(screen.getByRole("tablist")).getAllByRole("tab")
    expect(abas[0]).toHaveTextContent("Visão Geral")
    expect(abas[0]).toHaveAttribute("aria-selected", "true")
    expect(abas[1]).toHaveTextContent("RFV")
    const futuras = abas.slice(2)
    expect(futuras.map((a) => a.textContent?.replace(/\s*em breve$/, "").trim())).toEqual(["Coorte", "Funil de clientes", "Carteiras"])
    for (const aba of futuras) {
      expect(aba).toBeDisabled()
      expect(aba).toHaveTextContent(/em breve/)
      fireEvent.click(aba)
    }
    expect(abas[0]).toHaveAttribute("aria-selected", "true")
    expect(buscarVisaoGeral).not.toHaveBeenCalled()
  })

  it("CA-B32-03: 'Ontem', 'Mês anterior' e 'Este mês' pedem o período certo e o cabeçalho acompanha", async () => {
    renderTela()
    expect(screen.getByTestId("titulo-periodo")).toHaveTextContent("Mês: Outubro | Ano: 2026")

    fireEvent.click(screen.getByRole("button", { name: "Ontem" }))
    await waitFor(() => expect(screen.getByTestId("titulo-periodo")).toHaveTextContent("Dia: 20/10/2026"))
    expect(buscarVisaoGeral).toHaveBeenLastCalledWith({ periodo: { tipo: "ontem" }, atendenteId: null })

    fireEvent.click(screen.getByRole("button", { name: "Mês anterior" }))
    await waitFor(() => expect(screen.getByTestId("titulo-periodo")).toHaveTextContent("Mês: Setembro | Ano: 2026"))
    expect(buscarVisaoGeral).toHaveBeenLastCalledWith({ periodo: { tipo: "meses", ano: 2026, meses: [9] }, atendenteId: null })

    fireEvent.click(screen.getByRole("button", { name: "Este mês" }))
    await waitFor(() => expect(screen.getByTestId("titulo-periodo")).toHaveTextContent("Mês: Outubro | Ano: 2026"))
    expect(buscarVisaoGeral).toHaveBeenLastCalledWith({ periodo: { tipo: "meses", ano: 2026, meses: [10] }, atendenteId: null })
  })

  it("CA-B32-05: com papel Atendente a tela não tem o filtro de atendente", () => {
    renderTela("atendente")
    expect(screen.queryByLabelText("Atendente")).toBeNull()
    expect(screen.getByRole("button", { name: "Este mês" })).toBeTruthy()
  })

  it("CA-B32-06: o Admin escolhe um atendente e a tela pede o relatório dele", async () => {
    renderTela("admin")
    fireEvent.change(screen.getByLabelText("Atendente"), { target: { value: "b1" } })
    await waitFor(() => expect(buscarVisaoGeral).toHaveBeenCalledWith({ periodo: { tipo: "meses", ano: 2026, meses: [10] }, atendenteId: "b1" }))
  })
})
