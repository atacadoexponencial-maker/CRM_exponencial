// B59-02 — galeria e os cinco modelos de automação. Sem rede: a sessão e o banco são falsos.

import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const navegar = vi.hoisted(() => vi.fn())
const irPara = vi.hoisted(() =>
  vi.fn((destino: string) => {
    throw new Error(`redirect:${destino}`)
  }),
)
vi.mock("next/navigation", () => ({
  redirect: irPara,
  useRouter: () => ({ push: navegar, replace: vi.fn(), refresh: vi.fn() }),
}))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/integrations/supabase/service", () => ({
  createServiceClient: vi.fn(),
}))
vi.mock("@/lib/sessao", () => ({ sessaoAtual: vi.fn() }))
vi.mock("@/components/shared/fuso-da-empresa", () => ({
  useFuso: () => "America/Sao_Paulo",
}))
vi.mock("@/app/(auth)/configuracoes/automacoes/opcoes-editor", () => ({
  carregarOpcoesEditor: vi.fn(async () => ({})),
}))

import { sessaoAtual } from "@/lib/sessao"
import { createServiceClient } from "@/integrations/supabase/service"
import { buscarRegraParaEditor, salvarRegra, type RegraDoEditor } from "@/app/(auth)/configuracoes/automacoes/actions"
import type { OpcoesEditor } from "@/app/(auth)/configuracoes/automacoes/components/catalogo"
import { ListaRegras } from "@/app/(auth)/configuracoes/automacoes/components/lista-regras"
import { ListaClient } from "@/app/(auth)/configuracoes/automacoes/lista-client"
import { chaveDoRascunho, lerRascunho } from "@/app/(auth)/configuracoes/automacoes/components/rascunho-editor"
import { EditorClient } from "@/app/(auth)/configuracoes/automacoes/[id]/editor-client"
import EditorAutomacaoPage from "@/app/(auth)/configuracoes/automacoes/[id]/page"
import { lerFluxo } from "@/lib/automacoes/fluxo-recebido"
import { MODELOS, modeloPorId } from "@/lib/automacoes/modelos"
import { pendenciasDoFluxo, type Bloco, type Fluxo } from "@/lib/fluxo-automacao"
import { HORARIO_PADRAO } from "@/lib/horario-comercial"
import { variaveisSemReserva } from "@/lib/variaveis-mensagem"

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

const IDS = [
  "publico-para-campanha",
  "mover-lead-que-pediu-preco",
  "tag-por-interesse",
  "follow-up-sem-resposta",
  "boas-vindas-por-horario",
]

/** Sessão falsa, com um banco que guarda o que foi inserido. */
function sessaoCom(role: string) {
  const inseridas: Array<{ fluxo: Fluxo; ativa: boolean; nome: string }> = []
  const consulta = () => {
    const obj: Record<string, unknown> = {}
    for (const m of ["select", "eq", "in", "order", "limit", "is", "update"]) obj[m] = vi.fn(() => obj)
    obj.insert = vi.fn((linha: { fluxo: Fluxo; ativa: boolean; nome: string }) => {
      inseridas.push(linha)
      return obj
    })
    obj.single = vi.fn(async () => ({
      data: { id: `regra-${inseridas.length}` },
      error: null,
    }))
    obj.maybeSingle = vi.fn(async () => ({ data: null, error: null }))
    obj.then = (resolver: (v: unknown) => void) => Promise.resolve({ data: [], count: 0, error: null }).then(resolver)
    return obj
  }
  vi.mocked(sessaoAtual).mockResolvedValue({
    supabase: { from: vi.fn(() => consulta()) },
    user: { id: "u1" },
    perfil: { role, workspace_id: "ws-1" },
  } as unknown as Awaited<ReturnType<typeof sessaoAtual>>)
  vi.mocked(createServiceClient).mockReturnValue({
    from: vi.fn(() => consulta()),
    storage: {
      from: () => ({
        list: async () => ({ data: [] }),
        remove: async () => ({}),
      }),
    },
  } as unknown as ReturnType<typeof createServiceClient>)
  return { inseridas }
}

