// B46-04 — Esc fecha as janelas que o CRM monta à mão, e salvar mostra a mesma
// confirmação curta em todas as telas. As actions são falsas.

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const empurrar = vi.fn()
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: empurrar, replace: vi.fn() }) }))
vi.mock("@/integrations/supabase/client", () => ({ createClient: () => ({ storage: { from: vi.fn() } }) }))
vi.mock("@/app/(auth)/pipeline/actions", () => ({ criarNovoLead: vi.fn(async () => ({})) }))
vi.mock("@/app/(auth)/chat/actions", () => ({
  enviarMensagem: vi.fn(), enviarImagem: vi.fn(), enviarDocumento: vi.fn(), enviarVideo: vi.fn(), enviarAudio: vi.fn(),
  atribuirConversa: vi.fn(), transferirConversa: vi.fn(), resolverConversa: vi.fn(), reabrirConversa: vi.fn(),
  aplicarEtiqueta: vi.fn(), removerEtiqueta: vi.fn(),
}))
vi.mock("@/app/(auth)/configuracoes/etiquetas/actions", () => ({
  criarEtiqueta: vi.fn(async (nome: string, cor: string) => ({ etiqueta: { id: "e-1", nome, cor, conversas: 0 } })),
  editarEtiqueta: vi.fn(async () => ({})),
  excluirEtiqueta: vi.fn(),
}))
vi.mock("@/app/(auth)/configuracoes/campos/actions", () => ({
  criarCampo: vi.fn(async () => ({})),
  editarCampo: vi.fn(), acrescentarOpcao: vi.fn(), renomearOpcao: vi.fn(), tirarOpcao: vi.fn(), apagarCampo: vi.fn(),
  moverCampo: vi.fn(), moverOpcao: vi.fn(), resumoParaApagar: vi.fn(),
}))
vi.mock("@/app/(auth)/configuracoes/funis/actions", () => ({
  criarFunil: vi.fn(async () => ({})),
  adicionarEtapa: vi.fn(), apagarEtapa: vi.fn(), apagarFunil: vi.fn(), automacoesQueUsam: vi.fn(), editarEtapa: vi.fn(), moverEtapa: vi.fn(), renomearFunil: vi.fn(),
}))
vi.mock("@/app/(auth)/catalogo/actions", () => ({ salvarProduto: vi.fn(async () => ({})), excluirProduto: vi.fn(), prepararEnvioFoto: vi.fn() }))
// O formulário do produto é grande; aqui importa só o que o editor faz depois de salvar
vi.mock("@/app/(auth)/catalogo/components/editor-produto", () => ({
  EditorProduto: ({ inicial, onSalvar }: { inicial: unknown; onSalvar: (p: unknown) => Promise<unknown> }) => (
    <button type="button" onClick={() => onSalvar(inicial)}>Salvar produto</button>
  ),
}))

import { AvisosNaTela } from "@/components/shared/avisos-na-tela"
import { ModalNovoLead } from "@/app/(auth)/pipeline/components/modal-novo-lead"
import { PainelConversa } from "@/app/(auth)/chat/components/painel-conversa"
import { EtiquetasClient } from "@/app/(auth)/configuracoes/etiquetas/etiquetas-client"
import { CamposClient } from "@/app/(auth)/configuracoes/campos/campos-client"
import { FunisClient } from "@/app/(auth)/configuracoes/funis/funis-client"
import { EditorClient as EditorProdutoClient } from "@/app/(auth)/catalogo/produtos/[id]/editor-client"
import { criarNovoLead } from "@/app/(auth)/pipeline/actions"
import type { Conversa } from "@/app/(auth)/chat/mock-conversas"

const apertarEsc = () => fireEvent.keyDown(document, { key: "Escape" })

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

beforeEach(() => vi.clearAllMocks())

