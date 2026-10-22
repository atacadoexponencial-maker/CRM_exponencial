// Ajuste do preview da B36 (22/10/2026, chat) — a ficha do cliente fica entre a lista
// de conversas e a conversa, e só abre quando a pessoa clica no nome do contato. Lista,
// conversa e ficha são falsas: só importam o clique no nome, a ordem e o fechar.

import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { Conversa } from "@/app/(auth)/chat/mock-conversas"

const canal = { on: vi.fn(() => canal), subscribe: vi.fn(() => canal) }
vi.mock("@/integrations/supabase/client", () => ({
  createClient: () => ({
    channel: vi.fn(() => canal),
    removeChannel: vi.fn(),
    auth: { getSession: vi.fn(async () => ({ data: { session: { access_token: "t" } } })) },
    realtime: { setAuth: vi.fn(async () => {}) },
  }),
}))
vi.mock("@/app/(auth)/chat/actions", () => ({
  buscarConversa: vi.fn(),
  buscarMensagens: vi.fn(async () => []),
  marcarComoLidas: vi.fn(async () => {}),
  carregarMaisConversas: vi.fn(async () => []),
}))
vi.mock("@/app/(auth)/chat/components/filtros-caixa", () => ({
  FiltrosCaixa: ({ conversas, onConversaClick }: { conversas: Conversa[]; onConversaClick: (id: string) => void }) => (
    <ul>
      {conversas.map((c) => (
        <li key={c.id}>
          <button type="button" onClick={() => onConversaClick(c.id)}>Abrir {c.contato.nome}</button>
        </li>
      ))}
    </ul>
  ),
}))
vi.mock("@/app/(auth)/chat/components/painel-conversa", () => ({
  PainelConversa: ({ onAbrirFicha }: { onAbrirFicha?: () => void }) => (
    <button type="button" onClick={onAbrirFicha}>Nome do contato</button>
  ),
}))
vi.mock("@/app/(auth)/chat/components/painel-contato", () => ({
  PainelContato: ({ onFechar }: { onFechar: () => void }) => (
    <aside aria-label="Ficha do cliente">
      <button type="button" onClick={onFechar}>Fechar ficha</button>
    </aside>
  ),
}))

import { ChatLayout } from "@/app/(auth)/chat/components/chat-layout"

const CONVERSA: Conversa = {
  id: "conv-1",
  contato: { nome: "Ana", telefone: "5511999990000", contactId: "c-1" },
  ultimaMensagem: { texto: "oi", horario: "10:00" },
  naoLidas: 0,
  status: "em_atendimento",
  etiquetas: [],
  atribuidaA: null,
  dataPrimeiroContato: "2026-10-20",
  canal: { id: null, nome: null, numero: null, recursos: { templates: true, midia: true, marcar_lida: true } },
}

function renderizar() {
  return render(
    <ChatLayout
      conversas={[CONVERSA]}
      papel="admin"
      userId="u-1"
      nomeUsuario="Admin"
      workspaceId="ws-1"
      atendentes={[]}
      atendentesTransferir={[]}
      etiquetasDisponiveis={[]}
      mensagensRapidas={[]}
    />
  )
}

const ficha = () => screen.queryByRole("complementary", { name: "Ficha do cliente" })

describe("Chat — ficha do cliente no meio, aberta pelo nome", () => {
  it("não abre a ficha sozinha; abre ao clicar no nome, entre a lista e a conversa, e fecha no X", async () => {
    renderizar()
    fireEvent.click(screen.getByRole("button", { name: "Abrir Ana" }))
    await waitFor(() => expect(screen.getByRole("button", { name: "Nome do contato" })).toBeTruthy())
    expect(ficha()).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Nome do contato" }))
    const aberta = ficha()!
    expect(aberta).toBeTruthy()

    const lista = screen.getByTestId("lista-de-conversas")
    const conversa = screen.getByTestId("area-da-conversa")
    expect(lista.compareDocumentPosition(aberta) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(aberta.compareDocumentPosition(conversa) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Fechar ficha" }))
    expect(ficha()).toBeNull()
  })
})