const regraDoModelo = async (id: string) => {
  const resultado = await buscarRegraParaEditor("nova", id)
  if (!("regra" in resultado)) throw new Error("o modelo deveria abrir")
  return resultado.regra
}

function abrirNoEditor(regra: RegraDoEditor) {
  return render(<EditorClient regra={regra} opcoes={OPCOES} usuarioId="u1" />)
}

const modelo = (id: string) => modeloPorId(id)!
const executam = (fluxo: Fluxo) => fluxo.blocos.filter((b) => b.tipo !== "anotacao")
const textoDasNotas = (fluxo: Fluxo) => fluxo.blocos.flatMap((b) => (b.tipo === "anotacao" ? [b.texto] : [])).join("\n")
const semPosicao = (b: Bloco) => {
  const { posicao: _posicao, ...resto } = b
  void _posicao
  return resto
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  sessaoCom("admin")
})

describe("B59-02 — galeria", () => {
  const lista = (regras: Parameters<typeof ListaRegras>[0]["regras"], onUsarModelo = vi.fn()) => {
    render(
      <ListaRegras
        regras={regras}
        opcoes={OPCOES}
        historicoDisponivel
        onNova={vi.fn()}
        onEditar={vi.fn()}
        onAlternar={vi.fn(async () => ({}))}
        onDuplicar={vi.fn()}
        onVerHistorico={vi.fn()}
        onExcluir={vi.fn(async () => ({}))}
        onUsarModelo={onUsarModelo}
      />,
    )
    return onUsarModelo
  }

  const conferirGaleria = async () => {
    fireEvent.click(screen.getByRole("button", { name: "Modelos" }))
    const galeria = await screen.findByRole("dialog")
    for (const m of MODELOS) {
      expect(within(galeria).getByText(m.titulo)).toBeTruthy()
      expect(within(galeria).getByText(m.descricao)).toBeTruthy()
      expect(
        within(galeria).getByRole("button", {
          name: `Usar modelo: ${m.titulo}`,
        }),
      ).toBeTruthy()
    }
    expect(within(galeria).getAllByText("Usar modelo")).toHaveLength(5)
    return galeria
  }

  it("CA-B59-14: com a lista vazia, 'Modelos' mostra os cinco", async () => {
    expect(MODELOS.map((m) => m.id)).toEqual(IDS)
    lista([])
    await conferirGaleria()
  })

  it("CA-B59-28: com a lista vazia, 'Conferir modelos' fica embaixo de 'Criar a primeira automação', sem os cartões na tela", () => {
    lista([])
    expect(screen.getByText("Você não tem nenhuma automação ainda")).toBeTruthy()
    const criar = screen.getByRole("button", { name: "Criar a primeira automação" })
    const secao = screen.getByRole("region", { name: "Modelos prontos" })
    expect(within(secao).getByText("Comece por um modelo pronto")).toBeTruthy()
    const conferir = within(secao).getByRole("button", { name: "Conferir modelos" })
    // Vem depois do botão principal, e só com contorno: o destaque é de "Criar a primeira automação"
    expect(criar.compareDocumentPosition(conferir) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(criar.className).toContain("bg-primary")
    expect(conferir.className).not.toContain("bg-primary")
    expect(conferir.className).toContain("bg-background")
    // Os cartões não ficam na tela
    expect(screen.queryByText("Usar modelo")).toBeNull()
    expect(screen.queryByText(MODELOS[0].titulo)).toBeNull()
  })

  it("CA-B59-28: 'Conferir modelos' abre a galeria com a prévia dos passos de cada modelo", async () => {
    const onUsar = lista([])
    fireEvent.click(screen.getByRole("button", { name: "Conferir modelos" }))
    const galeria = await screen.findByRole("dialog")
    expect(within(galeria).getAllByRole("listitem")).toHaveLength(5)
    const previa: Record<string, string> = {
      "publico-para-campanha": "Entrou no perfil RFV → Adicionar tag ao contato",
      "mover-lead-que-pediu-preco": "Mensagem recebida do cliente → Condição → Mover card para etapa",
      "tag-por-interesse": "Mensagem recebida do cliente → Condição → Adicionar tag ao contato",
      "follow-up-sem-resposta": "Card movido para etapa → Enviar mensagem → Esperar → Criar lembrete na Agenda / Adicionar tag ao contato",
      "boas-vindas-por-horario": "Conversa criada → Condição → Enviar mensagem / Enviar mensagem",
    }
    for (const m of MODELOS) {
      const cartao = within(galeria).getByText(m.titulo).closest("li")!
      expect(within(cartao).getByText(m.descricao)).toBeTruthy()
      expect(within(cartao).getByText(previa[m.id])).toBeTruthy()
      fireEvent.click(within(cartao).getByRole("button", { name: `Usar modelo: ${m.titulo}` }))
      expect(onUsar).toHaveBeenLastCalledWith(m.id)
    }
  })

  it("CA-B59-28: na tela de verdade, 'Conferir modelos' e 'Usar modelo' abrem o modelo no editor", async () => {
    render(<ListaClient regras={[]} opcoes={OPCOES} />)
    fireEvent.click(screen.getByRole("button", { name: "Conferir modelos" }))
    const galeria = await screen.findByRole("dialog")
    const m = modelo("mover-lead-que-pediu-preco")
    fireEvent.click(within(galeria).getByRole("button", { name: `Usar modelo: ${m.titulo}` }))
    expect(navegar).toHaveBeenCalledWith(`/configuracoes/automacoes/nova?modelo=${m.id}`)

    // O mesmo endereço, na página do editor, monta o modelo
    const pagina = (await EditorAutomacaoPage({
      params: Promise.resolve({ id: "nova" }),
      searchParams: Promise.resolve({ modelo: m.id }),
    })) as { props: { regra: RegraDoEditor } }
    expect(pagina.props.regra).toMatchObject({ id: null, nome: m.titulo, modelo: m.id, fluxo: m.fluxo })
  })

  it("CA-B59-28: com automações na lista, o convite não aparece, e os modelos ficam no botão 'Modelos'", () => {
    lista([{ id: "r1", nome: "Regra", ativa: false, fluxo: null, problema: null, execucoes7dias: 0, ultimaExecucao: null }])
    expect(screen.queryByRole("region", { name: "Modelos prontos" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Conferir modelos" })).toBeNull()
    expect(screen.queryByText("Usar modelo")).toBeNull()
    expect(screen.getByRole("button", { name: "Modelos" })).toBeTruthy()
  })

  it("CA-B59-14: com regras na lista, 'Modelos' mostra os cinco", async () => {
    lista([
      {
        id: "r1",
        nome: "Regra",
        ativa: false,
        fluxo: null,
        problema: null,
        execucoes7dias: 0,
        ultimaExecucao: null,
      },
    ])
    await conferirGaleria()
  })

  it("CA-B59-15: 'Usar modelo' diz qual foi escolhido", async () => {
    const onUsar = vi.fn()
    lista([], onUsar)
    const galeria = await conferirGaleria()
    fireEvent.click(
      within(galeria).getByRole("button", {
        name: `Usar modelo: ${modelo(IDS[3]).titulo}`,
      }),
    )
    expect(onUsar).toHaveBeenCalledWith(IDS[3])
  })

  it("CA-B59-15: o editor abre com tudo do modelo, com 'Salvar e ativar', e nada é gravado", async () => {
    const { inseridas } = sessaoCom("admin")
    const regra = await regraDoModelo(IDS[3])
    const original = modelo(IDS[3])
    expect(regra).toMatchObject({
      id: null,
      nome: original.titulo,
      ativa: false,
      repeticao: original.repeticao,
    })
    expect(regra.fluxo).toEqual(original.fluxo)

    abrirNoEditor(regra)
    expect(
      (
        screen.getByRole("textbox", {
          name: "Nome da automação",
        }) as HTMLInputElement
      ).value,
    ).toBe(original.titulo)
    expect(screen.getByRole("button", { name: "Salvar e ativar" })).toBeTruthy()
    expect(document.querySelectorAll(".react-flow__node")).toHaveLength(original.fluxo.blocos.length)
    expect(document.querySelectorAll(".react-flow__node-anotacao").length).toBeGreaterThan(0)
    expect(inseridas).toEqual([])

    // O jsdom não desenha as setas; o que o editor guarda delas aparece no Salvar
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Salvar" })))
    await waitFor(() => expect(inseridas).toHaveLength(1))
    expect(inseridas[0].fluxo.ligacoes).toEqual(original.fluxo.ligacoes)
    expect(inseridas[0].fluxo.blocos.map((b) => b.id)).toEqual(original.fluxo.blocos.map((b) => b.id))
  })

  it("CA-B59-16: salvar grava desligada com as alterações, e o modelo continua como veio", async () => {
    const { inseridas } = sessaoCom("admin")
    const antes = structuredClone(modelo(IDS[2]))
    const regra = await regraDoModelo(IDS[2])

    const alterado: Fluxo = {
      ...regra.fluxo,
      blocos: regra.fluxo.blocos.map((b) => (b.id === "tag" && b.tipo === "acao" ? { ...b, parametros: { tag: "minha-tag" } } : b)),
    }
    // Mudar a cópia entregue ao editor não pode alcançar o modelo
    regra.fluxo.blocos.pop()
    expect(
      await salvarRegra({
        id: null,
        nome: "Minha",
        fluxo: alterado,
        repeticao: regra.repeticao,
      }),
    ).toMatchObject({ id: expect.any(String) })

    expect(inseridas).toHaveLength(1)
    expect(inseridas[0].ativa).toBe(false)
    expect(inseridas[0].fluxo.blocos.find((b) => b.id === "tag")).toMatchObject({ parametros: { tag: "minha-tag" } })

    expect(modelo(IDS[2])).toEqual(antes)
    expect((await regraDoModelo(IDS[2])).fluxo).toEqual(antes.fluxo)
  })

  it("CA-B59-17: o modelo não usa o rascunho da automação nova, e cada um guarda o seu", async () => {
    const chaveNova = chaveDoRascunho("u1", null)
    const chaveModelo = chaveDoRascunho("u1", `modelo:${IDS[4]}`)
    const nova: RegraDoEditor = {
      id: null,
      nome: "",
      ativa: false,
      repeticao: { modo: "sempre" },
      fluxo: {
        blocos: [
          {
            id: "gatilho",
            tipo: "gatilho",
            gatilho: "card_movido",
            parametros: {},
            posicao: { x: 0, y: 0 },
          },
        ],
        ligacoes: [],
      },
    }
    localStorage.setItem(
      chaveNova,
      JSON.stringify({
        regra: { ...nova, nome: "Rascunho da nova" },
        base: "outra",
        guardadoEm: new Date().toISOString(),
      }),
    )

    const regra = await regraDoModelo(IDS[4])
    const { unmount } = abrirNoEditor(regra)
    expect(screen.queryByRole("button", { name: "Recuperar" })).toBeNull()

    fireEvent.change(screen.getByRole("textbox", { name: "Nome da automação" }), { target: { value: "Editado no modelo" } })
    await waitFor(() => expect(lerRascunho(chaveModelo)?.regra.nome).toBe("Editado no modelo"), { timeout: 3000 })
    expect(lerRascunho(chaveNova)?.regra.nome).toBe("Rascunho da nova")
    unmount()

    const nomeNaTela = () =>
      (
        screen.getByRole("textbox", {
          name: "Nome da automação",
        }) as HTMLInputElement
      ).value
    const segunda = abrirNoEditor(nova)
    fireEvent.click(await screen.findByRole("button", { name: "Recuperar" }))
    await waitFor(() => expect(nomeNaTela()).toBe("Rascunho da nova"))
    segunda.unmount()

    abrirNoEditor(regra)
    fireEvent.click(await screen.findByRole("button", { name: "Recuperar" }))
    await waitFor(() => expect(nomeNaTela()).toBe("Editado no modelo"))
  })

  it("CA-B59-18: Gerente e Atendente saem do editor, e a action também recusa", async () => {
    for (const role of ["gerente", "atendente"]) {
      sessaoCom(role)
      await expect(
        EditorAutomacaoPage({
          params: Promise.resolve({ id: "nova" }),
          searchParams: Promise.resolve({ modelo: IDS[0] }),
        }),
      ).rejects.toThrow("redirect:/perfil?motivo=sem-permissao")
      expect(await buscarRegraParaEditor("nova", IDS[0])).toEqual({
        redirecionar: "/perfil",
      })
    }
  })

  it("CA-B59-19: modelo inexistente volta para a lista", async () => {
    await expect(
      EditorAutomacaoPage({
        params: Promise.resolve({ id: "nova" }),
        searchParams: Promise.resolve({ modelo: "nao-existe" }),
      }),
    ).rejects.toThrow("redirect:/configuracoes/automacoes")
  })
})

describe("B59-02 — o desenho de cada modelo", () => {
  it("CA-B59-20: Preparar público para campanha", () => {
    const { fluxo } = modelo("publico-para-campanha")
    expect(executam(fluxo).map(semPosicao)).toEqual([
      {
        id: "gatilho",
        tipo: "gatilho",
        gatilho: "entrou_perfil_rfv",
        parametros: { destinos: "em_risco", hora: "9" },
      },
      {
        id: "tag",
        tipo: "acao",
        acao: "adicionar_tag",
        parametros: { tag: "campanha-reativacao" },
      },
    ])
    expect(fluxo.ligacoes).toEqual([{ de: "gatilho", saida: "proximo", para: "tag" }])
    const notas = textoDasNotas(fluxo)
    expect(notas).toContain("Quem já estava no perfil antes de ativar não entra sozinho")
    expect(notas).toContain("Campanhas > Nova campanha")
    expect(notas).toContain("escolha Etiqueta e esta tag")
    expect(notas).toContain("Agende a data e a hora")
  })

  it("CA-B59-21: Mover lead que pediu preço", () => {
    const { fluxo } = modelo("mover-lead-que-pediu-preco")
    expect(executam(fluxo).map(semPosicao)).toEqual([
      {
        id: "gatilho",
        tipo: "gatilho",
        gatilho: "mensagem_recebida",
        parametros: {},
      },
      {
        id: "condicao",
        tipo: "condicao",
        verificacoes: [
          {
            id: "palavras",
            tipo: "texto_mensagem",
            operador: "contem_alguma",
            valor: "preço, valor, tabela, comprar, pedido",
          },
          {
            id: "etapa",
            tipo: "card_etapa",
            operador: "esta_em",
            valor: "entrada:lead",
          },
        ],
      },
      {
        id: "mover",
        tipo: "acao",
        acao: "mover_card",
        parametros: { funil: "entrada", etapa: "negociacao" },
      },
    ])
    expect(fluxo.ligacoes).toEqual([
      { de: "gatilho", saida: "proximo", para: "condicao" },
      { de: "condicao", saida: "sim", para: "mover" },
    ])
    const notas = textoDasNotas(fluxo)
    expect(notas).toContain("Troque as palavras na condição e a etapa")
    expect(notas).toContain("só move quem ainda está em Lead")
    expect(notas).toContain("mais à frente no funil")
  })

  it("CA-B59-22: Tag automática por interesse", () => {
    const { fluxo } = modelo("tag-por-interesse")
    expect(executam(fluxo).map(semPosicao)).toEqual([
      {
        id: "gatilho",
        tipo: "gatilho",
        gatilho: "mensagem_recebida",
        parametros: {},
      },
      {
        id: "condicao",
        tipo: "condicao",
        verificacoes: [
          {
            id: "palavras",
            tipo: "texto_mensagem",
            operador: "contem_alguma",
            valor: "revenda, atacado, lojista",
          },
        ],
      },
      {
        id: "tag",
        tipo: "acao",
        acao: "adicionar_tag",
        parametros: { tag: "interesse-atacado" },
      },
    ])
    expect(fluxo.ligacoes).toEqual([
      { de: "gatilho", saida: "proximo", para: "condicao" },
      { de: "condicao", saida: "sim", para: "tag" },
    ])
    const notas = textoDasNotas(fluxo)
    expect(notas).toContain("Troque as palavras na condição e o nome da tag")
    expect(notas).toContain("filtro Etiqueta, em Contatos e em Campanhas")
  })

  it("CA-B59-23: Follow-up sem resposta", () => {
    const { fluxo } = modelo("follow-up-sem-resposta")
    const [gatilho, mensagem, espera, lembrete, tag] = executam(fluxo).map(semPosicao)
    expect(gatilho).toEqual({
      id: "gatilho",
      tipo: "gatilho",
      gatilho: "card_movido",
      parametros: { funil: "entrada", etapa: "catalogo_enviado" },
    })
    expect(mensagem).toMatchObject({
      id: "mensagem",
      tipo: "acao",
      acao: "enviar_mensagem",
    })
    expect(espera).toEqual({
      id: "espera",
      tipo: "espera",
      tempo: { quantidade: "2", unidade: "dias" },
      recebeuMensagem: true,
      atendenteEnviou: false,
      limite: "30_dias",
    })
    expect(lembrete).toMatchObject({
      id: "lembrete",
      tipo: "acao",
      acao: "criar_lembrete",
    })
    // Sem `responsavel_id`, vai para o responsável pela conversa
    expect((lembrete as { parametros: Record<string, string> }).parametros.responsavel_id).toBeUndefined()
    expect(tag).toEqual({
      id: "tag",
      tipo: "acao",
      acao: "adicionar_tag",
      parametros: { tag: "respondeu-follow-up" },
    })
    expect(fluxo.ligacoes).toEqual([
      { de: "gatilho", saida: "proximo", para: "mensagem" },
      { de: "mensagem", saida: "proximo", para: "espera" },
      { de: "espera", saida: "tempo", para: "lembrete" },
      { de: "espera", saida: "recebeu_mensagem", para: "tag" },
    ])
    const notas = textoDasNotas(fluxo)
    expect(notas).toContain("se responder, vai para a tag; se o prazo acabar, vai para o lembrete")
    expect(notas).toContain("Mude o prazo neste bloco")
    expect(notas).toContain("Reescreva com o jeito da sua empresa")
  })

  it("CA-B59-24: Boas-vindas por horário", () => {
    const { fluxo } = modelo("boas-vindas-por-horario")
    const [gatilho, condicao, dentro, fora] = executam(fluxo).map(semPosicao)
    expect(gatilho).toEqual({
      id: "gatilho",
      tipo: "gatilho",
      gatilho: "conversa_criada",
      parametros: {},
    })
    expect(condicao).toEqual({
      id: "condicao",
      tipo: "condicao",
      verificacoes: [
        {
          id: "horario",
          tipo: "horario_comercial",
          operador: "dentro",
          valor: "",
        },
      ],
    })
    expect(dentro).toMatchObject({
      id: "dentro",
      tipo: "acao",
      acao: "enviar_mensagem",
    })
    expect(fora).toMatchObject({
      id: "fora",
      tipo: "acao",
      acao: "enviar_mensagem",
    })
    expect(fluxo.ligacoes).toEqual([
      { de: "gatilho", saida: "proximo", para: "condicao" },
      { de: "condicao", saida: "sim", para: "dentro" },
      { de: "condicao", saida: "nao", para: "fora" },
    ])
    const notas = textoDasNotas(fluxo)
    expect(notas).toContain("clique em Horário comercial")
    expect(notas).toContain("troque os dois textos")
  })
})

describe("B59-02 — os cinco modelos são coerentes", () => {
  type Caixa = {
    id: string
    x: number
    y: number
    largura: number
    altura: number
  }

  const LARGURA = 256
  // Estimativa do desenho: 32 caracteres por linha, 20 px por linha, mais cabeçalho e margens
  const caixa = (b: Bloco): Caixa => {
    if (b.tipo !== "anotacao")
      return {
        id: b.id,
        x: b.posicao.x,
        y: b.posicao.y,
        largura: LARGURA,
        altura: 170,
      }
    const linhas = b.texto.split("\n").reduce((soma, p) => soma + Math.max(1, Math.ceil(p.length / 32)), 0)
    return {
      id: b.id,
      x: b.posicao.x,
      y: b.posicao.y,
      largura: LARGURA,
      altura: 52 + linhas * 20,
    }
  }
  const cobre = (a: Caixa, b: Caixa) => a.x < b.x + b.largura && a.x + a.largura > b.x && a.y < b.y + b.altura && a.y + a.altura > b.y
  const distancia = (a: Caixa, b: Caixa) => {
    const dx = Math.max(0, b.x - (a.x + a.largura), a.x - (b.x + b.largura))
    const dy = Math.max(0, b.y - (a.y + a.altura), a.y - (b.y + b.altura))
    return Math.hypot(dx, dy)
  }

  it("CA-B59-25: os cinco passam pelas regras do Salvar", () => {
    for (const id of IDS) {
      const { fluxo } = modelo(id)
      expect(lerFluxo(JSON.parse(JSON.stringify(fluxo)))).toEqual(fluxo)
      expect(pendenciasDoFluxo(fluxo)).toEqual({ porBloco: {}, gerais: [] })
      for (const b of fluxo.blocos) {
        if (b.tipo === "acao") expect(variaveisSemReserva(b.parametros.texto ?? "")).toEqual([])
      }
    }
  })

  it("CA-B59-25: os cinco são salvos pelo servidor", async () => {
    for (const id of IDS) {
      const { fluxo, repeticao, titulo } = modelo(id)
      const { inseridas } = sessaoCom("admin")
      expect(await salvarRegra({ id: null, nome: titulo, fluxo, repeticao }), id).toMatchObject({ id: expect.any(String) })
      expect(inseridas).toHaveLength(1)
    }
  })

  it("CA-B59-25: os cinco têm anotação em cada bloco, sem nada coberto", () => {
    for (const id of IDS) {
      const { fluxo } = modelo(id)
      const notas = fluxo.blocos.filter((b) => b.tipo === "anotacao")
      expect(notas.every((n) => n.texto.trim() !== "")).toBe(true)

      const caixasDasNotas = notas.map(caixa)
      for (const bloco of executam(fluxo).map(caixa)) {
        expect(Math.min(...caixasDasNotas.map((n) => distancia(n, bloco))), `sem anotação perto de ${bloco.id}`).toBeLessThanOrEqual(120)
      }

      const todas = fluxo.blocos.map(caixa)
      for (const nota of caixasDasNotas) {
        for (const outra of todas) {
          if (outra.id !== nota.id) expect(cobre(nota, outra), `${id}: ${nota.id} cobre ${outra.id}`).toBe(false)
        }
      }
    }
  })
})
