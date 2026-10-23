// B41-01 — quadro do funil da empresa na tela: colunas com cor pronta ou própria e
// texto legível, busca, filtro de atendente, funil vazio e "Adicionar contato" só para
// Admin e Gerente. As ações do servidor ficam mockadas.

import { fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
vi.mock("@/app/(auth)/pipeline/actions", () => ({
  moverCard: vi.fn(async () => {}),
  buscarDadosPainel: vi.fn(async () => ({ historico: [], notas: [] })),
  atribuirAtendente: vi.fn(async () => {}),
  adicionarNota: vi.fn(async () => {}),
  removerCardDoFunil: vi.fn(async () => ({})),
  buscarContatosParaFunil: vi.fn(async () => []),
  adicionarContatoAoFunil: vi.fn(async () => ({})),
}))
vi.mock("@/app/(auth)/contatos/lixeira/actions", () => ({ resumoExclusaoPorCard: vi.fn(), excluirContatoPorCard: vi.fn() }))
vi.mock("@/app/(auth)/contatos/actions", () => ({ adicionarTagContato: vi.fn(), listarTagsContato: vi.fn(async () => []), removerTagContato: vi.fn() }))
vi.mock("@/app/(auth)/sequencias/actions", () => ({ listarSequenciasParaIniciar: vi.fn(async () => []), iniciarSequenciaManual: vi.fn(), statusSequenciasContato: vi.fn(async () => null) }))

import { FunilPersonalizado } from "@/app/(auth)/pipeline/components/funil-personalizado"
import { ColunaKanban } from "@/app/(auth)/pipeline/components/coluna-kanban"
import { razaoContraste } from "@/app/loja/components/tema"
import { estiloDaCorPropria } from "@/lib/funis"
import type { CardDoFunil, FunilDaEmpresa } from "@/app/(auth)/pipeline/mock-pipeline"

const FUNIL: FunilDaEmpresa = {
  id: "11111111-1111-4111-8111-111111111111",
  nome: "Feira de Março",
  etapas: [
    { id: "e1", label: "Convidado", cor: "verde" },
    { id: "e2", label: "Confirmou", cor: "#0b1f4d" },
    { id: "e3", label: "Visitou o estande", cor: null },
  ],
}

function card(id: string, nome: string, telefone: string, etapa: string, atendente: string | null): CardDoFunil {
  return {
    id, contato: { nome, telefone }, etapa, atendente, tempoNaEtapa: "Hoje", dataEntradaEtapa: "23/10/2026",
    tempoNoFunil: "Hoje", etiquetas: [], conversaId: null,
  }
}

const CARDS = [
  card("c1", "Loja Março", "5511988880001", "e1", "Ana"),
  card("c2", "Bella Kids", "5521977770002", "e2", "Bruno"),
  card("c3", "Rosa Modas", "5531966660003", "e3", null),
]

function abrir(papel: string, cards = CARDS) {
  return render(
    <FunilPersonalizado
      funil={FUNIL}
      cards={cards}
      papel={papel}
      atendentes={[{ id: "a", nome: "Ana" }, { id: "b", nome: "Bruno" }]}
      funis={[{ id: FUNIL.id, nome: FUNIL.nome }]}
    />
  )
}

const nomesNaTela = () => Array.from(document.querySelectorAll("[data-card]")).map((el) => within(el as HTMLElement).getByText(/Loja Março|Bella Kids|Rosa Modas/).textContent)

/** "rgb(11, 31, 77)" → "#0b1f4d" */
function hex(cor: string): string {
  if (cor.startsWith("#")) return cor.toLowerCase()
  const [r, g, b] = cor.match(/\d+/g)!.map(Number)
  return "#" + [r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")
}

afterEach(() => document.documentElement.classList.remove("dark"))

describe("B41-01 — Quadro do funil da empresa", () => {
  it("CA-B41-08: should pintar a coluna com a cor pronta ou com a cor própria da etapa", () => {
    abrir("admin")
    const convidado = screen.getByRole("region", { name: "Convidado" }).querySelector("header")!
    expect(convidado.className).toContain("border-b-sucesso")
    const confirmou = screen.getByRole("region", { name: "Confirmou" }).querySelector("header")!
    expect(confirmou.getAttribute("data-cor-propria")).toBe("#0b1f4d")
    expect(hex(confirmou.style.backgroundColor)).toBe("#0b1f4d")
    const visitou = screen.getByRole("region", { name: "Visitou o estande" }).querySelector("header")!
    expect(visitou.getAttribute("data-cor-propria")).toBeNull()
    expect(visitou.style.backgroundColor).toBe("")
  })

  it("CA-B41-42: should deixar título e contagem legíveis (4,5:1) sobre cor clara e escura, nos dois temas", () => {
    for (const tema of ["claro", "escuro"]) {
      if (tema === "escuro") document.documentElement.classList.add("dark")
      for (const cor of ["#fff3b0", "#0b1f4d", "#777777", "#ff8800", "#3b82f6"]) {
        const { unmount } = render(<ColunaKanban titulo="Etapa" etapaId="x" cor={cor} cards={[card("c", "Loja Março", "1", "x", "Ana")]} />)
        const header = screen.getByRole("region", { name: "Etapa" }).querySelector("header")!
        const fundo = hex(header.style.backgroundColor)
        const texto = hex(header.style.color)
        expect(fundo).toBe(cor)
        expect(razaoContraste(fundo, texto)).toBeGreaterThanOrEqual(4.5)
        // Título e contagem herdam a cor do texto do cabeçalho: sem classe de cor própria.
        expect(header.querySelector("[data-quantidade]")!.className).not.toContain("text-muted-foreground")
        expect(header.querySelector("[data-soma]")!.className).not.toContain("text-muted-foreground")
        expect(estiloDaCorPropria(cor).texto).toBe(texto)
        unmount()
      }
    }
  })

  it("CA-B41-17: should mostrar \"Adicionar contato\" só para Admin e Gerente", () => {
    const { unmount } = abrir("atendente")
    expect(screen.queryByRole("button", { name: /Adicionar contato/ })).toBeNull()
    unmount()
    for (const papel of ["admin", "gerente"]) {
      const r = abrir(papel)
      expect(screen.getByRole("button", { name: /Adicionar contato/ })).toBeTruthy()
      r.unmount()
    }
  })

  it("CA-B41-18: should oferecer no painel do card só as etapas desse funil", async () => {
    abrir("admin")
    fireEvent.click(screen.getByText("Loja Março"))
    fireEvent.click(await screen.findByText("Mover para etapa..."))
    const opcoes = ["Confirmou", "Visitou o estande", "Lead", "Onboarding"].filter((n) => screen.queryAllByRole("button", { name: n }).length > 0)
    expect(opcoes).toEqual(["Confirmou", "Visitou o estande"])
    expect(screen.getByText("Feira de Março", { selector: "span" })).toBeTruthy()
  })

  it("CA-B41-21: should buscar por nome ou telefone e filtrar por atendente", () => {
    abrir("admin")
    const busca = screen.getByPlaceholderText("Buscar card...")
    fireEvent.change(busca, { target: { value: "bella" } })
    expect(nomesNaTela()).toEqual(["Bella Kids"])
    fireEvent.change(busca, { target: { value: "96666" } })
    expect(nomesNaTela()).toEqual(["Rosa Modas"])
    fireEvent.change(busca, { target: { value: "" } })

    fireEvent.click(screen.getByRole("button", { name: /Atendente/ }))
    fireEvent.click(screen.getByRole("button", { name: "Ana" }))
    expect(nomesNaTela()).toEqual(["Loja Março"])
    fireEvent.click(screen.getByRole("button", { name: /Ana/ }))
    fireEvent.click(screen.getByRole("button", { name: "Sem atendente" }))
    expect(nomesNaTela()).toEqual(["Rosa Modas"])
  })

  it("CA-B41-23: should mostrar o funil vazio com as colunas e o aviso, e o botão para o Admin", () => {
    abrir("admin", [])
    for (const nome of ["Convidado", "Confirmou", "Visitou o estande"]) {
      expect(within(screen.getByRole("region", { name: nome })).getByText("Nenhum lead nesta etapa")).toBeTruthy()
    }
    expect(screen.getByRole("button", { name: /Adicionar contato/ })).toBeTruthy()
    expect(screen.getByRole("link", { name: /Feira de Março/ }).getAttribute("aria-current")).toBe("page")
  })
})
