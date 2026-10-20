// QA M23 (06/10/2026, chat) — no celular o chat mostra uma coluna por vez: a lista
// de conversas, e, ao abrir uma, só a conversa, com "voltar". As classes `hidden`
// e `md:flex` fazem a troca pela largura; aqui se confere que elas mudam com a
// conversa ativa. Lista e conversa são falsas: só o clique e o voltar importam.

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
          <button type="button" onClick={() => onConversaClick(c.id)}>{c.contato.nome}</button>
        </li>
      ))}
    </ul>
  ),
}))
vi.mock("@/app/(auth)/chat/components/painel-conversa", () => ({
  PainelConversa: ({ onVoltar }: { onVoltar?: () => void }) => (
    <button type="button" onClick={onVoltar}>Voltar para a lista de conversas</button>
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

describe("QA M23 — chat em uma coluna no celular", () => {
  it("começa na lista; abrir uma conversa esconde a lista no celular e mostra a conversa; voltar inverte", async () => {
    renderizar()
    const lista = screen.getByTestId("lista-de-conversas")
    const conversa = screen.getByTestId("area-da-conversa")
    const escondido = (el: HTMLElement) => el.className.split(" ").includes("hidden")
    expect(escondido(lista)).toBe(false)
    expect(escondido(conversa)).toBe(true)

    fireEvent.click(screen.getByText("Ana"))
    await waitFor(() => expect(escondido(screen.getByTestId("lista-de-conversas"))).toBe(true))
    expect(escondido(screen.getByTestId("area-da-conversa"))).toBe(false)

    fireEvent.click(await screen.findByText("Voltar para a lista de conversas"))
    await waitFor(() => expect(escondido(screen.getByTestId("lista-de-conversas"))).toBe(false))
    expect(escondido(screen.getByTestId("area-da-conversa"))).toBe(true)
  })
})
