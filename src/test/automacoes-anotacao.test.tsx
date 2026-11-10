// B59-01 — bloco de anotação: texto solto no desenho, salvo com o fluxo e fora do
// caminho. Sem rede: a sessão e o banco são falsos.

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/integrations/supabase/service", () => ({ createServiceClient: vi.fn() }))
vi.mock("@/lib/sessao", () => ({ sessaoAtual: vi.fn() }))

import { createServiceClient } from "@/integrations/supabase/service"
import { sessaoAtual } from "@/lib/sessao"
import { duplicarRegra, salvarRegra } from "@/app/(auth)/configuracoes/automacoes/actions"
import type { OpcoesEditor } from "@/app/(auth)/configuracoes/automacoes/components/catalogo"
import { EditorFluxo } from "@/app/(auth)/configuracoes/automacoes/components/editor-fluxo"
import { assinaturaDoCaminho, lerRascunho } from "@/app/(auth)/configuracoes/automacoes/components/rascunho-editor"
import { esperasDaRegra } from "@/lib/automacoes/esperas"
import { passosDoCaminho } from "@/lib/automacoes/execucoes"
import { lerFluxo } from "@/lib/automacoes/fluxo-recebido"
import {
  percorrerFluxo,
  pendenciasDoFluxo,
  problemasDeEstrutura,
  type BlocoAcao,
  type BlocoAnotacao,
  type BlocoGatilho,
  type Fluxo,
} from "@/lib/fluxo-automacao"
import { HORARIO_PADRAO } from "@/lib/horario-comercial"

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
 
  mensagensRapidas: [],
  numeros: [],
  horarioComercial: HORARIO_PADRAO,
}

const posicao = { x: 0, y: 0 }
const gatilho: BlocoGatilho = { id: "g", tipo: "gatilho", gatilho: "conversa_criada", parametros: {}, posicao }
const acao = (id: string): BlocoAcao => ({ id, tipo: "acao", acao: "resolver_conversa", parametros: {}, posicao: { x: 0, y: 200 } })
const anotacao = (id: string, texto = "Explica o fluxo", onde = { x: 400, y: 120 }): BlocoAnotacao => ({ id, tipo: "anotacao", texto, posicao: onde })

const COMPLETO: Fluxo = { blocos: [gatilho, acao("a")], ligacoes: [{ de: "g", saida: "proximo", para: "a" }] }
const comAnotacoes = (...anotacoes: BlocoAnotacao[]): Fluxo => ({ ...COMPLETO, blocos: [...COMPLETO.blocos, ...anotacoes] })

function abrirEditor(fluxo: Fluxo, extras: Partial<Parameters<typeof EditorFluxo>[0]> = {}) {
  const salvar = vi.fn(async () => ({}))
  const { unmount } = render(
    <EditorFluxo
      regraInicial={{ nome: "Com anotação", repeticao: { modo: "sempre" }, fluxo }}
      opcoes={OPCOES}
      buscarContatos={vi.fn(async () => [])}
      salvar={salvar}
      simular={vi.fn()}
      guardarArquivo={vi.fn()}
      onVoltar={vi.fn()}
      chaveRascunho="teste:b59-01"
      regraNova={false}
      {...extras}
    />
  )
  return { salvar, unmount }
}

// O React Flow esconde o bloco até medi-lo, e o jsdom não mede: procura pelo atributo
const campos = () => [...document.querySelectorAll<HTMLTextAreaElement>("textarea[aria-label='Texto da anotação']")]
const clicarSalvar = () => act(async () => fireEvent.click(screen.getByRole("button", { name: "Salvar" })))
const noDaAnotacao = () => document.querySelector(".react-flow__node-anotacao") as HTMLElement
const botaoDoBloco = (rotulo: string) => document.querySelector(`.react-flow__node button[aria-label='${rotulo}']`) as HTMLElement
/** Nasce selecionada, com Duplicar e Apagar à vista. */
const adicionarAnotacao = () => {
  fireEvent.click(screen.getByRole("button", { name: "Adicionar bloco" }))
  fireEvent.click(screen.getByRole("button", { name: "Anotação" }))
}

