// B28-04 — regra pausada, excluída ou editada com contatos esperando: a tela avisa
// quantos são e só segue depois de confirmar; o servidor cancela as esperas de quem
// não pode mais seguir e mantém quem espera num bloco que continua. A sessão e o
// banco são falsos.

import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/integrations/supabase/service", () => ({ createServiceClient: vi.fn() }))
vi.mock("@/lib/sessao", () => ({ sessaoAtual: vi.fn() }))

import { createServiceClient } from "@/integrations/supabase/service"
import { sessaoAtual } from "@/lib/sessao"
import { HORARIO_PADRAO } from "@/lib/horario-comercial"
import { BLOCO_SAIU, REGRA_DESATIVADA, REGRA_EXCLUIDA, seguirEsperasVencidas } from "@/lib/automacoes/esperas"
import type { PassoGravado } from "@/lib/automacoes/execucoes"
import { esperaNova, type Fluxo } from "@/lib/fluxo-automacao"
import { alternarRegra, excluirRegra, salvarRegra } from "@/app/(auth)/configuracoes/automacoes/actions"
import type { OpcoesEditor } from "@/app/(auth)/configuracoes/automacoes/components/catalogo"
import { EditorFluxo } from "@/app/(auth)/configuracoes/automacoes/components/editor-fluxo"
import { ListaRegras, type RegraListada } from "@/app/(auth)/configuracoes/automacoes/components/lista-regras"

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
const gatilho = { id: "g", tipo: "gatilho" as const, gatilho: "conversa_criada" as const, parametros: {}, posicao }
const etiqueta = (label: string) => ({ id: "a", tipo: "acao" as const, acao: "aplicar_etiqueta" as const, parametros: { label_id: label }, posicao })

/** gatilho → esperar 1 dia → aplicar a etiqueta. */
const comEspera = (label = "etiqueta-antiga"): Fluxo => ({
  blocos: [gatilho, esperaNova("e", posicao), etiqueta(label)],
  ligacoes: [
    { de: "g", saida: "proximo", para: "e" },
    { de: "e", saida: "tempo", para: "a" },
  ],
})
/** O mesmo fluxo, sem o bloco "esperar". */
const semEspera: Fluxo = { blocos: [gatilho, etiqueta("etiqueta-antiga")], ligacoes: [{ de: "g", saida: "proximo", para: "a" }] }

/** Uma execução esperando no bloco `bloco`. */
const esperando = (id: string, bloco = "e") => ({
  id,
  caminho: [{ bloco: gatilho }, { bloco: { ...esperaNova(bloco, posicao) }, desde: new Date(Date.now() - 2 * 86_400_000).toISOString() }],
})

/**
 * Sessão de admin e service client falsos. `esperandoNaRegra`: o que a busca das
 * esperas da regra acha. Devolve os cancelamentos gravados em `automation_runs`.
 */
function montarBanco(esperandoNaRegra: unknown[]) {
  const cancelamentos: Array<{ valores: Record<string, unknown>; filtros: unknown[][] }> = []
  const cliente = (tabelaDaRegra: Record<string, unknown>) => {
    const from = vi.fn((tabela: string) => {
      const filtros: unknown[][] = []
      let atualizando: Record<string, unknown> | null = null
      const obj: Record<string, unknown> = {}
      for (const m of ["select", "eq", "in", "is", "order", "limit", "delete", "insert"]) {
        obj[m] = vi.fn((...args: unknown[]) => {
          filtros.push([m, ...args])
          return obj
        })
      }
      obj.update = vi.fn((valores: Record<string, unknown>) => {
        atualizando = valores
        if (tabela === "automation_runs") cancelamentos.push({ valores, filtros })
        return obj
      })
      obj.maybeSingle = vi.fn(() => Promise.resolve({ data: tabela === "automation_flows" ? tabelaDaRegra : null, error: null }))
      obj.single = obj.maybeSingle
      obj.then = (resolve: (v: unknown) => void) =>
        Promise.resolve({
          data: tabela === "automation_runs" && !atualizando ? esperandoNaRegra : [],
          error: null,
          // A conferência das referências conta o que pediu: as etiquetas existem
          count: (filtros.find((f) => f[0] === "in")?.[2] as unknown[] | undefined)?.length ?? 0,
        }).then(resolve)
      return obj
    })
    return { from, storage: undefined }
  }
  vi.mocked(sessaoAtual).mockResolvedValue({
    supabase: cliente({ id: "regra-1" }),
    user: { id: "admin-1" },
    perfil: { role: "admin", workspace_id: "ws-1" },
  } as unknown as Awaited<ReturnType<typeof sessaoAtual>>)
  vi.mocked(createServiceClient).mockReturnValue(cliente({ id: "regra-1" }) as unknown as ReturnType<typeof createServiceClient>)
  return cancelamentos
}

