// Ficha do contato no chat (pedido dela em 20/10/2026): além de nome, número e
// conversas anteriores, mostra o cadastro (classificação, tipo, nicho, cidade,
// perfil, atendente, tags), a etapa em cada funil e o link para o perfil completo.

import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { Conversa } from "@/app/(auth)/chat/mock-conversas"

const atualizar = vi.fn<(...a: unknown[]) => Promise<{ erro?: string }>>(async () => ({}))
const adicionarTag = vi.fn<(...a: unknown[]) => Promise<{ erro?: string }>>(async () => ({}))
vi.mock("@/app/(auth)/contatos/actions", () => ({
  atualizarDadosContato: (...a: unknown[]) => atualizar(...a),
  adicionarTagContato: (...a: unknown[]) => adicionarTag(...a),
  removerTagContato: vi.fn(async () => ({})),
}))
vi.mock("@/app/(auth)/chat/actions", () => ({
  buscarInfoContato: vi.fn(async () => ({
    dataPrimeiroContato: "20 de out. de 2026",
    conversasAnteriores: [],
    cadastro: {
      contactId: "c-1",
      classificacao: "lead",
      tipo: "lojista",
      nicho: "Moda",
      cidade: null,
      icp: "primeira_vez",
      atendente: "Ana",
      tags: ["vip", "feira"],
      funis: [{ funil: "entrada", etapa: "Negociação" }],
    },
  })),
  atualizarNomeContato: vi.fn(),
}))

import { PainelContato } from "@/app/(auth)/chat/components/painel-contato"

const CONVERSA: Conversa = {
  id: "conv-1",
  contato: { nome: "Marcelle", telefone: "5521970692725", contactId: "c-1" },
  ultimaMensagem: { texto: "oi", horario: "10:00" },
  naoLidas: 0,
  status: "em_atendimento",
  etiquetas: [],
  atribuidaA: null,
  dataPrimeiroContato: "2026-10-20",
  canal: { id: null, nome: null, numero: null, recursos: { templates: true, midia: true, marcar_lida: true } },
}

describe("ficha do contato no chat", () => {
  it("mostra cadastro, funil, tags e o link do perfil; campo vazio vira —", async () => {
    render(<PainelContato conversa={CONVERSA} conversaId="conv-1" onFechar={vi.fn()} onConversaAtualizada={vi.fn()} onNavegar={vi.fn()} />)
    await waitFor(() => expect(screen.getByText("Lead")).toBeTruthy())
    expect(screen.getByText("Lojista")).toBeTruthy()
    expect(screen.getByText("Moda")).toBeTruthy()
    expect(screen.getByText("Primeira vez no nicho")).toBeTruthy()
    expect(screen.getByText("Ana")).toBeTruthy()
    expect(screen.getByText("Funil de Entrada")).toBeTruthy()
    expect(screen.getByText("Negociação")).toBeTruthy()
    expect(screen.getByText("vip")).toBeTruthy()
    // Cidade vazia
    expect(screen.getByText("Cidade").nextElementSibling?.textContent).toBe("—")
    expect(screen.getByText("Abrir perfil completo").closest("a")?.getAttribute("href")).toBe("/contatos/c-1")
  })

  it("admin e gerente editam no lugar: nicho salvo com os outros campos como estão; tag nova adicionada", async () => {
    render(<PainelContato conversa={CONVERSA} conversaId="conv-1" onFechar={vi.fn()} onConversaAtualizada={vi.fn()} onNavegar={vi.fn()} podeEditar />)
    await waitFor(() => expect(screen.getByText("Moda")).toBeTruthy())

    fireEvent.click(screen.getByLabelText("Editar nicho"))
    const campo = screen.getByLabelText("Nicho") as HTMLInputElement
    fireEvent.change(campo, { target: { value: "Fitness" } })
    fireEvent.keyDown(campo, { key: "Enter" })
    await waitFor(() => expect(screen.getByText("Fitness")).toBeTruthy())
    expect(atualizar).toHaveBeenCalledWith("c-1", { nome: "Marcelle", tipo: "lojista", nicho: "Fitness", cidade: null, icp: "primeira_vez" })

    const tag = screen.getByLabelText("Nova tag") as HTMLInputElement
    fireEvent.change(tag, { target: { value: "Atacado" } })
    fireEvent.keyDown(tag, { key: "Enter" })
    await waitFor(() => expect(screen.getByText("atacado")).toBeTruthy())
    expect(adicionarTag).toHaveBeenCalledWith("c-1", "atacado")
  })

  it("atendente não vê lápis nem campo de tag", async () => {
    render(<PainelContato conversa={CONVERSA} conversaId="conv-1" onFechar={vi.fn()} onConversaAtualizada={vi.fn()} onNavegar={vi.fn()} />)
    await waitFor(() => expect(screen.getByText("Moda")).toBeTruthy())
    expect(screen.queryByLabelText("Editar nicho")).toBeNull()
    expect(screen.queryByLabelText("Nova tag")).toBeNull()
  })
})