/** Sessão de Admin e banco falsos para o `salvarRegra` real, com as execuções em espera da regra. */
function bancoDoSalvar(esperando: Array<{ id: string; caminho: unknown }>) {
  let gravado: Fluxo | null = null
  const cancelados: string[] = []
  const consulta = (linhas: unknown[]) => {
    const obj: Record<string, unknown> = {}
    let ids: string[] = []
    for (const m of ["select", "eq", "order", "limit", "is"]) obj[m] = vi.fn(() => obj)
    obj.in = vi.fn((_coluna: string, valores: string[]) => {
      ids = valores
      return obj
    })
    obj.update = vi.fn((linha: { fluxo?: Fluxo }) => {
      if (linha.fluxo) gravado = linha.fluxo
      return obj
    })
    obj.maybeSingle = vi.fn(async () => ({ data: { id: "r1" }, error: null }))
    obj.then = (resolver: (v: unknown) => void) => {
      cancelados.push(...ids)
      return Promise.resolve({ data: linhas, count: 0, error: null }).then(resolver)
    }
    return obj
  }
  vi.mocked(sessaoAtual).mockResolvedValue({
    supabase: { from: vi.fn(() => consulta([])) },
    user: { id: "admin-1" },
    perfil: { role: "admin", workspace_id: "ws-1" },
  } as unknown as Awaited<ReturnType<typeof sessaoAtual>>)
  vi.mocked(createServiceClient).mockReturnValue({
    from: vi.fn((tabela: string) => consulta(tabela === "automation_runs" ? esperando : [])),
    storage: { from: () => ({ list: async () => ({ data: [] }), remove: async () => ({}) }) },
  } as unknown as ReturnType<typeof createServiceClient>)
  return { gravado: () => gravado as Fluxo | null, esperasCanceladas: () => cancelados }
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})

describe("B59-01 — criar e escrever", () => {
  it("CA-B59-01: 'Adicionar bloco' cria a anotação selecionada, sem alças e sem '+'", () => {
    abrirEditor(COMPLETO)
    fireEvent.click(screen.getByRole("button", { name: "Adicionar bloco" }))
    fireEvent.click(screen.getByRole("button", { name: "Anotação" }))

    const no = noDaAnotacao()
    expect(no.classList.contains("selected")).toBe(true)
    expect(no.querySelector(".react-flow__handle")).toBeNull()
    expect(no.querySelector("button[aria-label='Adicionar o próximo bloco']")).toBeNull()
    expect(screen.queryByRole("heading", { name: "Mensagem" })).toBeNull()
  })

  it("CA-B59-01: o menu aberto pelo '+' de uma saída não oferece 'Anotação'", () => {
    abrirEditor({ blocos: [gatilho], ligacoes: [] })
    fireEvent.click(botaoDoBloco("Adicionar o próximo bloco"))
    expect(screen.getByRole("button", { name: /Mover card/ })).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Anotação" })).toBeNull()
  })

  it("CA-B59-02: o texto com quebras de linha e a posição movida vão ao Salvar e voltam ao reabrir", async () => {
    const { salvar, unmount } = abrirEditor(COMPLETO)
    adicionarAnotacao()
    const texto = "Primeira linha\nSegunda linha"
    fireEvent.change(campos()[0], { target: { value: texto } })
    const notaSalva = async () => {
      await clicarSalvar()
      const [enviada] = salvar.mock.calls.at(-1) as unknown as [{ fluxo: Fluxo }]
      return enviada.fluxo
    }
    const antes = (await notaSalva()).blocos.find((b) => b.tipo === "anotacao")!

    // Mover pela seta passa pelo mesmo caminho do arrasto: as mudanças de posição do React Flow
    await act(async () => {
      fireEvent.keyDown(noDaAnotacao(), { key: "ArrowRight" })
    })
    const fluxoDepois = await notaSalva()
    const depois = fluxoDepois.blocos.find((b) => b.tipo === "anotacao")!
    expect(depois.posicao.x).toBeGreaterThan(antes.posicao.x)
    expect(depois.posicao.y).toBe(antes.posicao.y)

    const gravada = lerFluxo(JSON.parse(JSON.stringify(fluxoDepois)))!
    expect(gravada.blocos.find((b) => b.id === depois.id)).toEqual({ ...depois, tipo: "anotacao", texto })

    unmount()
    localStorage.clear()
    abrirEditor(gravada)
    expect(campos()[0].value).toBe(texto)
    expect(noDaAnotacao().style.transform).toContain(`translate(${depois.posicao.x}px,${depois.posicao.y}px)`)
  })

  it("CA-B59-03: o campo limita a 2.000 caracteres, e o servidor recusa mais que isso", () => {
    abrirEditor(comAnotacoes(anotacao("n")))
    expect(campos()[0].maxLength).toBe(2000)
    expect(lerFluxo(comAnotacoes(anotacao("n", "x".repeat(2000))))).not.toBeNull()
    expect(lerFluxo(comAnotacoes(anotacao("n", "x".repeat(2001))))).toBeNull()
  })

  it("CA-B59-04: 'Duplicar' copia o texto, 'Apagar' remove a cópia", async () => {
    abrirEditor(COMPLETO)
    adicionarAnotacao()
    fireEvent.change(campos()[0], { target: { value: "Texto para copiar" } })
    const original = noDaAnotacao().dataset.id
    fireEvent.click(botaoDoBloco("Duplicar"))
    await waitFor(() => expect(campos()).toHaveLength(2))
    expect(campos().map((c) => c.value)).toEqual(["Texto para copiar", "Texto para copiar"])

    // Só a cópia, que nasce selecionada, mostra o botão: é ela que sai
    expect(document.querySelectorAll(".react-flow__node button[aria-label='Apagar']")).toHaveLength(1)
    fireEvent.click(botaoDoBloco("Apagar"))
    await waitFor(() => expect(campos()).toHaveLength(1))
    expect(noDaAnotacao().dataset.id).toBe(original)
  })

  it("CA-B59-04: Delete e Backspace no campo não apagam o bloco; fora dele, apagam", async () => {
    abrirEditor(COMPLETO)
    adicionarAnotacao()
    fireEvent.change(campos()[0], { target: { value: "Continua aqui" } })
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    await act(async () => {
      fireEvent.keyDown(campos()[0], { key: "Delete" })
      fireEvent.keyDown(campos()[0], { key: "Backspace" })
    })
    expect(campos()).toHaveLength(1)
    expect(campos()[0].value).toBe("Continua aqui")

    // Controle: a mesma tecla fora do campo apaga o bloco selecionado
    await act(async () => {
      fireEvent.keyDown(document.body, { key: "Delete" })
    })
    await waitFor(() => expect(campos()).toHaveLength(0))
  })
})

