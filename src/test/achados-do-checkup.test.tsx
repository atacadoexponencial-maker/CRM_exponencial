// Achados da conferência de telas de 18/11/2026 (checkup): o Dashboard ignorava o
// período personalizado só com a data final; o gráfico dizia "por semana" com barras
// por mês; um ano inteiro saía como "18/11 a 18/11"; "1 compras"; e a ficha do
// contato mostrava a observação antiga logo depois de salvar. As actions são falsas.

import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ContatoPerfil } from "@/app/(auth)/contatos/tipos-contato"

const refresh = vi.fn()
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh, replace: vi.fn() }), usePathname: () => "/dashboard" }))
vi.mock("@/app/(auth)/dashboard/actions", () => ({ buscarPainelDashboard: vi.fn() }))
vi.mock("@/app/(auth)/agenda/actions", () => ({ marcarLembreteFeito: vi.fn(async () => ({})) }))
vi.mock("@/app/(auth)/contatos/actions", () => ({
  atualizarDadosContato: vi.fn(), adicionarTagContato: vi.fn(), removerTagContato: vi.fn(),
  listarTagsContato: vi.fn(async () => []), atualizarObservacoesContato: vi.fn(async () => ({})),
}))
vi.mock("@/app/(auth)/contatos/lixeira/actions", () => ({ resumoExclusaoContato: vi.fn(), excluirContato: vi.fn(), restaurarContato: vi.fn() }))

import { DashboardClient } from "@/app/(auth)/dashboard/components/dashboard-client"
import { buscarPainelDashboard, type PainelDashboard } from "@/app/(auth)/dashboard/actions"
import { PerfilContato } from "@/app/(auth)/contatos/[id]/components/perfil-contato"
import { atualizarObservacoesContato } from "@/app/(auth)/contatos/actions"
import { calcularMetricas } from "@/lib/metricas-dashboard"
import { formatarIntervalo } from "@/lib/datas"

const FUSO = "America/Sao_Paulo"
// 15:00 de Brasília
const TRINTA_DIAS = { inicio: new Date("2026-10-19T03:00:00.000Z"), fim: new Date("2026-11-18T18:00:00.000Z") }
const UM_ANO = { inicio: new Date("2025-11-18T03:00:00.000Z"), fim: new Date("2026-11-18T18:00:00.000Z") }

function painelDe(range: { inicio: Date; fim: Date }, compras = 0): PainelDashboard {
  const metricas = calcularMetricas([], [], [], range)
  return {
    metricas: { ...metricas, receita: { ...metricas.receita, quantidadeCompras: compras } },
    variacoes: { totalCompras: null, quantidadeCompras: null, ticketMedioGeral: null, novosLeads: null, taxaRecompra: null },
    funilEntrada: [],
  }
}

function abrirDashboard(painel: PainelDashboard) {
  return render(
    <DashboardClient painelInicial={painel} atendentes={[]} papel="admin" cabecalho={{ data: "Quarta", saudacao: "Oi" }} paraHoje={[]} esperando={{ conversas: [], total: 0 }} />
  )
}

beforeEach(() => vi.clearAllMocks())

