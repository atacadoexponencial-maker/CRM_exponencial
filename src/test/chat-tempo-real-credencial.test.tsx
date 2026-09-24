// A caixa de entrada só recebe mudanças de conversa ao vivo se o canal entrar
// com a credencial do usuário: sem ela o RLS esconde todo `postgres_changes`, e
// a lista só mudava com F5. Cliente Supabase falso; nenhuma rede.

import { render, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

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

describe("tempo real da caixa de entrada", () => {
  it("entrega a credencial do usuário ao canal antes de começar a escutar", async () => {
    render(
      <ChatLayout
        conversas={[]}
        papel="admin"
        nomeUsuario="Admin"
        workspaceId="ws-1"
        atendentes={[]}
        atendentesTransferir={[]}
        etiquetasDisponiveis={[]}
        mensagensRapidas={[]}
      />
    )

    await waitFor(() => expect(canal.subscribe).toHaveBeenCalledTimes(1))
    expect(ordem).toEqual(["setAuth:token-do-usuario", "subscribe"])
  })
})
