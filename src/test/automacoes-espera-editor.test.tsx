// B28-02 — bloco "esperar" no editor: nasce com o tempo ligado, não fica sem
// opção, e o tempo fora do intervalo não salva, nem no editor nem no servidor.

import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/integrations/supabase/service", () => ({ createServiceClient: vi.fn() }))
vi.mock("@/lib/sessao", () => ({ sessaoAtual: vi.fn() }))

import { HORARIO_PADRAO } from "@/lib/horario-comercial"
import { sessaoAtual } from "@/lib/sessao"
import { ESPERA_SEM_OPCAO, esperaNova, pendenciasDoFluxo, type BlocoEspera, type Fluxo } from "@/lib/fluxo-automacao"
import { salvarRegra } from "@/app/(auth)/configuracoes/automacoes/actions"
import type { OpcoesEditor } from "@/app/(auth)/configuracoes/automacoes/components/catalogo"
import { EditorFluxo } from "@/app/(auth)/configuracoes/automacoes/components/editor-fluxo"
import { PainelBloco } from "@/app/(auth)/configuracoes/automacoes/components/painel-bloco"

// O React Flow mede o canvas com ResizeObserver, que o jsdom não tem
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

/** gatilho → esperar → resolver conversa, com o tempo pedido. */
function fluxoComEspera(tempo: BlocoEspera["tempo"]): Fluxo {
  return {
    blocos: [
      { id: "g", tipo: "gatilho", gatilho: "conversa_criada", parametros: {}, posicao },
      { ...esperaNova("e", { x: 0, y: 150 }), tempo },
      { id: "a", tipo: "acao", acao: "resolver_conversa", parametros: {}, posicao: { x: 0, y: 300 } },
    ],
    ligacoes: [
      { de: "g", saida: "proximo", para: "e" },
      { de: "e", saida: "tempo", para: "a" },
    ],
  }
}

function abrirEditor(fluxo: Fluxo, salvar = vi.fn(async () => ({}))) {
  render(
    <EditorFluxo
      regraInicial={{ nome: "Lembrar depois", repeticao: { modo: "uma_vez_por_contato" }, fluxo }}
      opcoes={OPCOES}
      buscarContatos={vi.fn(async () => [])}
      salvar={salvar}
      simular={vi.fn()}
      guardarArquivo={vi.fn()}
      onVoltar={vi.fn()}
      chaveRascunho={`teste:b28-02:${Math.random()}`}
      regraNova={false}
    />
  )
  return salvar
}

beforeEach(() => {
  localStorage.clear()
})

