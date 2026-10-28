// B48-15 — ajuda onde falta explicação: o "?" ou a frase ao lado de cada termo e
// botão que a tela não explicava, os ícones do campo de mensagem com nome, o motivo
// do template rejeitado e a tag que não aceita espaço. As actions são falsas.

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Conversa } from "@/app/(auth)/chat/mock-conversas"
import type { ContatoPerfil } from "@/app/(auth)/contatos/mock-contatos"

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }) }))
vi.mock("@/integrations/supabase/client", () => ({ createClient: () => ({ storage: { from: vi.fn() } }) }))
vi.mock("@/app/(auth)/configuracoes/funis/actions", () => ({
  adicionarEtapa: vi.fn(), apagarEtapa: vi.fn(), apagarFunil: vi.fn(), automacoesQueUsam: vi.fn(),
  criarFunil: vi.fn(), editarEtapa: vi.fn(), moverEtapa: vi.fn(), renomearFunil: vi.fn(),
}))
vi.mock("@/app/(auth)/contatos/actions", () => ({
  atualizarDadosContato: vi.fn(),
  adicionarTagContato: vi.fn(async () => ({})),
  removerTagContato: vi.fn(),
  listarTagsContato: vi.fn(async () => []),
  atualizarObservacoesContato: vi.fn(),
}))
vi.mock("@/app/(auth)/contatos/lixeira/actions", () => ({ resumoExclusaoContato: vi.fn(), excluirContato: vi.fn(), restaurarContato: vi.fn() }))
vi.mock("@/app/(auth)/chat/actions", () => ({
  enviarMensagem: vi.fn(), enviarImagem: vi.fn(), enviarDocumento: vi.fn(), enviarVideo: vi.fn(), enviarAudio: vi.fn(),
  atribuirConversa: vi.fn(), transferirConversa: vi.fn(), resolverConversa: vi.fn(), reabrirConversa: vi.fn(),
  aplicarEtiqueta: vi.fn(), removerEtiqueta: vi.fn(),
  buscarInfoContato: vi.fn(async () => ({
    dataPrimeiroContato: "20 de out.",
    cadastro: { contactId: "c-1", classificacao: "ativo", tipo: null, cidade: null, uf: null, icp: null, atendente: null, perfilRfv: null, tags: [], funis: [] },
  })),
  atualizarNomeContato: vi.fn(),
}))
vi.mock("@/app/(auth)/configuracoes/whatsapp/actions", () => ({
  desconectarWhatsApp: vi.fn(), reconectarWhatsApp: vi.fn(), reinscreverWebhookWhatsApp: vi.fn(), removerConexaoWhatsApp: vi.fn(),
}))
vi.mock("@/app/(auth)/catalogo/importar/actions", () => ({ importarLote: vi.fn(), previaImportacao: vi.fn() }))
vi.mock("@/lib/sessao", () => ({ sessaoAtual: vi.fn(async () => ({ user: { id: "u-1" }, perfil: { role: "admin", workspace_id: "w-1" } })) }))
vi.mock("@/integrations/supabase/service", () => ({
  createServiceClient: () => ({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { waba_id: "waba-1", access_token: "tk" } }) }) }) }),
  }),
}))

import { FunisClient } from "@/app/(auth)/configuracoes/funis/funis-client"
import { PerfilContato } from "@/app/(auth)/contatos/[id]/components/perfil-contato"
import { TagsDoContato } from "@/app/(auth)/pipeline/components/tags-do-contato"
import { PainelConversa } from "@/app/(auth)/chat/components/painel-conversa"
import { PainelContato } from "@/app/(auth)/chat/components/painel-contato"
import { AcoesWhatsApp } from "@/app/(auth)/configuracoes/whatsapp/acoes-whatsapp"
import { ImportarClient } from "@/app/(auth)/catalogo/importar/importar-client"
import { DetalhePedido, type PedidoDetalhe } from "@/app/(auth)/catalogo/components/detalhe-pedido"
import { TemplatesClient } from "@/app/(auth)/configuracoes/templates/templates-client"
import { listarTemplates } from "@/app/(auth)/configuracoes/templates/actions"

/** Abre o "?" do termo e devolve o texto que ele mostra. */
function abrirAjuda(termo: string, dentro: HTMLElement = document.body) {
  const botao = within(dentro).getByRole("button", { name: `O que é ${termo}?` })
  fireEvent.click(botao)
  expect(botao.getAttribute("aria-expanded")).toBe("true")
  return (document.getElementById(botao.getAttribute("aria-controls")!) as HTMLElement).textContent ?? ""
}

