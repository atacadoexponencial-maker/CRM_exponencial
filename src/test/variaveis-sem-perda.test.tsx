// B47-07 — variáveis das automações: o exemplo do campo não ensina a digitar chaves,
// a variável escolhida não some quando a pessoa vai direto ao Salvar, e os erros do
// Salvar aparecem um por linha, longe do painel do bloco.

import { useState } from "react"
import { fireEvent, render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/integrations/supabase/service", () => ({ createServiceClient: vi.fn() }))
vi.mock("@/lib/sessao", () => ({ sessaoAtual: vi.fn() }))

import { HORARIO_PADRAO } from "@/lib/horario-comercial"
import type { BlocoAcao, Fluxo } from "@/lib/fluxo-automacao"
import type { OpcoesEditor } from "@/app/(auth)/configuracoes/automacoes/components/catalogo"
import { PainelBloco } from "@/app/(auth)/configuracoes/automacoes/components/painel-bloco"
import { EditorFluxo } from "@/app/(auth)/configuracoes/automacoes/components/editor-fluxo"
import { TextoComVariaveis, RESERVA_PADRAO } from "@/components/shared/texto-com-variaveis"

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver

const OPCOES: OpcoesEditor = {
  etiquetas: [],
  atendentes: [],
  tags: [],
  times: [],
  sequencias: [],
  mensagensRapidas: [],
  numeros: [],
  horarioComercial: HORARIO_PADRAO,
}
const posicao = { x: 0, y: 0 }

function abrirAcao(acao: BlocoAcao["acao"]) {
  const bloco: BlocoAcao = { id: "a", tipo: "acao", acao, parametros: { texto: "" }, posicao }
  render(
    <PainelBloco
      bloco={bloco}
      gatilho="tag_adicionada"
      repeticao={{ modo: "sempre" }}
      onMudarRepeticao={vi.fn()}
      opcoes={OPCOES}
      pendencias={[]}
      guardarArquivo={vi.fn()}
      onMudar={vi.fn()}
      onRemover={vi.fn()}
      onDuplicar={vi.fn()}
      onFechar={vi.fn()}
    />
  )
}

/** O texto com variáveis e, fora dele, um botão que faz o papel do Salvar. */
function TextoESalvar({ inicial }: { inicial: string }) {
  const [valor, setValor] = useState(inicial)
  return (
    <>
      <TextoComVariaveis id="t" valor={valor} variaveis={[{ chave: "primeiro_nome", rotulo: "Primeiro nome" }]} onMudar={setValor} />
      <button type="button">Salvar</button>
      <output data-testid="valor">{valor}</output>
    </>
  )
}

/** Põe o cursor no fim do texto, onde a pessoa estava digitando. */
function cursorNoFim() {
  const campo = document.getElementById("t") as HTMLTextAreaElement
  campo.setSelectionRange(campo.value.length, campo.value.length)
}

/** Sai da caixa do reserva para o Salvar, como o clique no botão faz. */
function irParaOSalvar() {
  fireEvent.blur(document.getElementById("t-reserva")!, { relatedTarget: screen.getByRole("button", { name: "Salvar" }) })
}

describe("B47-07 — variáveis sem perda e em linguagem simples", () => {
  it("CA-B47-16: o exemplo do lembrete e o da mensagem não têm chaves e dizem para clicar no botão", () => {
    for (const acao of ["criar_lembrete", "enviar_mensagem"] as const) {
      const { unmount } = { unmount: () => document.body.replaceChildren() }
      abrirAcao(acao)
      const campo = screen.getByRole("textbox", { name: acao === "criar_lembrete" ? "Lembrete" : "Mensagem" }) as HTMLTextAreaElement
      expect(campo.placeholder).not.toContain("{{")
      expect(campo.placeholder).toContain("clique em Primeiro nome")
      unmount()
    }
  })

  it("CA-B47-17: ir direto ao Salvar com a caixa do reserva aberta e vazia insere a variável com 'cliente'", () => {
    render(<TextoESalvar inicial="Ligar para " />)
    cursorNoFim()
    fireEvent.click(screen.getByRole("button", { name: /Primeiro nome/ }))
    irParaOSalvar()
    expect(screen.getByTestId("valor").textContent).toBe(`Ligar para {{primeiro_nome|${RESERVA_PADRAO}}}`)
  })

  it("CA-B47-17: com o reserva escrito e sem Inserir, entra o reserva escrito; Cancelar não insere", () => {
    render(<TextoESalvar inicial="Ligar para " />)
    cursorNoFim()
    fireEvent.click(screen.getByRole("button", { name: /Primeiro nome/ }))
    fireEvent.change(document.getElementById("t-reserva")!, { target: { value: "amigo" } })
    irParaOSalvar()
    expect(screen.getByTestId("valor").textContent).toBe("Ligar para {{primeiro_nome|amigo}}")

    fireEvent.click(screen.getByRole("button", { name: /Primeiro nome/ }))
    const cancelar = screen.getByRole("button", { name: "Cancelar" })
    fireEvent.blur(document.getElementById("t-reserva")!, { relatedTarget: cancelar })
    fireEvent.click(cancelar)
    expect(screen.getByTestId("valor").textContent).toBe("Ligar para {{primeiro_nome|amigo}}")
  })

  it("CA-B47-18: sem nome, com bloco incompleto e sem ação ligada, os problemas saem um por linha, à esquerda", () => {
    const fluxo: Fluxo = {
      blocos: [
        { id: "g", tipo: "gatilho", gatilho: "card_movido", parametros: {}, posicao },
        { id: "a", tipo: "acao", acao: "enviar_mensagem", parametros: { texto: "" }, posicao: { x: 300, y: 0 } },
      ],
      ligacoes: [],
    }
    render(
      <EditorFluxo
        regraInicial={{ nome: "", repeticao: { modo: "sempre" }, fluxo }}
        opcoes={OPCOES}
        buscarContatos={vi.fn(async () => [])}
        salvar={vi.fn(async () => ({}))}
        simular={vi.fn()}
        guardarArquivo={vi.fn()}
        onVoltar={vi.fn()}
        chaveRascunho={`teste:b46-07:${Math.random()}`}
        regraNova
      />
    )
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }))
    const alerta = screen.getByRole("alert")
    const linhas = within(alerta).getAllByRole("listitem").map((li) => li.textContent)
    expect(linhas[0]).toBe("Dê um nome à automação")
    expect(linhas.length).toBeGreaterThanOrEqual(3)
    expect(alerta.closest(".react-flow__panel")?.className).toContain("left")
  })
})