const regraListada: RegraListada = {
  id: "regra-1",
  nome: "Lembrar depois",
  ativa: true,
  fluxo: comEspera(),
  problema: null,
  execucoes7dias: 2,
  ultimaExecucao: null,
}

function abrirLista(contarEsperas: (id: string) => Promise<number>) {
  const onAlternar = vi.fn(async () => ({}))
  const onExcluir = vi.fn(async () => ({}))
  render(
    <ListaRegras
      regras={[regraListada]}
      opcoes={OPCOES}
      historicoDisponivel
      onNova={vi.fn()}
      onEditar={vi.fn()}
      onAlternar={onAlternar}
      onDuplicar={vi.fn()}
      onVerHistorico={vi.fn()}
      onExcluir={onExcluir}
      contarEsperas={contarEsperas}
    />
  )
  return { onAlternar, onExcluir }
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})

describe("B28-04 — pausar ou excluir com contatos esperando", () => {
  it("CA-B28-18: pausar mostra '2 contatos estão esperando nesta regra' e só pausa depois de confirmar", async () => {
    const { onAlternar } = abrirLista(async () => 2)

    fireEvent.click(screen.getByRole("switch", { name: "Pausar Lembrar depois" }))

    const aviso = await screen.findByRole("dialog")
    expect(aviso.textContent).toContain("2 contatos estão esperando nesta regra")
    expect(onAlternar).not.toHaveBeenCalled()
    await act(async () => fireEvent.click(within(aviso).getByRole("button", { name: "Pausar e cancelar" })))
    expect(onAlternar).toHaveBeenCalledWith("regra-1", false)
  })

  it("CA-B28-18: sem ninguém esperando, pausar não pergunta", async () => {
    const { onAlternar } = abrirLista(async () => 0)
    await act(async () => fireEvent.click(screen.getByRole("switch", { name: "Pausar Lembrar depois" })))
    await waitFor(() => expect(onAlternar).toHaveBeenCalledWith("regra-1", false))
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("CA-B28-18: excluir mostra quantos contatos estão esperando, e as esperas saem ao confirmar", async () => {
    const { onExcluir } = abrirLista(async () => 2)

    fireEvent.click(screen.getByText("Abrir menu de Lembrar depois"))
    fireEvent.click(await screen.findByRole("menuitem", { name: "Excluir" }))

    const dialogo = await screen.findByRole("dialog")
    await waitFor(() => expect(dialogo.textContent).toContain("2 contatos estão esperando nesta regra"))
    expect(onExcluir).not.toHaveBeenCalled()
    await act(async () => fireEvent.click(within(dialogo).getByRole("button", { name: "Excluir" })))
    expect(onExcluir).toHaveBeenCalledWith("regra-1")
  })

  it("CA-B28-18: o servidor cancela as duas esperas, com 'regra desativada' ao pausar e 'regra excluída' ao excluir", async () => {
    const pausar = montarBanco([esperando("run-1"), esperando("run-2")])
    expect(await alternarRegra("regra-1", false)).toEqual({})
    expect(pausar).toHaveLength(1)
    expect(pausar[0].valores).toMatchObject({ resultado: "cancelada", motivo: REGRA_DESATIVADA })
    expect(pausar[0].filtros).toContainEqual(["in", "id", ["run-1", "run-2"]])
    expect(REGRA_DESATIVADA).toContain("regra foi desativada")

    const excluir = montarBanco([esperando("run-1"), esperando("run-2")])
    expect(await excluirRegra("regra-1")).toEqual({})
    expect(excluir[0].valores).toMatchObject({ resultado: "cancelada", motivo: REGRA_EXCLUIDA })
    expect(excluir[0].filtros).toContainEqual(["in", "id", ["run-1", "run-2"]])
    expect(REGRA_EXCLUIDA).toContain("regra foi excluída")
  })
})

describe("B28-04 — editar com contatos esperando", () => {
  it("CA-B28-19: trocar a ação depois do bloco mantém a espera, e o relógio segue pela ação nova", async () => {
    const cancelamentos = montarBanco([esperando("run-1")])
    expect(await salvarRegra({ id: "regra-1", nome: "Lembrar depois", fluxo: comEspera("etiqueta-nova"), repeticao: { modo: "sempre" } })).toEqual({
      id: "regra-1",
    })
    expect(cancelamentos).toHaveLength(0)

    // A espera vence: o motor lê a regra como está agora, com a ação nova
    const etiquetas: string[] = []
    const atualizacoes: Array<Record<string, unknown>> = []
    const from = vi.fn((tabela: string) => {
      const obj: Record<string, unknown> = {}
      for (const m of ["select", "eq", "in", "is", "order", "limit"]) obj[m] = vi.fn(() => obj)
      obj.maybeSingle = vi.fn(() =>
        Promise.resolve({
          data:
            tabela === "automation_flows"
              ? { id: "regra-1", nome: "Lembrar depois", ativa: true, fluxo: comEspera("etiqueta-nova") }
              : tabela === "conversations"
                ? { id: "conv-1" }
                : null,
          error: null,
        })
      )
      obj.update = vi.fn((valores: Record<string, unknown>) => {
        atualizacoes.push(valores)
        return obj
      })
      obj.upsert = vi.fn((linha: { label_id: string }) => {
        etiquetas.push(linha.label_id)
        return Promise.resolve({ error: null })
      })
      obj.then = (resolve: (v: unknown) => void) => Promise.resolve({ data: [], error: null }).then(resolve)
      return obj
    })
    let entregou = false
    const rpc = vi.fn((nome: string) => {
      if (nome !== "reivindicar_esperas_vencidas") return Promise.resolve({ data: false, error: null })
      const data = entregou
        ? []
        : [
            {
              ...esperando("run-1"),
              regra_id: "regra-1",
              contact_id: "contato-1",
              gatilho: { tipo: "conversa_criada", workspaceId: "ws-1", contactId: "contato-1", conversationId: "conv-1" },
            },
          ]
      entregou = true
      return Promise.resolve({ data, error: null })
    })
    vi.mocked(createServiceClient).mockReturnValue({ from, rpc } as unknown as ReturnType<typeof createServiceClient>)

    await seguirEsperasVencidas()

    expect(etiquetas).toEqual(["etiqueta-nova"])
    const final = atualizacoes.find((a) => "caminho" in a)!
    expect(final.resultado).toBe("concluida")
    expect((final.caminho as PassoGravado[]).at(-1)!.bloco).toMatchObject({ parametros: { label_id: "etiqueta-nova" } })
  })

  it("CA-B28-20: apagar o bloco de espera pede confirmação antes de salvar", async () => {
    const salvar = vi.fn(async () => ({}))
    render(
      <EditorFluxo
        regraInicial={{
          nome: "Lembrar depois",
          repeticao: { modo: "uma_vez_por_contato" },
          fluxo: {
            blocos: [gatilho, { id: "a", tipo: "acao", acao: "resolver_conversa", parametros: {}, posicao: { x: 0, y: 150 } }],
            ligacoes: [{ de: "g", saida: "proximo", para: "a" }],
          },
        }}
        opcoes={OPCOES}
        buscarContatos={vi.fn(async () => [])}
        salvar={salvar}
        simular={vi.fn()}
        guardarArquivo={vi.fn()}
        onVoltar={vi.fn()}
        chaveRascunho="teste:b28-04"
        regraNova={false}
        contarEsperasQueSaem={async () => 1}
      />
    )

    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Salvar" })))

    const aviso = await screen.findByRole("dialog")
    expect(aviso.textContent).toContain("1 contato está esperando num bloco que você apagou")
    expect(salvar).not.toHaveBeenCalled()
    await act(async () => fireEvent.click(within(aviso).getByRole("button", { name: "Salvar e cancelar" })))
    expect(salvar).toHaveBeenCalledTimes(1)
  })

  it("CA-B28-20: salvo sem o bloco, a espera fica cancelada com 'o bloco de espera saiu da regra'", async () => {
    const cancelamentos = montarBanco([esperando("run-1")])

    expect(await salvarRegra({ id: "regra-1", nome: "Lembrar depois", fluxo: semEspera, repeticao: { modo: "sempre" } })).toEqual({
      id: "regra-1",
    })

    expect(cancelamentos).toHaveLength(1)
    expect(cancelamentos[0].valores).toMatchObject({ resultado: "cancelada", motivo: BLOCO_SAIU })
    expect(cancelamentos[0].filtros).toContainEqual(["in", "id", ["run-1"]])
    expect(BLOCO_SAIU).toContain("o bloco de espera saiu da regra")
  })
})