describe("B59-01 — regras do fluxo", () => {
  it("CA-B59-05: automação com anotação escrita e vazia salva, sem 'Bloco solto'", async () => {
    const fluxo = comAnotacoes(anotacao("n1"), anotacao("n2", ""))
    expect(pendenciasDoFluxo(fluxo)).toEqual({ porBloco: {}, gerais: [] })
    const { salvar } = abrirEditor(fluxo)
    await clicarSalvar()
    expect(salvar).toHaveBeenCalledTimes(1)
    expect(screen.queryByText(/Bloco solto/)).toBeNull()

    // No servidor: as duas anotações são gravadas, inclusive a vazia
    const banco = bancoDoSalvar([])
    expect(await salvarRegra({ id: "r1", nome: "Com anotação", fluxo, repeticao: { modo: "sempre" } })).toEqual({ id: "r1" })
    expect(banco.gravado()?.blocos.filter((b) => b.tipo === "anotacao")).toEqual([anotacao("n1"), anotacao("n2", "")])

    // A anotação não conta como ação no caminho
    expect(pendenciasDoFluxo({ blocos: [gatilho, anotacao("n1"), anotacao("n2", "")], ligacoes: [] }).gerais).toContain(
      "Ligue pelo menos uma ação ao caminho"
    )
  })

  it("CA-B59-06: gatilho e anotações, sem ação, não salvam", async () => {
    const { salvar } = abrirEditor({ blocos: [gatilho, anotacao("n")], ligacoes: [] })
    await clicarSalvar()
    expect(salvar).not.toHaveBeenCalled()
    expect(screen.getByRole("alert").textContent).toContain("Ligue pelo menos uma ação ao caminho")
  })

  it("CA-B59-07: com e sem anotações, as mesmas ações na mesma ordem, e o histórico sem anotação", async () => {
    const executar = async (fluxo: Fluxo) => {
      const feitas: string[] = []
      const caminho = await percorrerFluxo(fluxo, {
        avaliarVerificacao: async () => true,
        executarAcao: async (bloco) => {
          feitas.push(bloco.id)
          return { ok: true }
        },
      })
      return { feitas, caminho, passos: passosDoCaminho(fluxo, caminho) }
    }
    const ligacoes: Fluxo["ligacoes"] = [
      { de: "g", saida: "proximo", para: "a1" },
      { de: "a1", saida: "proximo", para: "a2" },
    ]
    const sem = await executar({ blocos: [gatilho, acao("a1"), acao("a2")], ligacoes })
    // As anotações ficam entre os blocos que executam, e a ordem não muda
    const com = await executar({ blocos: [anotacao("n1"), gatilho, anotacao("n2"), acao("a1"), anotacao("n3"), acao("a2")], ligacoes })

    expect(com.feitas).toEqual(["a1", "a2"])
    expect(com.feitas).toEqual(sem.feitas)
    expect(com.caminho.blocos).toEqual(sem.caminho.blocos)
    expect(com.passos.map((p) => p.bloco.tipo)).toEqual(["gatilho", "acao", "acao"])
  })

  it("CA-B59-08: o resultado do teste continua valendo depois de editar a anotação", async () => {
    const contato = { id: "c1", nome: "Ana", descricao: "5511" }
    abrirEditor(comAnotacoes(anotacao("n")), {
      buscarContatos: vi.fn(async () => [contato]),
      simular: vi.fn(async () => ({ resultado: { blocos: ["g", "a"], saidas: {} } })),
    })
    fireEvent.click(screen.getByRole("button", { name: /Testar com um contato/ }))
    fireEvent.click(await screen.findByRole("button", { name: /Ana/ }))
    await screen.findByText(/Nada foi executado/)
    expect(noDaAnotacao().innerHTML).not.toContain("opacity-35")
    expect(noDaAnotacao().innerHTML).not.toContain("ring-sucesso")
    // Controle: a ação que está no caminho fica destacada
    expect(document.querySelector(".react-flow__node-acao")!.innerHTML).toContain("ring-sucesso")

    fireEvent.change(campos()[0], { target: { value: "Texto novo" } })
    expect(screen.getByText(/Nada foi executado/)).toBeTruthy()
    expect(screen.queryByText(/o fluxo mudou depois do teste/)).toBeNull()
  })

  it("CA-B59-08: editar ou arrastar a anotação não muda a assinatura do caminho", () => {
    const base = assinaturaDoCaminho(comAnotacoes(anotacao("n")))
    expect(assinaturaDoCaminho(comAnotacoes(anotacao("n", "Outro texto", { x: 9, y: 9 })))).toBe(base)
    expect(assinaturaDoCaminho(COMPLETO)).toBe(base)
  })

  it("CA-B59-09: ligação que sai de uma anotação ou chega nela é recusada", () => {
    const invalidas = ["O fluxo tem ligações inválidas"]
    expect(problemasDeEstrutura({ blocos: [gatilho, anotacao("n")], ligacoes: [{ de: "g", saida: "proximo", para: "n" }] })).toEqual(invalidas)
    expect(problemasDeEstrutura({ blocos: [gatilho, anotacao("n"), acao("a")], ligacoes: [{ de: "n", saida: "proximo", para: "a" }] })).toEqual(invalidas)
  })

  it("CA-B59-10: com 100 blocos que executam e 30 anotações, a tela e o servidor salvam", async () => {
    const acoes = Array.from({ length: 99 }, (_, i) => acao(`a${i}`))
    const ligacoes = acoes.map((a, i) => ({ de: i === 0 ? "g" : `a${i - 1}`, saida: "proximo" as const, para: a.id }))
    const anotacoes = Array.from({ length: 30 }, (_, i) => anotacao(`n${i}`))
    const fluxo: Fluxo = { blocos: [gatilho, ...acoes, ...anotacoes], ligacoes }
    expect(pendenciasDoFluxo(fluxo).gerais).toEqual([])

    const { salvar } = abrirEditor(fluxo)
    await clicarSalvar()
    expect(salvar).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole("alert")).toBeNull()

    const banco = bancoDoSalvar([])
    expect(await salvarRegra({ id: "r1", nome: "Grande", fluxo, repeticao: { modo: "sempre" } })).toEqual({ id: "r1" })
    expect(banco.gravado()?.blocos).toHaveLength(130)
  })

  it("CA-B59-10: mais de 30 anotações dão o aviso e não salvam", async () => {
    const fluxo = comAnotacoes(...Array.from({ length: 31 }, (_, i) => anotacao(`n${i}`)))
    expect(pendenciasDoFluxo(fluxo).gerais).toEqual(["Uma automação pode ter até 30 anotações"])
    const { salvar } = abrirEditor(fluxo)
    await clicarSalvar()
    expect(salvar).not.toHaveBeenCalled()
    expect(screen.getByRole("alert").textContent).toContain("Uma automação pode ter até 30 anotações")
  })
})

