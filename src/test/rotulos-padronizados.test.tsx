// B48-18 — rótulos que dizem a mesma coisa do mesmo jeito: Funis, Novo lead na ordem
// do Novo contato, publicar/tirar a loja do ar, tipos de campo, atalho da mensagem
// rápida, Dispensar, Filtros salvos e "Ver todos os N". As actions são falsas.

import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }), usePathname: () => "/pipeline" }))
vi.mock("@/integrations/supabase/server", () => ({ createClient: vi.fn(async () => ({})) }))
const criarNovoLead = vi.fn()
vi.mock("@/app/(auth)/pipeline/actions", async (original) => ({
  ...(await original<typeof import("@/app/(auth)/pipeline/actions")>()),
  criarNovoLead: (...a: unknown[]) => criarNovoLead(...a),
}))
vi.mock("@/app/(auth)/contatos/filtros-salvos", () => ({
  apagarFiltroSalvo: vi.fn(), moverFiltroSalvo: vi.fn(), renomearFiltroSalvo: vi.fn(), salvarFiltro: vi.fn(), atualizarFiltroSalvo: vi.fn(),
}))
vi.mock("@/app/(auth)/configuracoes/campos/actions", () => ({
  criarCampo: vi.fn(), editarCampo: vi.fn(), acrescentarOpcao: vi.fn(), renomearOpcao: vi.fn(), tirarOpcao: vi.fn(),
  apagarCampo: vi.fn(), moverCampo: vi.fn(), moverOpcao: vi.fn(), resumoParaApagar: vi.fn(),
}))
vi.mock("@/app/(auth)/configuracoes/mensagens-rapidas/actions", () => ({
  criarMensagemRapida: vi.fn(), editarMensagemRapida: vi.fn(), excluirMensagemRapida: vi.fn(),
}))
vi.mock("@/app/(auth)/alertas/actions", () => ({ dispensarAlerta: vi.fn(), salvarConfigAlertas: vi.fn() }))
const contarDestinatarios = vi.fn()
vi.mock("@/app/(auth)/campanhas/actions", () => ({
  contarDestinatarios: (...a: unknown[]) => contarDestinatarios(...a),
  avaliarDisparo: vi.fn(async () => null), confirmarCampanha: vi.fn(), salvarRascunho: vi.fn(), uploadArquivoCampanha: vi.fn(),
}))

import { CabecalhoDoPipeline } from "@/app/(auth)/pipeline/components/cabecalho-do-pipeline"
import { ModalNovoLead } from "@/app/(auth)/pipeline/components/modal-novo-lead"
import { FormConfiguracoes, type ConfigCatalogo } from "@/app/(auth)/catalogo/components/form-configuracoes"
import { CamposClient } from "@/app/(auth)/configuracoes/campos/campos-client"
import { TIPOS_DE_CAMPO } from "@/lib/campos-personalizados"
import { MensagensRapidasClient } from "@/app/(auth)/configuracoes/mensagens-rapidas/mensagens-rapidas-client"
import { AlertasClient } from "@/app/(auth)/alertas/alertas-client"
import { FaixaFiltrosSalvos } from "@/app/(auth)/contatos/components/faixa-filtros-salvos"
import { EditorCampanhaClient } from "@/app/(auth)/campanhas/[id]/editor-campanha-client"
import { CONFIG_ALERTAS_PADRAO } from "@/lib/alertas"
import type { Filtro } from "@/lib/filtro-contatos"

const pessoas = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `p-${i}`, nome: `Pessoa ${i}`, telefone: `55119000${String(i).padStart(4, "0")}` }))

const CATALOGO = (publicado: boolean): ConfigCatalogo => ({
  endereco: "loja-ana", numeroPedidos: "21999990000", minimo: { tipo: "nenhum", valor: null } as ConfigCatalogo["minimo"],
  descontos: [], mensagemFechamento: "", publicado,
})

beforeEach(() => {
  vi.clearAllMocks()
  contarDestinatarios.mockImplementation(async () => ({ total: 0, amostra: [] }))
})

