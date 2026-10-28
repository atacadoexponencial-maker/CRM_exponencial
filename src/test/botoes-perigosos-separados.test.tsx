// B48-16 — botões perigosos longe dos comuns: Excluir (card e ficha) e Apagar de vez
// (lixeira) vão para o "⋯"; Remover da carteira e Remover número viram secundário
// vermelho, separados, e Remover da carteira pede confirmação. As actions são falsas.

import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { calcularPainelDeCarteiras } from "@/lib/relatorios/carteiras"
import type { ContatoPerfil } from "@/app/(auth)/contatos/mock-contatos"
import type { CardLead } from "@/app/(auth)/pipeline/mock-pipeline"

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
vi.mock("@/app/(auth)/pipeline/actions", () => ({
  buscarDadosPainel: vi.fn(async () => ({ historico: [], notas: [] })),
  moverCard: vi.fn(), atribuirAtendente: vi.fn(), adicionarNota: vi.fn(), removerCardDoFunil: vi.fn(),
}))
vi.mock("@/app/(auth)/contatos/actions", () => ({
  atualizarDadosContato: vi.fn(), adicionarTagContato: vi.fn(), removerTagContato: vi.fn(),
  listarTagsContato: vi.fn(async () => []), atualizarObservacoesContato: vi.fn(),
}))
const resumo = { contactId: "c-1", nome: "Ana", telefone: "5511999990000", funis: [], nomesDosFunis: {}, conversas: 0, mensagens: 0 }
vi.mock("@/app/(auth)/contatos/lixeira/actions", () => ({
  resumoExclusaoContato: vi.fn(async () => ({ resumo })),
  resumoExclusaoPorCard: vi.fn(async () => ({ resumo })),
  excluirContato: vi.fn(), excluirContatoPorCard: vi.fn(), restaurarContato: vi.fn(),
}))
vi.mock("@/app/(auth)/configuracoes/whatsapp/actions", () => ({
  desconectarWhatsApp: vi.fn(), reconectarWhatsApp: vi.fn(), reinscreverWebhookWhatsApp: vi.fn(), removerConexaoWhatsApp: vi.fn(),
}))
const removerCarteira = vi.fn()
vi.mock("@/app/(auth)/relatorios/actions", () => ({
  buscarCarteiras: vi.fn(), transferirCarteira: vi.fn(), removerCarteira: (...a: unknown[]) => removerCarteira(...a),
}))

import { PainelCard } from "@/app/(auth)/pipeline/components/painel-card"
import { PerfilContato } from "@/app/(auth)/contatos/[id]/components/perfil-contato"
import { ListaLixeira } from "@/app/(auth)/contatos/lixeira/components/lista-lixeira"
import { CarteirasClient } from "@/app/(auth)/relatorios/components/carteiras-client"
import { AcoesWhatsApp } from "@/app/(auth)/configuracoes/whatsapp/acoes-whatsapp"
import { resumoExclusaoContato, resumoExclusaoPorCard } from "@/app/(auth)/contatos/lixeira/actions"

/** A ação não aparece solta: só abrindo o "⋯", como item vermelho. */
async function soNoMenu(rotuloDoMenu: string, acao: string) {
  expect(screen.queryByRole("button", { name: acao })).toBeNull()
  fireEvent.click(screen.getByRole("button", { name: rotuloDoMenu }))
  const item = await screen.findByRole("menuitem", { name: acao })
  expect(item.getAttribute("data-variant")).toBe("destructive")
  return item
}

/** Secundário vermelho, num grupo só dele (nenhum botão comum ao lado). */
function separadoEVermelho(botao: HTMLElement) {
  expect(botao.className).toContain("text-destructive")
  expect(botao.parentElement!.querySelectorAll("button")).toHaveLength(1)
}

const CARD: CardLead = {
  id: "card-1", contactId: "c-1", contato: { nome: "Ana", telefone: "5511999990000" }, etapa: "lead", atendente: null,
  tempoNaEtapa: "1d", dataEntradaEtapa: "27/10/2026", tempoNoFunil: "1d", etiquetas: [], conversaId: "conv-1",
}