describe("B28-02 — bloco 'esperar' no editor", () => {
  it("CA-B28-01: escolhido no menu, nasce com o tempo ligado em 1 dia, as outras opções desligadas e uma saída só", () => {
    abrirEditor({
      blocos: [{ id: "g", tipo: "gatilho", gatilho: "conversa_criada", parametros: {}, posicao }],
      ligacoes: [],
    })

    fireEvent.click(screen.getByRole("button", { name: /Adicionar bloco/ }))
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /Esperar/ }))

    // O bloco novo fica selecionado: o painel dele abre
    const painel = screen.getByRole("complementary")
    expect(within(painel).getByRole("checkbox", { name: /Passar um tempo/ })).toBeChecked()
    expect(within(painel).getByRole("checkbox", { name: /O contato mandar mensagem/ })).not.toBeChecked()
    expect(within(painel).getByRole("checkbox", { name: /Alguém do time mandar mensagem/ })).not.toBeChecked()
    expect(within(painel).getByLabelText("Quanto tempo")).toHaveValue("1")

    // No canvas: a frase e uma saída, "Depois de 1 dia"
    expect(screen.getByText("Esperar 1 dia")).toBeTruthy()
    expect(screen.getAllByText("Depois de 1 dia")).toHaveLength(1)
    expect(document.querySelectorAll(".react-flow__node-espera .react-flow__handle-bottom")).toHaveLength(1)
  })

  it("CA-B28-03: com só o tempo ligado, desligar o tempo não deixa e avisa", () => {
    const onMudar = vi.fn()
    render(
      <PainelBloco
        bloco={esperaNova("e", posicao)}
        gatilho="conversa_criada"
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

    fireEvent.click(screen.getByRole("checkbox", { name: /Passar um tempo/ }))

    expect(onMudar).not.toHaveBeenCalled()
    expect(screen.getByRole("checkbox", { name: /Passar um tempo/ })).toBeChecked()
    expect(screen.getByRole("alert").textContent).toContain(ESPERA_SEM_OPCAO)
  })

  it("CA-B28-04: tempo vazio, zero, fracionado ou acima de 365 dias vira pendência no bloco", () => {
    const motivo = "O tempo é um número inteiro, de 1 até 365 dias"
    const invalidos: BlocoEspera["tempo"][] = [
      { quantidade: "", unidade: "dias" },
      { quantidade: "0", unidade: "minutos" },
      { quantidade: "1.5", unidade: "horas" },
      { quantidade: "366", unidade: "dias" },
      { quantidade: "8761", unidade: "horas" },
    ]
    for (const tempo of invalidos) {
      expect(pendenciasDoFluxo(fluxoComEspera(tempo)).porBloco.e).toContain(motivo)
    }
    expect(pendenciasDoFluxo(fluxoComEspera({ quantidade: "365", unidade: "dias" })).porBloco.e).toBeUndefined()
    expect(pendenciasDoFluxo(fluxoComEspera({ quantidade: "30", unidade: "segundos" })).porBloco.e).toBeUndefined()
  })

  it("CA-B28-04: o Salvar recusa o tempo inválido, com o bloco marcado, sem chamar o servidor", async () => {
    const salvar = abrirEditor(fluxoComEspera({ quantidade: "0", unidade: "dias" }))

    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Salvar" })))

    expect(salvar).not.toHaveBeenCalled()
    expect(screen.getByRole("alert").textContent).toContain("Corrija o bloco marcado")
    expect(screen.getByText("O tempo é um número inteiro, de 1 até 365 dias")).toBeTruthy()
  })

  it("CA-B28-02: desligar 'recebeu mensagem' deixa só a saída do tempo e apaga a ligação que saía dela", () => {
    abrirEditor({
      blocos: [
        { id: "g", tipo: "gatilho", gatilho: "conversa_criada", parametros: {}, posicao },
        { ...esperaNova("e", { x: 0, y: 150 }), recebeuMensagem: true },
        { id: "a", tipo: "acao", acao: "resolver_conversa", parametros: {}, posicao: { x: 0, y: 300 } },
        { id: "r", tipo: "acao", acao: "reabrir_conversa", parametros: {}, posicao: { x: 300, y: 300 } },
      ],
      ligacoes: [
        { de: "g", saida: "proximo", para: "e" },
        { de: "e", saida: "tempo", para: "a" },
        { de: "e", saida: "recebeu_mensagem", para: "r" },
      ],
    })
    const noEspera = () => document.querySelector(".react-flow__node-espera") as HTMLElement
    expect(within(noEspera()).getByText("Recebeu mensagem")).toBeTruthy()
    expect(within(noEspera()).getByText("Depois de 1 dia")).toBeTruthy()

    fireEvent.click(within(noEspera()).getByText("Esperar recebeu mensagem ou 1 dia"))
    fireEvent.click(within(screen.getByRole("complementary")).getByRole("checkbox", { name: /O contato mandar mensagem/ }))

    expect(within(noEspera()).queryByText("Recebeu mensagem")).toBeNull()
    expect(within(noEspera()).getByText("Depois de 1 dia")).toBeTruthy()
    expect(noEspera().querySelectorAll(".react-flow__handle-bottom")).toHaveLength(1)
    // Sem a ligação, a ação que saía de "Recebeu mensagem" ficou solta
    const noReabrir = [...document.querySelectorAll(".react-flow__node-acao")].find((n) => n.textContent?.includes("Reabrir"))!
    expect(noReabrir.textContent).toContain("Bloco solto: ligue a um caminho")
  })

  it("CA-B28-05: sem o tempo, o painel oferece 'no máximo 30 dias' (marcado) e 'sem limite'", async () => {
    const onMudar = vi.fn()
    const bloco: BlocoEspera = { ...esperaNova("e", posicao), tempo: null, recebeuMensagem: true }
    render(
      <PainelBloco
        bloco={bloco}
        gatilho="conversa_criada"
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

    const limite = screen.getByRole("combobox", { name: "Sem o tempo, esperar" })
    expect(limite.textContent).toContain("No máximo 30 dias")
    fireEvent.click(limite)
    // O item do Select do Base UI só confirma a escolha destacado, como com o mouse em cima
    const semLimite = await screen.findByRole("option", { name: "Sem limite" })
    fireEvent.mouseMove(semLimite)
    fireEvent.pointerMove(semLimite, { pointerType: "mouse" })
    await waitFor(() => expect(semLimite.hasAttribute("data-highlighted")).toBe(true))
    fireEvent.click(semLimite)
    await waitFor(() => expect(onMudar).toHaveBeenCalledWith(expect.objectContaining({ limite: "sem_limite" })))
    // O bloco nasce com o teto marcado
    expect(esperaNova("x", posicao).limite).toBe("30_dias")
  })

  it("CA-B28-23: no canvas, o teste marca o bloco 'esperar' com a nota", async () => {
    const contato = { id: "c1", nome: "Bruno", descricao: "5511999990000" }
    render(
      <EditorFluxo
        regraInicial={{
          nome: "Lembrar depois",
          repeticao: { modo: "uma_vez_por_contato" },
          fluxo: fluxoComEspera({ quantidade: "2", unidade: "dias" }),
        }}
        opcoes={OPCOES}
        buscarContatos={vi.fn(async () => [contato])}
        salvar={vi.fn()}
        simular={vi.fn(async () => ({ resultado: { blocos: ["g", "e"], saidas: {}, espera: "e" } }))}
        guardarArquivo={vi.fn()}
        onVoltar={vi.fn()}
        chaveRascunho="teste:b28-02:testar"
        regraNova={false}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: /Testar com um contato/ }))
    fireEvent.click(await screen.findByRole("button", { name: /Bruno/ }))

    expect(await screen.findByText("Aqui o contato esperaria")).toBeTruthy()
    expect(screen.getByText(/nenhuma ação seria feita/)).toBeTruthy()
  })

  it("CA-B28-04: o servidor recusa o mesmo fluxo chegando por fora do editor", async () => {
    const insert = vi.fn()
    vi.mocked(sessaoAtual).mockResolvedValue({
      supabase: { from: vi.fn(() => ({ insert })) },
      user: { id: "admin-1" },
      perfil: { role: "admin", workspace_id: "ws-1" },
    } as unknown as Awaited<ReturnType<typeof sessaoAtual>>)

    const resultado = await salvarRegra({
      id: null,
      nome: "Lembrar depois",
      fluxo: fluxoComEspera({ quantidade: "400", unidade: "dias" }),
      repeticao: { modo: "sempre" },
    })

    expect(resultado.erro).toContain("O tempo é um número inteiro, de 1 até 365 dias")
    expect(insert).not.toHaveBeenCalled()
  })
})
