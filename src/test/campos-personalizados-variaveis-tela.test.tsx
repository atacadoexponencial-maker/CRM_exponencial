// B38-05 — variáveis com texto reserva nas telas: a variável no editor do campo, os
// botões que pedem o reserva no editor de automação e no de campanha, o texto sem
// reserva apontado, e a mensagem rápida antiga marcada. As actions ficam mockadas; o
// servidor é conferido em campos-personalizados-variaveis.integration.test.ts.

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type * as AcoesDeCampanha from "@/app/(auth)/campanhas/actions"

const contar = vi.fn()
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
vi.mock("@/lib/sessao", () => ({ sessaoAtual: vi.fn() }))
vi.mock("@/integrations/supabase/server", () => ({ createClient: vi.fn() }))
vi.mock("@/integrations/supabase/service", () => ({ createServiceClient: vi.fn(() => ({})) }))
vi.mock("@/lib/campanhas", () => ({ processarCampanhasPendentes: vi.fn(async () => 0) }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/app/(auth)/campanhas/actions", async (importOriginal) => ({
  ...(await importOriginal<typeof AcoesDeCampanha>()),
  contarDestinatarios: (...a: unknown[]) => contar(...a),
  avaliarDisparo: vi.fn(async () => null),
  confirmarCampanha: vi.fn(),
  salvarRascunho: vi.fn(),
  uploadArquivoCampanha: vi.fn(),
}))
vi.mock("@/app/(auth)/configuracoes/mensagens-rapidas/actions", () => ({
  criarMensagemRapida: vi.fn(),
  editarMensagemRapida: vi.fn(),
  excluirMensagemRapida: vi.fn(),
}))

import { HORARIO_PADRAO } from "@/lib/horario-comercial"
import type { BlocoAcao } from "@/lib/fluxo-automacao"
import type { OpcoesEditor } from "@/app/(auth)/configuracoes/automacoes/components/catalogo"
import { PainelBloco } from "@/app/(auth)/configuracoes/automacoes/components/painel-bloco"
import { CamposClient } from "@/app/(auth)/configuracoes/campos/campos-client"
import { EditorCampanhaClient } from "@/app/(auth)/campanhas/[id]/editor-campanha-client"
import { MensagensRapidasClient } from "@/app/(auth)/configuracoes/mensagens-rapidas/mensagens-rapidas-client"
import { TextoComVariaveis } from "@/components/shared/texto-com-variaveis"

const LIMITE = { id: "11111111-1111-4111-8111-111111111111", nome: "Limite de crédito", tipo: "dinheiro", opcoes: [] }

const OPCOES: OpcoesEditor = {
  etiquetas: [],
  atendentes: [],
  tags: [],
  times: [],
  sequencias: [],
  mensagensRapidas: [],
  numeros: [],
  horarioComercial: HORARIO_PADRAO,
  camposPersonalizados: [LIMITE],
}

function abrirAcao(texto: string, onMudar = vi.fn()) {
  const bloco: BlocoAcao = { id: "a", tipo: "acao", acao: "enviar_mensagem", parametros: { texto }, posicao: { x: 0, y: 0 } }
  render(
    <PainelBloco
      bloco={bloco}
      gatilho="tag_adicionada"
      repeticao={{ modo: "sempre" }}
      onMudarRepeticao={vi.fn()}
      opcoes={OPCOES}
      pendencias={[]}
      guardarArquivo={vi.fn()}
      onMudar={onMudar}
      onRemover={vi.fn()}
      onDuplicar={vi.fn()}
      onFechar={vi.fn()}
    />
  )
  return onMudar
}

beforeEach(() => {
  contar.mockReset()
  contar.mockResolvedValue({ total: 1, amostra: [{ id: "c-1", nome: "Ana", telefone: "5511999990001" }] })
})

