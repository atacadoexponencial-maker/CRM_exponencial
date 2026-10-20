// Ficha do contato no chat (pedido dela em 20/10/2026): além de nome, número e
// conversas anteriores, mostra o cadastro (classificação, tipo, nicho, cidade,
// perfil, atendente, tags), a etapa em cada funil e o link para o perfil completo.

import { render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { Conversa } from "@/app/(auth)/chat/mock-conversas"

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
})