describe("B59-01 — salvar, esperas e duplicar", () => {
  it("CA-B59-11: alterar o texto marca 'Alterações não salvas', e 'Recuperar' traz o texto digitado", async () => {
    const { unmount } = abrirEditor(comAnotacoes(anotacao("n")))
    expect(screen.queryByText("Alterações não salvas")).toBeNull()
    fireEvent.change(campos()[0], { target: { value: "Texto do rascunho" } })
    expect(screen.getByText("Alterações não salvas")).toBeTruthy()

    await waitFor(
      () => {
        const nota = lerRascunho("teste:b59-01")?.regra.fluxo.blocos.find((b) => b.id === "n")
        expect(nota).toMatchObject({ tipo: "anotacao", texto: "Texto do rascunho" })
      },
      { timeout: 3000 }
    )

    unmount()
    abrirEditor(comAnotacoes(anotacao("n")))
    expect(campos()[0].value).toBe("Explica o fluxo")
    fireEvent.click(await screen.findByRole("button", { name: "Recuperar" }))
    await waitFor(() => expect(campos()[0].value).toBe("Texto do rascunho"))
  })

  it("CA-B59-12: mudar anotações não tira ninguém da espera", async () => {
    const espera = {
      id: "e",
      tipo: "espera" as const,
      tempo: { quantidade: "1", unidade: "dias" as const },
      recebeuMensagem: false,
      atendenteEnviou: false,
      limite: "30_dias" as const,
      posicao,
    }
    const fluxoAntes: Fluxo = {
      blocos: [gatilho, espera, acao("a"), anotacao("n1")],
      ligacoes: [
        { de: "g", saida: "proximo", para: "e" },
        { de: "e", saida: "tempo", para: "a" },
      ],
    }
    const fluxoDepois: Fluxo = { ...fluxoAntes, blocos: [gatilho, espera, acao("a"), anotacao("n2", "Outra")] }

    const consulta: Record<string, unknown> = {}
    consulta.select = vi.fn(() => consulta)
    consulta.eq = vi.fn(() => consulta)
    consulta.then = (resolver: (v: unknown) => void) =>
      Promise.resolve({ data: [{ id: "run-1", caminho: [{ bloco: espera }] }], error: null }).then(resolver)
    const banco = { from: vi.fn(() => consulta) } as unknown as Parameters<typeof esperasDaRegra>[0]

    expect(await esperasDaRegra(banco, "ws-1", "r1")).toEqual(["run-1"])
    expect(await esperasDaRegra(banco, "ws-1", "r1", fluxoDepois)).toEqual([])

    const contarEsperasQueSaem = vi.fn(async (fluxo: Fluxo) => (await esperasDaRegra(banco, "ws-1", "r1", fluxo)).length)
    const { salvar } = abrirEditor(fluxoDepois, { contarEsperasQueSaem })
    await clicarSalvar()
    expect(contarEsperasQueSaem).toHaveBeenCalled()
    expect(screen.queryByText("Cancelar esperas?")).toBeNull()
    expect(salvar).toHaveBeenCalledTimes(1)

    // No servidor: salvar com as anotações mudadas não cancela a espera
    const noServidor = bancoDoSalvar([{ id: "run-1", caminho: [{ bloco: espera }] }])
    expect(await salvarRegra({ id: "r1", nome: "Espera", fluxo: fluxoDepois, repeticao: { modo: "sempre" } })).toEqual({ id: "r1" })
    expect(noServidor.esperasCanceladas()).toEqual([])

    // Controle: sem o bloco "esperar" no fluxo, a mesma espera é cancelada
    const semEspera: Fluxo = comAnotacoes(anotacao("n2", "Outra"))
    expect(await salvarRegra({ id: "r1", nome: "Espera", fluxo: semEspera, repeticao: { modo: "sempre" } })).toEqual({ id: "r1" })
    expect(noServidor.esperasCanceladas()).toEqual(["run-1"])
  })

  it("CA-B59-13: a cópia da automação traz as anotações, nas mesmas posições", async () => {
    const nota = anotacao("n", "Fica na cópia", { x: 321, y: 123 })
    let inserida: { fluxo: Fluxo } | null = null
    const consulta: Record<string, unknown> = {}
    consulta.select = vi.fn(() => consulta)
    consulta.eq = vi.fn(() => consulta)
    consulta.maybeSingle = vi.fn(async () => ({
      data: { nome: "Com anotação", fluxo: comAnotacoes(nota), repeticao: { modo: "sempre" } },
      error: null,
    }))
    consulta.insert = vi.fn(async (linha: { fluxo: Fluxo }) => {
      inserida = linha
      return { error: null }
    })
    // A contagem do limite de automações termina em `select`, com `count`
    consulta.then = (resolver: (v: unknown) => void) => Promise.resolve({ count: 0, data: [], error: null }).then(resolver)
    vi.mocked(sessaoAtual).mockResolvedValue({
      supabase: { from: vi.fn(() => consulta) },
      user: { id: "admin-1" },
      perfil: { role: "admin", workspace_id: "ws-1" },
    } as unknown as Awaited<ReturnType<typeof sessaoAtual>>)

    expect(await duplicarRegra("r1")).toEqual({})
    expect(inserida!.fluxo.blocos).toContainEqual(nota)
  })
})