describe("B38-05 — variáveis com texto reserva nas telas", () => {
  it("CA-B38-14: should mostrar a variável do campo no editor do campo", () => {
    render(<CamposClient campos={[{ id: LIMITE.id, nome: "Limite de crédito", tipo: "dinheiro", ordem: 0, opcoes: [], preenchidos: 0 }]} />)
    fireEvent.click(screen.getByRole("button", { name: "Editar" }))
    expect(document.querySelector("[data-variavel]")).toHaveTextContent("{{limite_de_credito}}")
  })

  it("CA-B38-41: should pedir o texto reserva ao clicar no botão do campo, na automação e na campanha", async () => {
    const { unmount } = render(<div />)
    unmount()
    abrirAcao("Oi ")
    fireEvent.click(screen.getByRole("button", { name: "Limite de crédito" }))
    expect(screen.getByRole("group", { name: "Texto reserva de Limite de crédito" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Inserir" })).toBeDisabled()

    document.body.innerHTML = ""
    render(
      <EditorCampanhaClient
        campanha={{ id: "k-1", nome: "Promoção", status: "rascunho", segmento: {}, tipoMensagem: "texto", conteudo: "", arquivoUrl: null, arquivoNome: null, agendadaPara: null, whatsappConnectionId: null }}
        opcoes={{ atendentes: [], etiquetas: [], funis: [], campos: [LIMITE] }}
        numeros={[]}
      />
    )
    await waitFor(() => expect(contar).toHaveBeenCalled())
    await waitFor(() => {
      fireEvent.click(screen.getByRole("button", { name: "Próximo" }))
      expect(screen.getByRole("button", { name: "Limite de crédito" })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole("button", { name: "Limite de crédito" }))
    expect(screen.getByRole("group", { name: "Texto reserva de Limite de crédito" })).toBeInTheDocument()
  })

  it("CA-B38-49: should inserir a variável com o texto reserva no ponto do cursor", () => {
    const onMudar = vi.fn()
    render(<TextoComVariaveis id="t" valor="Seu limite é  hoje" variaveis={[{ chave: "limite_de_credito", rotulo: "Limite de crédito" }]} onMudar={onMudar} />)
    const texto = screen.getByRole("textbox") as HTMLTextAreaElement
    texto.setSelectionRange(13, 13)
    fireEvent.click(screen.getByRole("button", { name: "Limite de crédito" }))
    fireEvent.change(document.getElementById("t-reserva")!, { target: { value: "a combinar" } })
    fireEvent.click(screen.getByRole("button", { name: "Inserir" }))
    expect(onMudar).toHaveBeenCalledWith("Seu limite é {{limite_de_credito|a combinar}} hoje")
  })

  it("CA-B38-48: should apontar a variável sem reserva e não inserir sem reserva", () => {
    abrirAcao("Olá {{nome_contato}}, seu limite é {{limite_de_credito}}")
    expect(screen.getByText("As variáveis {{nome_contato}}, {{limite_de_credito}} estão sem texto reserva. Use o botão de cada uma para pôr o reserva.")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Nome do contato" }))
    expect(screen.getByRole("button", { name: "Inserir" })).toBeDisabled()
  })

  it("CA-B38-63: should marcar a mensagem rápida antiga e pedir o reserva nos botões", () => {
    render(
      <MensagensRapidasClient
        mensagensIniciais={[{ id: "m-1", titulo: "/ola", conteudo: "Olá {{nome_contato}}" }]}
        variaveis={[{ chave: "nome_contato", rotulo: "Nome do contato" }]}
      />
    )
    expect(screen.getByText("Precisa de ajuste: {{nome_contato}} sem texto reserva")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Nova mensagem" }))
    const dialogo = screen.getByRole("dialog")
    fireEvent.change(within(dialogo).getByLabelText("Título (atalho)"), { target: { value: "/oi" } })
    fireEvent.change(within(dialogo).getByLabelText("Conteúdo"), { target: { value: "Olá {{nome_contato}}" } })
    expect(within(dialogo).getByRole("button", { name: "Salvar" })).toBeDisabled()
    fireEvent.click(within(dialogo).getByRole("button", { name: "Nome do contato" }))
    expect(within(dialogo).getByRole("group", { name: "Texto reserva de Nome do contato" })).toBeInTheDocument()
  })
})
