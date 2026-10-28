// B47-06 — tela da Agenda: o Agendar diz o que falta, o Editar preenche o formulário
// e salva pela action de editar, e o Feito oferece o Desfazer. As actions são falsas.

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ItemAgenda } from "@/app/(auth)/agenda/actions"

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }))
vi.mock("@/app/(auth)/agenda/actions", () => ({
  adiarLembrete: vi.fn(async () => ({})),
  apagarLembrete: vi.fn(async () => ({})),
  buscarContatosParaFollowUp: vi.fn(async () => []),
  criarFollowUp: vi.fn(async () => ({})),
  desfazerFeito: vi.fn(async () => ({})),
  editarLembrete: vi.fn(async () => ({})),
  marcarLembreteFeito: vi.fn(async () => ({})),
}))

import { AgendaClient } from "@/app/(auth)/agenda/agenda-client"
import { apagarLembrete, criarFollowUp, desfazerFeito, editarLembrete } from "@/app/(auth)/agenda/actions"

const DA_ANA: ItemAgenda = {
  id: "lembrete-1",
  origem: "avulso",
  contatoNome: "Ana",
  contatoId: "c-ana",
  conversaId: null,
  instrucao: "Ligar",
  // 15:00 em Brasília
  dueAt: "2099-01-02T18:00:00.000Z",
  atrasado: false,
}

async function escolherNoMenu(gatilho: string, item: string) {
  const botao = screen.getByRole("button", { name: gatilho })
  fireEvent.pointerDown(botao)
  fireEvent.mouseDown(botao)
  fireEvent.click(botao)
  fireEvent.click(await screen.findByRole("menuitem", { name: item }))
}

beforeEach(() => vi.clearAllMocks())

describe("B47-06 — Agenda com editar, apagar e desfazer", () => {
  it("CA-B47-15: Agendar sem contato diz 'Escolha o contato' e não cria nada", async () => {
    render(<AgendaClient itensIniciais={[]} papel="atendente" />)
    fireEvent.click(screen.getByRole("button", { name: /Novo follow-up/ }))
    const agendar = await screen.findByRole("button", { name: "Agendar" })
    expect(agendar).not.toBeDisabled()
    await act(async () => fireEvent.click(agendar))
    expect(screen.getByText("Escolha o contato")).toBeTruthy()
    expect(criarFollowUp).not.toHaveBeenCalled()
  })

  it("CA-B47-11: Editar abre o formulário preenchido e salva pela action de editar", async () => {
    render(<AgendaClient itensIniciais={[DA_ANA]} papel="atendente" />)
    await escolherNoMenu("Abrir menu de Ana", "Editar")
    expect(await screen.findByText("Editar follow-up")).toBeTruthy()
    expect((screen.getByLabelText("Data") as HTMLInputElement).value).toBe("2099-01-02")
    expect((screen.getByLabelText("Hora (opcional)") as HTMLInputElement).value).toBe("15:00")
    fireEvent.change(screen.getByLabelText("Nota"), { target: { value: "Ligar às 10h" } })
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Salvar" })))
    expect(editarLembrete).toHaveBeenCalledWith("lembrete-1", { contactId: "c-ana", data: "2099-01-02", hora: "15:00", nota: "Ligar às 10h" })
    expect(criarFollowUp).not.toHaveBeenCalled()
  })

  it("CA-B47-12: Apagar pede confirmação com o nome e tira o item da lista", async () => {
    render(<AgendaClient itensIniciais={[DA_ANA]} papel="atendente" />)
    await escolherNoMenu("Abrir menu de Ana", "Apagar")
    const dialogo = await screen.findByRole("dialog")
    expect(dialogo.querySelector("strong")?.textContent).toBe("Ana")
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Apagar" })))
    expect(apagarLembrete).toHaveBeenCalledWith("lembrete-1")
    await waitFor(() => expect(screen.queryByText("Ligar")).toBeNull())
  })

  it("CA-B47-13: Feito mostra Desfazer, e desfazer devolve o item à lista", async () => {
    render(<AgendaClient itensIniciais={[DA_ANA]} papel="atendente" />)
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /Feito/ })))
    expect(screen.queryByText("Ligar")).toBeNull()
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Desfazer" })))
    expect(desfazerFeito).toHaveBeenCalledWith("lembrete-1")
    expect(await screen.findByText("Ligar")).toBeTruthy()
  })

  it("o nome do contato leva à ficha dele", () => {
    render(<AgendaClient itensIniciais={[DA_ANA]} papel="atendente" />)
    expect(screen.getByRole("link", { name: "Ana" }).getAttribute("href")).toBe("/contatos/c-ana")
  })
})