const CONTATO: ContatoPerfil = {
  id: "c-1", nome: "Ana Souza", telefone: "5511999998888", classificacao: "ativo", tipo: null, cidade: null, atendente: null,
  created_at: "2026-10-20T10:00:00Z", perfilRfv: null,
  icp: null, tags: [], observacoes: "", conversaId: null, cards: [], compras: [], timeline: [],
}

beforeEach(() => vi.clearAllMocks())

describe("B48-16 — Botões perigosos separados dos comuns", () => {
  it("CA-B48-42: should levar o Excluir do painel do card para o ⋯", async () => {
    render(<PainelCard card={CARD} onFechar={vi.fn()} papel="admin" />)
    expect(screen.getByRole("button", { name: "Abrir conversa" })).toBeTruthy()
    fireEvent.click(await soNoMenu("Mais ações do card", "Excluir"))
    await waitFor(() => expect(resumoExclusaoPorCard).toHaveBeenCalledWith("card-1"))
  })

  it("CA-B48-42: should levar o Excluir contato da ficha para o ⋯", async () => {
    render(<PerfilContato contato={CONTATO} papel="admin" />)
    expect(screen.getByRole("link", { name: /Abrir conversa/ })).toBeTruthy()
    fireEvent.click(await soNoMenu("Mais ações do contato", "Excluir contato"))
    await waitFor(() => expect(resumoExclusaoContato).toHaveBeenCalledWith("c-1"))
  })

  it("CA-B48-42: should levar o Apagar de vez da lixeira para o ⋯, ao lado do Restaurar", async () => {
    const onApagarDeVez = vi.fn()
    render(
      <ListaLixeira
        itens={[{ id: "c-1", nome: "Ana", telefone: "5511999990000", funis: [], excluidoPor: "Admin", excluidoEm: "27/10/2026 10:00", diasRestantes: 20 }]}
        onRestaurar={vi.fn()}
        onApagarDeVez={onApagarDeVez}
      />
    )
    expect(screen.getByRole("button", { name: "Restaurar" })).toBeTruthy()
    fireEvent.click(await soNoMenu("Mais ações de Ana", "Apagar de vez"))
    // ainda pede confirmação antes de apagar
    expect(await screen.findByText("Apagar Ana de vez?")).toBeTruthy()
    expect(onApagarDeVez).not.toHaveBeenCalled()
  })

  it("CA-B48-42: should deixar Remover da carteira vermelho, na outra ponta, e pedir confirmação", async () => {
    const vendedores = [{ id: "a1", nome: "Ana" }, { id: "b1", nome: "Bruno" }]
    render(
      <CarteirasClient
        inicial={{
          papel: "admin",
          painel: calcularPainelDeCarteiras([{ id: "c1", atendenteId: "a1", temCompra: false, ativo: false }], vendedores),
          historico: [],
        }}
      />
    )
    const remover = screen.getAllByRole("button", { name: /Remover da carteira/ })[0]
    expect(remover.className).toContain("text-destructive")
    const grupo = screen.getByTestId("acoes-a1")
    expect(grupo.className).toContain("justify-between")
    expect(grupo.lastElementChild).toBe(remover)
    fireEvent.click(remover)
    expect(await screen.findByTestId("confirmacao-remover")).toBeTruthy()
    expect(removerCarteira).not.toHaveBeenCalled()
  })

  it("CA-B48-42: should deixar Remover número vermelho, numa linha separada de Desconectar e Reconectar", () => {
    render(<AcoesWhatsApp conexaoId="cx-1" status="connected" />)
    const remover = screen.getByRole("button", { name: "Remover número" })
    separadoEVermelho(remover)
    const desconectar = screen.getByRole("button", { name: "Desconectar" })
    expect(desconectar.parentElement).not.toBe(remover.parentElement)
    expect(desconectar.className).not.toContain("text-destructive")
  })
})
