// B29-03 — a foto chega ao vivo: o evento `contato_foto` no canal da empresa troca
// o círculo das conversas daquele contato sem recarregar. Cliente Supabase falso;
// a lista é desenhada por um FiltrosCaixa mínimo que expõe a foto de cada conversa.

import { render, screen, waitFor, act } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Conversa } from "@/app/(auth)/chat/mock-conversas"

type Handler = (payload: { payload: unknown }) => void
const handlers: Array<{ filtro: { event?: string }; handler: Handler }> = []
const canal = {
  on: vi.fn((_tipo: string, filtro: { event?: string }, handler: Handler) => {
    handlers.push({ filtro, handler })
    return canal
  }),
  subscribe: vi.fn(() => canal),
}
const supabaseFalso = {
  channel: vi.fn(() => canal),
  removeChannel: vi.fn(),
  auth: { getSession: vi.fn(async () => ({ data: { session: { access_token: "token" } } })) },
  realtime: { setAuth: vi.fn(async () => {}) },
}

vi.mock("@/integrations/supabase/client", () => ({ createClient: () => supabaseFalso }))
vi.mock("@/app/(auth)/chat/actions", () => ({
  buscarConversa: vi.fn(),
  buscarMensagens: vi.fn(async () => []),
  marcarComoLidas: vi.fn(),
  carregarMaisConversas: vi.fn(async () => []),
}))
vi.mock("@/app/(auth)/chat/components/filtros-caixa", () => ({
  FiltrosCaixa: ({ conversas }: { conversas: Conversa[] }) => (
    <ul>
      {conversas.map((c) => (
        <li key={c.id} data-testid={`conversa-${c.id}`}>{c.contato.fotoUrl ?? "sem-foto"}</li>
      ))}
    </ul>
  ),
}))
vi.mock("@/app/(auth)/chat/components/painel-conversa", () => ({ PainelConversa: () => null }))

import { ChatLayout } from "@/app/(auth)/chat/components/chat-layout"

function conversa(id: string, contactId: string, fotoUrl: string | null = null): Conversa {
  return {
    id,
    contato: { nome: "Ana", telefone: "5511999998888", contactId, fotoUrl },
    ultimaMensagem: { texto: "oi", horario: "10:00" },
    naoLidas: 0,
    status: "em_espera",
    etiquetas: [],
    atribuidaA: null,
    dataPrimeiroContato: "20/10/2026",
    canal: { id: null, nome: null, numero: null, recursos: { templates: true, midia: true, marcar_lida: true } },
  }
}

beforeEach(() => {
  handlers.length = 0
  vi.clearAllMocks()
})

describe("B29-03 — foto ao vivo", () => {
  it("CA-B29-17: o evento contato_foto troca a foto das conversas daquele contato, sem recarregar", async () => {
    render(
      <ChatLayout
        conversas={[conversa("conv-1", "c-1"), conversa("conv-2", "c-1"), conversa("conv-3", "c-2")]}
        papel="admin"
        userId="user-1"
        nomeUsuario="Admin"
        workspaceId="ws-1"
        atendentes={[]}
        atendentesTransferir={[]}
        etiquetasDisponiveis={[]}
        mensagensRapidas={[]}
      />
    )
    await waitFor(() => expect(handlers.some((h) => h.filtro.event === "contato_foto")).toBe(true))
    expect(screen.getByTestId("conversa-conv-1").textContent).toBe("sem-foto")

    const evento = handlers.find((h) => h.filtro.event === "contato_foto")!
    act(() => evento.handler({ payload: { contact_id: "c-1", photo_url: "https://assinada/ws-1/c-1.jpg" } }))

    expect(screen.getByTestId("conversa-conv-1").textContent).toBe("https://assinada/ws-1/c-1.jpg")
    expect(screen.getByTestId("conversa-conv-2").textContent).toBe("https://assinada/ws-1/c-1.jpg")
    expect(screen.getByTestId("conversa-conv-3").textContent).toBe("sem-foto")
  })
})
