// B48-17 — atalhos entre telas: do cabeçalho do Chat para a ficha completa do
// contato, e do pedido para a conversa dele. As actions são falsas; o servidor que
// monta o link da conversa é conferido em pedido-abre-conversa.integration.test.ts.

import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { Conversa } from "@/app/(auth)/chat/mock-conversas"

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
vi.mock("@/integrations/supabase/client", () => ({ createClient: () => ({ storage: { from: vi.fn() } }) }))
vi.mock("@/app/(auth)/chat/actions", () => ({
  enviarMensagem: vi.fn(), enviarImagem: vi.fn(), enviarDocumento: vi.fn(), enviarVideo: vi.fn(), enviarAudio: vi.fn(),
  atribuirConversa: vi.fn(), transferirConversa: vi.fn(), resolverConversa: vi.fn(), reabrirConversa: vi.fn(),
  aplicarEtiqueta: vi.fn(), removerEtiqueta: vi.fn(),
}))

import { PainelConversa } from "@/app/(auth)/chat/components/painel-conversa"
import { DetalhePedido, type PedidoDetalhe } from "@/app/(auth)/catalogo/components/detalhe-pedido"

const conversa = (contactId: string | null): Conversa => ({
  id: "conv-1",
  contato: { nome: "Ana Souza", telefone: "5511999990000", contactId },
  ultimaMensagem: { texto: "oi", horario: "10:00" },
  naoLidas: 0,
  status: "em_atendimento",
  etiquetas: [],
  atribuidaA: null,
  dataPrimeiroContato: "2026-10-20",
  canal: { id: null, nome: null, numero: null, recursos: { templates: true, midia: true, marcar_lida: true } },
})

function painel(contactId: string | null, onAbrirFicha = vi.fn()) {
  render(
    <PainelConversa
      conversa={conversa(contactId)}
      mensagens={[]}
      onMensagemEnviada={vi.fn()}
      onMensagemConfirmada={vi.fn()}
      podeAtribuir={false}
      atendentes={[]}
      atendentesTransferir={[]}
      onConversaAtualizada={vi.fn()}
      nomeUsuario="Admin"
      etiquetasDisponiveis={[]}
      mensagensRapidas={[]}
      onAbrirFicha={onAbrirFicha}
    />
  )
  return onAbrirFicha
}

const pedido = (hrefConversa: string | null): PedidoDetalhe => ({
  id: "p-1", numero: 1001, criadoEm: "2026-10-27T15:00:00Z", cliente: { nome: "Ana Souza", whatsapp: "5511999990000" },
  pecas: 1, total: 25, situacao: "novo",
  itens: [{ nome: "Camisa", variacao: "", quantidade: 1, precoUnitario: 25 } as PedidoDetalhe["itens"][number]],
  historico: [], hrefContato: "/contatos/c-1", hrefConversa,
})

describe("B48-17 — Atalhos entre telas", () => {
  it("CA-B48-43: should levar do cabeçalho do Chat à ficha completa, e o nome continua abrindo o painel", () => {
    const onAbrirFicha = painel("c-1")
    const link = screen.getByRole("link", { name: "Abrir ficha completa de Ana Souza" })
    expect(link.getAttribute("href")).toBe("/contatos/c-1")
    fireEvent.click(screen.getByRole("button", { name: "Ana Souza" }))
    expect(onAbrirFicha).toHaveBeenCalledTimes(1)
  })

  it("CA-B48-43: conversa sem contato cadastrado não mostra o atalho", () => {
    painel(null)
    expect(screen.queryByRole("link", { name: /Abrir ficha completa/ })).toBeNull()
  })

  it("CA-B48-44: should mostrar Abrir conversa ao lado de Perfil do contato, levando à conversa", () => {
    render(<DetalhePedido pedido={pedido("/chat?conversa=conv-1")} onFechar={vi.fn()} onMudarSituacao={vi.fn()} />)
    const perfil = screen.getByRole("link", { name: /Perfil do contato/ })
    const abrir = screen.getByRole("link", { name: /Abrir conversa/ })
    expect(abrir.getAttribute("href")).toBe("/chat?conversa=conv-1")
    expect(abrir.parentElement).toBe(perfil.parentElement)
  })

  it("CA-B48-44: pedido de contato sem conversa não mostra Abrir conversa", () => {
    render(<DetalhePedido pedido={pedido(null)} onFechar={vi.fn()} onMudarSituacao={vi.fn()} />)
    expect(screen.getByRole("link", { name: /Perfil do contato/ })).toBeTruthy()
    expect(screen.queryByRole("link", { name: /Abrir conversa/ })).toBeNull()
  })
})