const CONTATO: ContatoPerfil = {
  id: "c-1", nome: "Ana Souza", telefone: "5511999998888", classificacao: "ativo", tipo: null, cidade: null, atendente: null,
  created_at: "2026-10-20T10:00:00Z", perfilRfv: "fieis",
  icp: "ja_revende", tags: [], observacoes: "", conversaId: null, cards: [], compras: [], timeline: [],
}

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

function painelConversa() {
  return render(
    <PainelConversa
      conversa={CONVERSA}
      mensagens={[]}
      onMensagemEnviada={vi.fn()}
      onMensagemConfirmada={vi.fn()}
      podeAtribuir={false}
      atendentes={[]}
      atendentesTransferir={[]}
      onConversaAtualizada={vi.fn()}
      nomeUsuario="Admin"
      etiquetasDisponiveis={[{ id: "e-1", nome: "VIP", cor: "#f00" }]}
      mensagensRapidas={[]}
      onAbrirFicha={vi.fn()}
    />
  )
}

const pedido = (situacao: PedidoDetalhe["situacao"]): PedidoDetalhe => ({
  id: "p-1", numero: 12, criadoEm: "2026-10-27T15:00:00Z", cliente: { nome: "Ana", whatsapp: "5511999990000" },
  pecas: 1, total: 100, situacao, itens: [{ nome: "Blusa", variacao: "P", quantidade: 1, precoUnitario: 100 } as PedidoDetalhe["itens"][number]],
  historico: [], hrefContato: null, hrefConversa: null,
})

beforeEach(() => vi.clearAllMocks())

