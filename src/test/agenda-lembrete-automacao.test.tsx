// B28-01 — o lembrete criado por automação aparece na Agenda como "Lembrete de
// automação", com o nome da regra, e se marca, adia e reatribui pelas mesmas
// ações dos lembretes avulsos. As actions são falsas: o teste confere o que a
// tela chama e o que ela mostra depois.

import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { ItemAgenda } from "@/app/(auth)/agenda/actions"

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }))
vi.mock("@/app/(auth)/agenda/actions", () => ({
  adiarLembrete: vi.fn(async () => ({})),
  buscarContatosParaFollowUp: vi.fn(async () => []),
  criarFollowUp: vi.fn(),
  marcarLembreteFeito: vi.fn(async () => ({})),
  listarAgendaEquipe: vi.fn(async () => null),
  reatribuirLembrete: vi.fn(async () => ({})),
}))

import { AgendaClient } from "@/app/(auth)/agenda/agenda-client"
import { AgendaEquipeClient } from "@/app/(auth)/agenda/equipe/agenda-equipe-client"
import { adiarLembrete, marcarLembreteFeito, reatribuirLembrete } from "@/app/(auth)/agenda/actions"

const daAutomacao: ItemAgenda = {
  id: "lembrete-1",
  origem: "automacao",
  automacaoNome: "Pós-venda",
  contatoNome: "Bruno",
  contatoId: "c-1",
  conversaId: null,
  instrucao: "Ligar para Bruno",
  dueAt: "2099-01-01T12:00:00Z",
  atrasado: false,
  atendenteNome: "Ana",
  atendenteId: "ana",
}

/** Abre o menu (Base UI) pelo gatilho e escolhe o item. */
async function escolherNoMenu(gatilho: string, item: string) {
  const botao = screen.getByText(gatilho)
  fireEvent.pointerDown(botao)
  fireEvent.mouseDown(botao)
  fireEvent.click(botao)
  const opcao = await screen.findByRole("menuitem", { name: item })
  fireEvent.click(opcao)
}

describe("lembrete de automação na Agenda (B28-01)", () => {
  it("CA-B28-30: aparece como lembrete de automação e se marca feito e adia como os avulsos", async () => {
    render(<AgendaClient itensIniciais={[daAutomacao, { ...daAutomacao, id: "lembrete-2" }]} papel="atendente" />)

    expect(screen.getAllByText("Lembrete de automação: Pós-venda")).toHaveLength(2)
    expect(screen.getAllByLabelText("Lembrete de automação").length).toBeGreaterThan(0)

    fireEvent.click(screen.getAllByText("Feito")[0])
    await waitFor(() => expect(marcarLembreteFeito).toHaveBeenCalledWith("lembrete-1"))
    await waitFor(() => expect(screen.getAllByText("Ligar para Bruno")).toHaveLength(1))

    await escolherNoMenu("Adiar", "1 dia")
    await waitFor(() => expect(adiarLembrete).toHaveBeenCalledWith("lembrete-2", 1))
  })

  it("CA-B28-30: na Agenda da equipe, o gerente reatribui o lembrete de automação", async () => {
    render(
      <AgendaEquipeClient
        itensIniciais={[daAutomacao]}
        sequenciasIniciais={[]}
        atendentes={[
          { id: "ana", nome: "Ana" },
          { id: "caio", nome: "Caio" },
        ]}
      />
    )

    expect(screen.getByText("Lembrete de automação: Pós-venda")).toBeTruthy()
    await escolherNoMenu("Reatribuir", "Caio")
    await waitFor(() => expect(reatribuirLembrete).toHaveBeenCalledWith("lembrete-1", "caio"))
    await waitFor(() => expect(screen.getAllByText("Caio").some((el) => el.tagName === "SPAN")).toBe(true))
  })
})
