// B46-11 — lista de Contatos: célula sem palavra quebrada no meio, tabela que rola
// de lado, e tipo e atendente recolhidos atrás de "Mais filtros". As actions são
// falsas.

import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { Contato } from "@/app/(auth)/contatos/mock-contatos"

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }))
vi.mock("@/app/(auth)/contatos/actions", () => ({
  filtrarContatos: vi.fn(async () => ({ contatos: [], total: 0 })),
  verificarNumeroDuplicado: vi.fn(),
  criarContato: vi.fn(),
}))
vi.mock("@/app/(auth)/contatos/filtros-salvos", () => ({
  salvarFiltro: vi.fn(), atualizarFiltroSalvo: vi.fn(), renomearFiltroSalvo: vi.fn(), moverFiltroSalvo: vi.fn(), apagarFiltroSalvo: vi.fn(),
}))
vi.mock("@/app/(auth)/contatos/lixeira/actions", () => ({ resumoExclusaoContato: vi.fn(), excluirContato: vi.fn() }))

import { ListaContatos } from "@/app/(auth)/contatos/components/lista-contatos"

const CONTATO: Contato = {
  id: "c-1",
  nome: "Malharia Médio Porte",
  telefone: "5511900000001",
  classificacao: "lead",
  tipo: "lojista",
  cidade: "Fortaleza",
  atendente: "Ana Souza",
  created_at: "2026-10-20T10:00:00Z",
}

function renderizar() {
  return render(
    <ListaContatos
      contatos={[CONTATO]}
      total={1}
      atendentes={[{ id: "a1", nome: "Ana Souza" }]}
      etiquetas={[]}
      filtrosSalvos={[{ id: "s1", nome: "Lojistas", filtro: { juncao: "e", grupos: [] } }]}
      papel="admin"
    />
  )
}

describe("B46-11 — tabela de Contatos legível e filtros recolhidos", () => {
  it("CA-B46-26: nenhuma célula quebra palavra no meio, e a tabela rola de lado", () => {
    const { container } = renderizar()
    const celulas = Array.from(container.querySelectorAll("td"))
    expect(celulas.length).toBeGreaterThan(0)
    for (const td of celulas) expect(td.className).not.toContain("overflow-wrap:anywhere")
    expect(screen.getByText("Ana Souza", { selector: "td" }).className).toContain("whitespace-nowrap")
    expect(container.querySelector("table")!.parentElement!.className).toContain("overflow-x-auto")
  })

  it("CA-B46-27: à vista, a busca, os salvos e a classificação; tipo e atendente atrás de 'Mais filtros', que conta os ligados", () => {
    renderizar()
    expect(screen.getByRole("button", { name: "Lojistas" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Todas" })).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Lojista" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Todos atendentes" })).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Mais filtros" }))
    fireEvent.click(screen.getByRole("button", { name: "Lojista" }))
    fireEvent.click(screen.getByRole("button", { name: "Ana Souza" }))
    expect(screen.getByRole("button", { name: "Mais filtros · 2" })).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Mais filtros · 2" }))
    expect(screen.queryByRole("button", { name: "Lojista" })).toBeNull()
  })
})