describe("B48-15 — Ajuda onde falta explicação", () => {
  it("CA-B48-38: should explicar o funil fixo da Entrada e da Recompra", () => {
    render(
      <FunisClient
        dados={{ fixos: [{ id: "entrada", nome: "Funil de Entrada", etapas: 8 }, { id: "recompra", nome: "Funil de Recompra", etapas: 7 }], funis: [] }}
      />
    )
    const linhas = screen.getAllByRole("button", { name: "O que é funil fixo?" })
    expect(linhas).toHaveLength(2)
    expect(abrirAjuda("funil fixo", linhas[0].closest("li")!)).toMatch(/etapas de Entrada e Recompra .* não mudam/)
  })

  it("CA-B48-38: should explicar ICP e Perfil RFV na ficha do contato", () => {
    render(<PerfilContato contato={CONTATO} papel="admin" />)
    expect(abrirAjuda("Perfil RFV")).toMatch(/Recência.*Frequência.*Valor/)
    expect(abrirAjuda("ICP")).toMatch(/perfil de cliente ideal/)
  })

  it("CA-B48-38: should explicar a Tag no card", async () => {
    render(<TagsDoContato contactId="c-1" />)
    await screen.findByText("Nenhuma tag")
    expect(abrirAjuda("Tag")).toMatch(/fica no contato.*diferente da etiqueta/)
  })

  it("CA-B48-38: should explicar a Etiqueta na conversa do Chat", async () => {
    const { container } = painelConversa()
    fireEvent.click(container.querySelector('[aria-haspopup="menu"]')!)
    fireEvent.click(await screen.findByText("Etiquetas"))
    expect(await screen.findByText(/Etiquetas marcam esta conversa.*As tags ficam no contato/)).toBeTruthy()
  })

  it("CA-B48-38: should explicar o Corrigir recebimento de mensagens do WhatsApp", () => {
    render(<AcoesWhatsApp conexaoId="cx-1" status="connected" />)
    expect(abrirAjuda("Corrigir recebimento de mensagens")).toMatch(/pararem de chegar no Chat/)
  })

  it("CA-B48-38: should explicar o código na importação de produtos", () => {
    render(<ImportarClient />)
    expect(screen.getByText(/O código liga a linha ao produto: código que já existe atualiza esse produto/)).toBeTruthy()
  })

  it("CA-B48-38: should dizer o que Marcar como Fechado e Cancelar pedido mudam", () => {
    render(<DetalhePedido pedido={pedido("em_atendimento")} onFechar={vi.fn()} onMudarSituacao={vi.fn()} />)
    expect(screen.getByRole("button", { name: "Marcar como Fechado" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Cancelar pedido" })).toBeTruthy()
    expect(screen.getByText(/Marcar como Fechado baixa o estoque .* registra a compra no contato. Cancelar pedido encerra o pedido/)).toBeTruthy()
  })

  it("CA-B48-38: o \"?\" fecha com Esc", () => {
    render(<AcoesWhatsApp conexaoId="cx-1" status="connected" />)
    abrirAjuda("Corrigir recebimento de mensagens")
    fireEvent.keyDown(document, { key: "Escape" })
    expect(screen.getByRole("button", { name: "O que é Corrigir recebimento de mensagens?" }).getAttribute("aria-expanded")).toBe("false")
    expect(screen.queryByRole("note")).toBeNull()
  })

  it("CA-B48-39: should dar nome aos botões de anexo, mensagens rápidas, nota interna e áudio", () => {
    painelConversa()
    for (const nome of ["Anexar arquivo", "Mensagens rápidas", "Nota interna", "Gravar áudio"]) {
      const botao = screen.getByRole("button", { name: nome })
      expect(botao.getAttribute("title"), nome).toBeTruthy()
    }
  })

  it("CA-B48-40: should mostrar o motivo do template rejeitado, e o aviso quando a Meta não disse", () => {
    render(
      <TemplatesClient
        templates={[
          { id: "t1", name: "promo", status: "REJECTED", category: "MARKETING", language: "pt_BR", motivo: "Formato inválido: confira as variáveis e os exemplos" },
          { id: "t2", name: "aviso", status: "REJECTED", category: "UTILITY", language: "pt_BR", motivo: "A Meta não informou o motivo" },
          { id: "t3", name: "ok", status: "APPROVED", category: "UTILITY", language: "pt_BR" },
        ]}
      />
    )
    const linha = (nome: string) => screen.getByText(nome).closest("tr") as HTMLElement
    expect(within(linha("promo")).getByText("Rejeitado")).toBeTruthy()
    expect(within(linha("promo")).getByText("Formato inválido: confira as variáveis e os exemplos")).toBeTruthy()
    expect(within(linha("aviso")).getByText("A Meta não informou o motivo")).toBeTruthy()
    expect(linha("ok").textContent).not.toMatch(/motivo/)
  })

  it("CA-B48-40: should traduzir o rejected_reason da Meta no servidor, e sem motivo dizer que ela não informou", async () => {
    const fetchFalso = vi.fn(async () => new Response(JSON.stringify({
      data: [
        { id: "t1", name: "promo", status: "REJECTED", category: "MARKETING", language: "pt_BR", rejected_reason: "INVALID_FORMAT" },
        { id: "t2", name: "aviso", status: "REJECTED", category: "UTILITY", language: "pt_BR", rejected_reason: "NONE" },
        { id: "t3", name: "velho", status: "REJECTED", category: "UTILITY", language: "pt_BR" },
        { id: "t4", name: "ok", status: "APPROVED", category: "UTILITY", language: "pt_BR", rejected_reason: "NONE" },
      ],
    })))
    vi.stubGlobal("fetch", fetchFalso)
    try {
      const lista = await listarTemplates()
      expect(String((fetchFalso.mock.calls[0] as unknown[])[0])).toContain("rejected_reason")
      expect(lista.map((t) => t.motivo)).toEqual([
        "Formato inválido: confira as variáveis e os exemplos",
        "A Meta não informou o motivo",
        "A Meta não informou o motivo",
        undefined,
      ])
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it("CA-B48-41: should barrar o espaço na Nova tag do card, com a dica", async () => {
    render(<TagsDoContato contactId="c-1" />)
    await screen.findByText("Nenhuma tag")
    const campo = screen.getByRole("textbox", { name: "Nova tag" }) as HTMLInputElement
    fireEvent.change(campo, { target: { value: "cliente vip" } })
    expect(campo.value).toBe("clientevip")
    expect(screen.getByText("Tags não têm espaço")).toBeTruthy()
    fireEvent.change(campo, { target: { value: "clientevip2" } })
    await waitFor(() => expect(screen.queryByText("Tags não têm espaço")).toBeNull())
  })

  it("CA-B48-41: should barrar o espaço também na Nova tag da ficha do contato", () => {
    render(<PerfilContato contato={CONTATO} papel="admin" />)
    const campo = screen.getByPlaceholderText("Nova tag (sem espaços)") as HTMLInputElement
    fireEvent.change(campo, { target: { value: "cliente vip" } })
    expect(campo.value).toBe("clientevip")
    expect(screen.getByText("Tags não têm espaço")).toBeTruthy()
  })

  it("CA-B48-41: should barrar o espaço também na tag do painel do contato no Chat", async () => {
    render(<PainelContato conversa={CONVERSA} conversaId="conv-1" onFechar={vi.fn()} onConversaAtualizada={vi.fn()} podeEditar />)
    const campo = (await screen.findByRole("textbox", { name: "Nova tag" })) as HTMLInputElement
    fireEvent.change(campo, { target: { value: "cliente vip" } })
    expect(campo.value).toBe("clientevip")
    expect(screen.getByText("Tags não têm espaço")).toBeTruthy()
  })
})
