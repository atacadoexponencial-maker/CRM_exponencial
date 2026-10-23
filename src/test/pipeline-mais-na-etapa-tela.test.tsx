// "+" na etapa e "Abrir ficha completa" no painel do card (pedidos dela no preview da
// B41, 23/10/2026). As ações do servidor ficam mockadas.

import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const criarCardNaEtapa = vi.fn<(...a: unknown[]) => Promise<{ erro?: string }>>(async () => ({}))
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
vi.mock("@/app/(auth)/pipeline/actions", () => ({
  moverCard: vi.fn(async () => {}),
  buscarDadosPainel: vi.fn(async () => ({ historico: [], notas: [] })),
  atribuirAtendente: vi.fn(async () => {}),
  adicionarNota: vi.fn(async () => {}),
  removerCardDoFunil: vi.fn(async () => ({})),
  buscarContatosParaFunil: vi.fn(async () => []),
  adicionarContatoAoFunil: vi.fn(async () => ({})),
  criarNovoLead: vi.fn(async () => ({})),
  criarCardNaEtapa: (...a: unknown[]) => criarCardNaEtapa(...a),
}))
vi.mock("@/app/(auth)/contatos/lixeira/actions", () => ({ resumoExclusaoPorCard: vi.fn(), excluirContatoPorCard: vi.fn() }))
vi.mock("@/app/(auth)/contatos/actions", () => ({ adicionarTagContato: vi.fn(), listarTagsContato: vi.fn(async () => []), removerTagContato: vi.fn() }))
vi.mock("@/app/(auth)/sequencias/actions", () => ({ listarSequenciasParaIniciar: vi.fn(async () => []), iniciarSequenciaManual: vi.fn(), statusSequenciasContato: vi.fn(async () => null) }))

import { FunilEntrada } from "@/app/(auth)/pipeline/components/funil-entrada"
import { FunilPersonalizado } from "@/app/(auth)/pipeline/components/funil-personalizado"
import type { CardLead, FunilDaEmpresa } from "@/app/(auth)/pipeline/mock-pipeline"

const FUNIL: FunilDaEmpresa = {
  id: "11111111-1111-4111-8111-111111111111",
  nome: "Feira de Março",
  etapas: [{ id: "e1", label: "Convidado" }, { id: "e2", label: "Confirmou" }],
}

const CARD: CardLead = {
  id: "k1", contactId: "c-1", contato: { nome: "Loja Março", telefone: "5511988880001" }, etapa: "sondagem", atendente: null,
  tempoNaEtapa: "Hoje", dataEntradaEtapa: "23/10/2026", tempoNoFunil: "Hoje", etiquetas: [], conversaId: null,
}

const botoesMais = () => screen.queryAllByRole("button", { name: /^Adicionar card em / }).map((b) => b.getAttribute("aria-label"))

beforeEach(() => criarCardNaEtapa.mockClear())

describe("\"+\" na etapa e ficha completa", () => {
  it("mostra o \"+\" nas etapas de Entrada menos Ganho e Perdido, só para Admin e Gerente", () => {
    const { unmount } = render(<FunilEntrada cards={[]} papel="gerente" atendentes={[]} />)
    expect(botoesMais()).toEqual([
      "Adicionar card em Lead",
      "Adicionar card em Sondagem",
      "Adicionar card em Catálogo Enviado",
      "Adicionar card em Follow do Catálogo",
      "Adicionar card em Negociação",
      "Adicionar card em Nutrição",
    ])
    unmount()
    render(<FunilEntrada cards={[]} papel="atendente" atendentes={[]} />)
    expect(botoesMais()).toEqual([])
  })

  it("no funil da empresa, o \"+\" cria o contato pelo número e o card naquela etapa", async () => {
    render(<FunilPersonalizado funil={FUNIL} cards={[]} papel="admin" atendentes={[]} funis={[{ id: FUNIL.id, nome: FUNIL.nome }]} />)
    expect(botoesMais()).toEqual(["Adicionar card em Convidado", "Adicionar card em Confirmou"])

    fireEvent.click(screen.getByRole("button", { name: "Adicionar card em Confirmou" }))
    expect(screen.getByRole("dialog", { name: "Adicionar card em Confirmou" })).toBeTruthy()
    fireEvent.change(screen.getByPlaceholderText("Buscar por nome ou telefone..."), { target: { value: "21 98888-7777" } })
    const criar = await screen.findByRole("button", { name: "Criar contato com o número 21 98888-7777" })
    fireEvent.click(criar)
    await waitFor(() => expect(criarCardNaEtapa).toHaveBeenCalledWith(FUNIL.id, "e2", { telefone: "21 98888-7777" }))
  })

  it("o painel do card tem \"Abrir ficha completa\", que leva ao perfil do contato", async () => {
    render(<FunilEntrada cards={[CARD]} papel="admin" atendentes={[]} />)
    fireEvent.click(screen.getByText("Loja Março"))
    const link = await screen.findByRole("link", { name: /Abrir ficha completa/ })
    expect(link.getAttribute("href")).toBe("/contatos/c-1")
  })
})
