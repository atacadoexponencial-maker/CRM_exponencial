// B47-09 — a aba dos Relatórios fica no endereço (`?aba=rfv`): dá para mandar o
// link, recarregar na mesma aba e voltar com o navegador. As abas são falsas.

import { act, fireEvent, render, screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { calcularCartoes, calcularGraficos, historicoDe25Meses, periodoPadrao, variacaoPorUf } from "@/lib/relatorios/visao-geral"

vi.mock("@/app/(auth)/relatorios/actions", () => ({ buscarVisaoGeral: vi.fn() }))
vi.mock("@/app/(auth)/relatorios/components/rfv-client", () => ({ RfvClient: () => <p>Tela do RFV</p> }))
vi.mock("@/app/(auth)/relatorios/components/coorte-client", () => ({ CoorteClient: () => <p>Tela da Coorte</p> }))
vi.mock("@/app/(auth)/relatorios/components/funil-clientes-client", () => ({ FunilClientesClient: () => <p>Tela do Funil</p> }))
vi.mock("@/app/(auth)/relatorios/components/carteiras-client", () => ({ CarteirasClient: () => <p>Tela das Carteiras</p> }))

import { RelatoriosClient } from "@/app/(auth)/relatorios/components/relatorios-client"
import { abaDoEndereco } from "@/lib/relatorios/abas"

const HOJE = "2026-10-27"
const VISAO = { ...calcularCartoes([], periodoPadrao(HOJE), HOJE), graficos: calcularGraficos([], periodoPadrao(HOJE), HOJE, {}), tabela: [], porUf: variacaoPorUf([], periodoPadrao(HOJE), HOJE), mesesHistorico: historicoDe25Meses([], HOJE), atendenteId: null }

function abrir(abaInicial?: ReturnType<typeof abaDoEndereco>) {
  render(<RelatoriosClient visaoInicial={VISAO} atendentes={[]} papel="admin" hoje={HOJE} abaInicial={abaInicial} />)
}

const abaSelecionada = () => within(screen.getByRole("tablist")).getAllByRole("tab").find((t) => t.getAttribute("aria-selected") === "true")?.textContent

beforeEach(() => window.history.replaceState(null, "", "/relatorios"))

describe("B47-09 — aba dos Relatórios no endereço", () => {
  it("CA-B47-22: abrir a aba RFV põe ?aba=rfv no endereço", () => {
    abrir()
    fireEvent.click(screen.getByRole("tab", { name: "RFV" }))
    expect(window.location.pathname + window.location.search).toBe("/relatorios?aba=rfv")
    expect(screen.getByText("Tela do RFV")).toBeTruthy()
  })

  it("CA-B47-22: o endereço com ?aba=rfv abre direto na aba RFV, e aba desconhecida abre a Visão Geral", () => {
    expect(abaDoEndereco("rfv")).toBe("rfv")
    expect(abaDoEndereco("inventada")).toBe("visao-geral")
    expect(abaDoEndereco(undefined)).toBe("visao-geral")
    abrir(abaDoEndereco("rfv"))
    expect(abaSelecionada()).toBe("RFV")
    expect(screen.getByText("Tela do RFV")).toBeTruthy()
  })

  it("voltar do navegador volta para a aba anterior", () => {
    abrir()
    fireEvent.click(screen.getByRole("tab", { name: "Coorte" }))
    expect(abaSelecionada()).toBe("Coorte")
    act(() => {
      window.history.replaceState(null, "", "/relatorios")
      window.dispatchEvent(new PopStateEvent("popstate"))
    })
    expect(abaSelecionada()).toBe("Visão Geral")
  })
})