describe("Achados do checkup de 18/11/2026 — Dashboard", () => {
  it("período personalizado só com a data final busca o painel (o servidor completa os 30 dias)", async () => {
    vi.mocked(buscarPainelDashboard).mockResolvedValue(painelDe(TRINTA_DIAS))
    abrirDashboard(painelDe(TRINTA_DIAS))

    fireEvent.change(screen.getByDisplayValue("Últimos 30 dias"), { target: { value: "custom" } })
    // Sem nenhuma data ainda não há o que buscar
    expect(buscarPainelDashboard).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText("Data final"), { target: { value: "2026-06-30" } })
    await waitFor(() => expect(buscarPainelDashboard).toHaveBeenCalledTimes(1))
    expect(vi.mocked(buscarPainelDashboard).mock.calls[0][0]).toMatchObject({ periodo: "custom", inicio: undefined, fim: "2026-06-30" })
  })

  it("período personalizado só com a data inicial também busca", async () => {
    vi.mocked(buscarPainelDashboard).mockResolvedValue(painelDe(TRINTA_DIAS))
    abrirDashboard(painelDe(TRINTA_DIAS))

    fireEvent.change(screen.getByDisplayValue("Últimos 30 dias"), { target: { value: "custom" } })
    fireEvent.change(screen.getByLabelText("Data inicial"), { target: { value: "2026-06-01" } })
    await waitFor(() => expect(buscarPainelDashboard).toHaveBeenCalledTimes(1))
    expect(vi.mocked(buscarPainelDashboard).mock.calls[0][0]).toMatchObject({ periodo: "custom", inicio: "2026-06-01", fim: undefined })
  })

  it("o gráfico diz 'por mês' quando as barras são meses, e 'por semana' quando são semanas", () => {
    expect(calcularMetricas([], [], [], UM_ANO).entrada.leadsPorMes).toBe(true)
    expect(calcularMetricas([], [], [], TRINTA_DIAS).entrada.leadsPorMes).toBe(false)

    const umAno = abrirDashboard(painelDe(UM_ANO))
    expect(screen.getByText("Leads criados por mês")).toBeTruthy()
    expect(screen.queryByText("Leads criados por semana")).toBeNull()
    umAno.unmount()

    abrirDashboard(painelDe(TRINTA_DIAS))
    expect(screen.getByText("Leads criados por semana")).toBeTruthy()
  })

  it("o período que atravessa a virada do ano mostra o ano; dentro do mesmo ano, só dia e mês", () => {
    expect(formatarIntervalo(UM_ANO.inicio.toISOString(), UM_ANO.fim.toISOString(), FUSO)).toBe("18/11/2025 a 18/11/2026")
    expect(formatarIntervalo(TRINTA_DIAS.inicio.toISOString(), TRINTA_DIAS.fim.toISOString(), FUSO)).toBe("19/10 a 18/11")
    // Réveillon em Brasília: 01:00 UTC de 1º de janeiro ainda é 31/12 lá
    expect(formatarIntervalo("2026-12-01T03:00:00.000Z", "2027-01-01T01:00:00.000Z", FUSO)).toBe("01/12 a 31/12")

    abrirDashboard(painelDe(UM_ANO))
    expect(screen.getByText(/Faturado de 18\/11\/2025 a 18\/11\/2026/)).toBeTruthy()
  })

  it("uma compra só é '1 compra'; duas são '2 compras'", () => {
    const uma = abrirDashboard(painelDe(TRINTA_DIAS, 1))
    expect(screen.getByText(/\(1 compra\)/)).toBeTruthy()
    uma.unmount()

    abrirDashboard(painelDe(TRINTA_DIAS, 2))
    expect(screen.getByText(/\(2 compras\)/)).toBeTruthy()
  })
})

describe("Achados do checkup de 18/11/2026 — ficha do contato", () => {
  const CONTATO: ContatoPerfil = {
    id: "c-1", nome: "Ana Souza", telefone: "5511999998888", classificacao: "ativo", tipo: null, cidade: null, atendente: null,
    created_at: "2026-10-20T10:00:00Z", perfilRfv: null,
    icp: null, tags: [], observacoes: "", conversaId: null, cards: [], compras: [], timeline: [],
  }

  it("a observação salva aparece na hora, antes de a tela recarregar os dados", async () => {
    const tela = render(<PerfilContato contato={CONTATO} papel="admin" />)
    expect(screen.getByText("Sem observações")).toBeTruthy()

    const secao = screen.getByRole("heading", { name: "Observações" }).closest("section")!
    fireEvent.click(secao.querySelector("button")!)
    fireEvent.change(screen.getByPlaceholderText(/Adicione observações internas/), { target: { value: "Prefere contato à tarde" } })
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }))

    await waitFor(() => expect(atualizarObservacoesContato).toHaveBeenCalledWith("c-1", "Prefere contato à tarde"))
    // A ficha ainda traz o contato de antes (observacoes: ""), e o texto novo já está na tela
    expect(await screen.findByText("Prefere contato à tarde")).toBeTruthy()
    expect(screen.queryByText("Sem observações")).toBeNull()
    expect(refresh).toHaveBeenCalled()

    // Quando os dados novos chegam, vale o que veio do servidor
    tela.rerender(<PerfilContato contato={{ ...CONTATO, observacoes: "Prefere contato à tarde (revisado)" }} papel="admin" />)
    expect(screen.getByText("Prefere contato à tarde (revisado)")).toBeTruthy()
  })
})