describe("B46-04 — Esc fecha as janelas", () => {
  it("CA-B46-08: Esc fecha o Novo lead sem criar nada", () => {
    const onFechar = vi.fn()
    render(<ModalNovoLead onSucesso={vi.fn()} onFechar={onFechar} />)
    apertarEsc()
    expect(onFechar).toHaveBeenCalledTimes(1)
    expect(criarNovoLead).not.toHaveBeenCalled()
  })

  it("CA-B46-08: Esc fecha o seletor de mensagens rápidas do Chat", () => {
    render(
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
        etiquetasDisponiveis={[]}
        mensagensRapidas={[{ id: "m1", titulo: "/ola", conteudo: "Olá!" }]}
        onAbrirFicha={vi.fn()}
      />
    )
    fireEvent.click(screen.getByTitle("Mensagens rápidas"))
    expect(screen.getByPlaceholderText("Buscar mensagem rápida...")).toBeTruthy()
    apertarEsc()
    expect(screen.queryByPlaceholderText("Buscar mensagem rápida...")).toBeNull()
  })
})

describe("B46-04 — salvar confirma", () => {
  it("CA-B46-09: criar lead mostra 'Lead criado'", async () => {
    render(<><AvisosNaTela /><ModalNovoLead onSucesso={vi.fn()} onFechar={vi.fn()} /></>)
    fireEvent.change(screen.getByLabelText(/Número de WhatsApp/), { target: { value: "11999990000" } })
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /Criar lead/ })))
    expect(await screen.findByRole("status")).toHaveTextContent("Lead criado")
  })

  it("CA-B46-09: salvar etiqueta mostra 'Etiqueta salva'", async () => {
    render(<><AvisosNaTela /><EtiquetasClient etiquetasIniciais={[]} /></>)
    fireEvent.click(screen.getByRole("button", { name: /Nova etiqueta/ }))
    const dialogo = await screen.findByRole("dialog")
    fireEvent.change(dialogo.querySelector("input")!, { target: { value: "Quente" } })
    fireEvent.click(dialogo.querySelector("button[aria-label^='Cor']") ?? dialogo.querySelectorAll("button")[1])
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Salvar" })))
    expect(await screen.findByText("Etiqueta salva")).toBeTruthy()
  })

  it("CA-B46-09: criar campo mostra 'Campo salvo'", async () => {
    render(<><AvisosNaTela /><CamposClient campos={[]} /></>)
    fireEvent.click(screen.getByRole("button", { name: "Criar campo" }))
    const regiao = screen.getByRole("region", { name: "Novo campo" })
    fireEvent.change(regiao.querySelector("input")!, { target: { value: "Porte" } })
    fireEvent.change(regiao.querySelector("select")!, { target: { value: "texto" } })
    await act(async () => fireEvent.click(screen.getAllByRole("button", { name: "Criar campo" }).at(-1)!))
    expect(await screen.findByText("Campo salvo")).toBeTruthy()
  })

  it("CA-B46-09: criar funil mostra 'Funil salvo'", async () => {
    render(<><AvisosNaTela /><FunisClient dados={{ fixos: [], funis: [] }} /></>)
    fireEvent.click(screen.getByRole("button", { name: /Novo funil/ }))
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Criar funil" })))
    expect(await screen.findByText("Funil salvo")).toBeTruthy()
  })

  it("CA-B46-09: salvar produto mostra 'Produto salvo' e volta para a lista", async () => {
    render(
      <>
        <AvisosNaTela />
        <EditorProdutoClient
          inicial={{ id: null, nome: "Calça", descricao: "", preco: 10, precoDe: null, codigo: "", faixas: [], minimo: null, grade: null, categoriaId: null, visivel: true, destaque: false, fotos: [], tipos: [], estoque: { "": 0 } }}
          categorias={[]}
        />
      </>
    )
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Salvar produto" })))
    await waitFor(() => expect(empurrar).toHaveBeenCalledWith("/catalogo"))
    expect(screen.getByText("Produto salvo")).toBeTruthy()
  })
})