describe("B48-18 — Rótulos padronizados", () => {
  it("CA-B48-45: o Pipeline diz \"Funis\", como o menu (C-02)", () => {
    render(<CabecalhoDoPipeline atual="entrada" quantidade={3} papel="admin">{null}</CabecalhoDoPipeline>)
    const link = screen.getByRole("link", { name: "Funis" })
    expect(link.getAttribute("href")).toBe("/configuracoes/funis")
    expect(screen.queryByText("Gerenciar funis")).toBeNull()
  })

  it("CA-B48-45: o Novo lead pede nome e depois WhatsApp, e o nome é obrigatório (C-03)", async () => {
    render(<ModalNovoLead onSucesso={vi.fn()} onFechar={vi.fn()} />)
    const nome = screen.getByLabelText("Nome")
    const whatsapp = screen.getByLabelText("WhatsApp")
    expect(nome.compareDocumentPosition(whatsapp) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    fireEvent.change(whatsapp, { target: { value: "11999990000" } })
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /Criar lead/ })))
    expect(await screen.findByText("Nome é obrigatório")).toBeTruthy()
    expect(criarNovoLead).not.toHaveBeenCalled()
  })

  it("CA-B48-45: o servidor também recusa Novo lead sem nome (C-03)", async () => {
    const real = (await vi.importActual<typeof import("@/app/(auth)/pipeline/actions")>("@/app/(auth)/pipeline/actions")).criarNovoLead
    expect(await real("11999990000", null)).toEqual({ erro: "Informe o nome do contato." })
    expect(await real("11999990000", "   ")).toEqual({ erro: "Informe o nome do contato." })
  })

  it("CA-B48-45: catálogo publicado mostra \"Tirar a loja do ar\"; fora do ar, \"Publicar a loja\" (C-18)", () => {
    const props = { prefixoLink: "https://x/loja/", onVerificarEndereco: vi.fn(), onSalvar: vi.fn() }
    const { unmount } = render(<FormConfiguracoes inicial={CATALOGO(true)} {...props} />)
    const tirar = screen.getByRole("button", { name: "Tirar a loja do ar" })
    expect(screen.queryByRole("button", { name: "Publicar a loja" })).toBeNull()
    fireEvent.click(tirar)
    expect(screen.getByRole("button", { name: "Publicar a loja" })).toBeTruthy()
    expect(screen.getByText("Salve para fechar a loja.")).toBeTruthy()
    unmount()
    render(<FormConfiguracoes inicial={CATALOGO(false)} {...props} />)
    expect(screen.getByRole("button", { name: "Publicar a loja" })).toBeTruthy()
  })

  it("CA-B48-45: os tipos de campo são \"Uma opção\" e \"Várias opções\", com exemplo em cinza (C-26, C-27)", () => {
    expect(TIPOS_DE_CAMPO.map((t) => t.rotulo)).toContain("Uma opção")
    expect(TIPOS_DE_CAMPO.map((t) => t.rotulo)).toContain("Várias opções")
    expect(TIPOS_DE_CAMPO.map((t) => t.rotulo)).not.toContain("Lista de opções")
    render(<CamposClient campos={[]} />)
    fireEvent.click(screen.getAllByRole("button", { name: /Criar campo|Novo campo/ })[0])
    const novo = screen.getByRole("region", { name: "Novo campo" })
    fireEvent.change(within(novo).getByRole("combobox"), { target: { value: "lista" } })
    for (const n of [1, 2]) {
      const opcao = within(novo).getByLabelText(`Opção ${n}`) as HTMLInputElement
      expect(opcao.value).toBe("")
      expect(opcao.placeholder).toMatch(/^Ex\.: /)
      expect(opcao.className).toContain("placeholder:text-muted-foreground")
    }
  })

  it("CA-B48-45: o campo da mensagem rápida é \"Atalho (digite / no chat)\" (C-29)", () => {
    render(<MensagensRapidasClient mensagensIniciais={[{ id: "m-1", titulo: "/ola", conteudo: "Olá" }]} variaveis={[]} />)
    expect(screen.getByRole("columnheader", { name: "Atalho" })).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Nova mensagem" }))
    expect(within(screen.getByRole("dialog")).getByLabelText("Atalho (digite / no chat)")).toBeTruthy()
  })

  it("CA-B48-45: o X dos alertas é \"Dispensar\" (C-33)", () => {
    render(
      <AlertasClient
        alertasIniciais={[{
          cardId: "card-1", contactId: "c-1", tipo: "lead_sem_resposta", tipoLabel: "Lead sem resposta", contatoNome: "Ana",
          etapaLabel: "Lead", diasSemAtividade: 4, atendenteNome: null, referencia: "2026-10-24T10:00:00Z", conversaId: null,
        }]}
        configInicial={CONFIG_ALERTAS_PADRAO}
        papel="admin"
      />
    )
    expect(screen.getByRole("button", { name: "Dispensar" })).toBeTruthy()
  })

  it("CA-B48-45: a faixa se chama \"Filtros salvos\" e o menu diz \"Editar\" e \"Apagar\" (C-12)", () => {
    render(
      <FaixaFiltrosSalvos
        filtros={[{ id: "f-1", nome: "Lojistas", filtro: {} as Filtro }]}
        ativoId={null}
        podeGerir
        onAlternar={vi.fn()}
        onMudou={vi.fn()}
      />
    )
    expect(screen.getByText("Filtros salvos")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Opções do filtro Lojistas" }))
    const menu = screen.getByRole("menu")
    expect(within(menu).getByText("Editar")).toBeTruthy()
    expect(within(menu).getByText("Apagar")).toBeTruthy()
    expect(within(menu).queryByText("Renomear")).toBeNull()
  })

  it("CA-B48-45: a campanha tem \"Ver todos os N\" na lista de destinatários (C-35)", async () => {
    contarDestinatarios.mockImplementation(async () => ({ total: 46, amostra: pessoas(46) }))
    render(<EditorCampanhaClient campanha={null} opcoes={{ atendentes: [], etiquetas: [], funis: [] }} numeros={[]} />)
    const ver = await screen.findByRole("button", { name: "Ver todos os 46" })
    expect(screen.getByText("Pessoa 4")).toBeTruthy()
    expect(screen.queryByText("Pessoa 5")).toBeNull()
    fireEvent.click(ver)
    await waitFor(() => expect(screen.getByText("Pessoa 45")).toBeTruthy())
    expect(screen.queryByRole("button", { name: /Ver todos/ })).toBeNull()
    // com tudo já na amostra, não volta ao servidor
    expect(contarDestinatarios).not.toHaveBeenCalledWith(expect.anything(), true)
  })

  it("CA-B48-45: com mais destinatários que a amostra, \"Ver todos\" pede a lista inteira ao servidor (C-35)", async () => {
    contarDestinatarios.mockImplementation(async (_s: unknown, todos?: boolean) => ({ total: 120, amostra: pessoas(todos ? 120 : 50) }))
    render(<EditorCampanhaClient campanha={null} opcoes={{ atendentes: [], etiquetas: [], funis: [] }} numeros={[]} />)
    fireEvent.click(await screen.findByRole("button", { name: "Ver todos os 120" }))
    await waitFor(() => expect(screen.getByText("Pessoa 119")).toBeTruthy())
    expect(contarDestinatarios).toHaveBeenLastCalledWith(expect.anything(), true)
  })
})
