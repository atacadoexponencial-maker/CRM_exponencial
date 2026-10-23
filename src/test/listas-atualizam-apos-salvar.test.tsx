// QA A10 (06/10/2026) — Contatos e Agenda mostram o que o servidor mandou de novo
// depois de salvar (o router.refresh() traz props novas). Antes, o estado nascia
// das props e ignorava a lista nova até o F5, e a pessoa cadastrava de novo.

import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { Contato } from "@/app/(auth)/contatos/mock-contatos"
import type { ItemAgenda } from "@/app/(auth)/agenda/actions"

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }))
vi.mock("@/app/(auth)/contatos/actions", () => ({ listarContatos: vi.fn(async () => []), verificarNumeroDuplicado: vi.fn(), criarContato: vi.fn() }))
vi.mock("@/app/(auth)/contatos/lixeira/actions", () => ({ resumoExclusaoContato: vi.fn(), excluirContato: vi.fn() }))
vi.mock("@/app/(auth)/agenda/actions", () => ({
  adiarLembrete: vi.fn(),
  buscarContatosParaFollowUp: vi.fn(async () => []),
  criarFollowUp: vi.fn(),
  marcarLembreteFeito: vi.fn(),
}))

import { ListaContatos } from "@/app/(auth)/contatos/components/lista-contatos"
import { AgendaClient } from "@/app/(auth)/agenda/agenda-client"

const contato = (id: string, nome: string): Contato => ({
  id, nome, telefone: `5511${id.padStart(8, "0")}`, classificacao: "lead", tipo: null, cidade: null, atendente: null, created_at: "2026-10-20T10:00:00Z",
})

const item = (id: string, instrucao: string): ItemAgenda => ({
  id, origem: "avulso", contatoNome: "Cliente", contatoId: "c-1", conversaId: null, instrucao, dueAt: "2099-01-01T12:00:00Z", atrasado: false,
})

describe("QA A10 — listas acompanham as props novas depois de salvar", () => {
  it("Contatos: o contato recém-criado aparece quando a lista nova chega nas props", () => {
    const { rerender } = render(<ListaContatos contatos={[contato("1", "Ana")]} papel="admin" />)
    expect(screen.getByText("Ana")).toBeTruthy()
    expect(screen.queryByText("Bia")).toBeNull()

    rerender(<ListaContatos contatos={[contato("2", "Bia"), contato("1", "Ana")]} papel="admin" />)
    expect(screen.getByText("Bia")).toBeTruthy()
    expect(screen.getByText("Ana")).toBeTruthy()
  })

  it("Agenda: o follow-up recém-criado aparece quando a agenda nova chega nas props", () => {
    const { rerender } = render(<AgendaClient itensIniciais={[item("a", "Ligar de manhã")]} papel="admin" />)
    expect(screen.getByText("Ligar de manhã")).toBeTruthy()
    expect(screen.queryByText("Mandar catálogo")).toBeNull()

    rerender(<AgendaClient itensIniciais={[item("a", "Ligar de manhã"), item("b", "Mandar catálogo")]} papel="admin" />)
    expect(screen.getByText("Mandar catálogo")).toBeTruthy()
  })
})
