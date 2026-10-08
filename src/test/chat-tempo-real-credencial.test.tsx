// A caixa de entrada só recebe mudanças de conversa ao vivo se o canal entrar
// com a credencial do usuário: sem ela o RLS esconde todo `postgres_changes`, e
// a lista só mudava com F5. Cliente Supabase falso; nenhuma rede.

import { render, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const ordem: string[] = []
const canal = {
  on: vi.fn(() => canal),
  subscribe: vi.fn(() => {
    ordem.push("subscribe")
    return canal
  }),
}
const supabaseFalso = {
  channel: vi.fn(() => canal),
  removeChannel: vi.fn(),
  auth: {
    getSession: vi.fn(async () => ({ data: { session: { access_token: "token-do-usuario" } } })),
  },
  realtime: {
    setAuth: vi.fn(async (token: string) => {
      ordem.push(`setAuth:${token}`)
    }),
  },
}

vi.mock("@/integrations/supabase/client", () => ({ createClient: () => supabaseFalso }))
vi.mock("@/app/(auth)/chat/actions", () => ({
  buscarConversa: vi.fn(),
  buscarMensagens: vi.fn(),
  marcarComoLidas: vi.fn(),
}))
vi.mock("@/app/(auth)/chat/components/filtros-caixa", () => ({ FiltrosCaixa: () => null }))
vi.mock("@/app/(auth)/chat/components/painel-conversa", () => ({ PainelConversa: () => null }))

import { ChatLayout } from "@/app/(auth)/chat/components/chat-layout"

function renderizar(papel: string) {
  return render(
    <ChatLayout
      conversas={[]}
      papel={papel}
      userId="user-1"
      nomeUsuario="Usuário"
      workspaceId="ws-1"
      atendentes={[]}
      atendentesTransferir={[]}
      etiquetasDisponiveis={[]}
      mensagensRapidas={[]}
    />
  )
}

describe("tempo real da caixa de entrada", () => {
  beforeEach(() => {
    ordem.length = 0
    vi.clearAllMocks()
  })

  it("entrega a credencial do usuário aos canais antes de começar a escutar", async () => {
    renderizar("admin")

    // B21-01: dois canais — o da empresa e o das mensagens novas.
    await waitFor(() => expect(canal.subscribe).toHaveBeenCalledTimes(2))
    expect(ordem).toEqual(["setAuth:token-do-usuario", "subscribe", "subscribe"])
  })

  it("should ouvir mensagens novas no tópico da gestão quando é admin ou gerente", async () => {
    renderizar("gerente")
    await waitFor(() => expect(canal.subscribe).toHaveBeenCalledTimes(2))
    const topicos = supabaseFalso.channel.mock.calls.map((c) => (c as unknown as [string])[0])
    expect(topicos).toEqual(["workspace:ws-1", "workspace:ws-1:gestao"])
  })

  it("should ouvir mensagens novas só no tópico dele quando é atendente", async () => {
    renderizar("atendente")
    await waitFor(() => expect(canal.subscribe).toHaveBeenCalledTimes(2))
    const topicos = supabaseFalso.channel.mock.calls.map((c) => (c as unknown as [string])[0])
    expect(topicos).toEqual(["workspace:ws-1", "usuario:user-1"])
  })
})
