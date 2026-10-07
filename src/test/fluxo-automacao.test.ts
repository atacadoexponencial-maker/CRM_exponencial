// Testes do percurso do fluxo (B11-02): funções puras, sem banco. Quem avalia
// as verificações e quem executa as ações são funções falsas que registram o
// que foi pedido.

import { describe, it, expect, vi } from "vitest"
import {
  lerRepeticao,
  normalizarTag,
  pendenciasDoFluxo,
  percorrerFluxo,
  problemasDeEstrutura,
  type Bloco,
  type BlocoAcao,
  type Fluxo,
  type Ligacao,
  type ResultadoAcao,
  type Verificacao,
} from "@/lib/fluxo-automacao"
import { fluxoDaRegraAntiga } from "@/lib/automacoes/regra-antiga"

const posicao = { x: 0, y: 0 }

const gatilho = (id = "g"): Bloco => ({ id, tipo: "gatilho", gatilho: "card_movido", parametros: { funil: "entrada" }, posicao })

/** Condição com uma verificação de etiqueta; o `valor` diz aos executores falsos se ela vale. */
const condicao = (id: string, ...valores: string[]): Bloco => ({
  id,
  tipo: "condicao",
  verificacoes: valores.map((valor, i) => ({ id: `${id}-v${i}`, tipo: "etiqueta_conversa", operador: "tem", valor })),
  posicao,
})

const acao = (id: string, texto = id): Bloco => ({
  id,
  tipo: "acao",
  acao: "enviar_mensagem",
  parametros: { texto },
  posicao,
})

const liga = (de: string, para: string, saida: Ligacao["saida"] = "proximo"): Ligacao => ({ de, saida, para })

/** Executores falsos: verificação vale quando o valor é "vale"; ação falha quando o texto é "falha" ou "explode". */
function executores() {
  const verificadas: string[] = []
  const executadas: string[] = []
  return {
    verificadas,
    executadas,
    avaliarVerificacao: vi.fn(async (v: Verificacao) => {
      verificadas.push(v.id)
      return v.valor === "vale"
    }),
    executarAcao: vi.fn(async (b: BlocoAcao): Promise<ResultadoAcao> => {
      executadas.push(b.id)
      if (b.parametros.texto === "explode") throw new Error("envio caiu")
      return b.parametros.texto === "falha" ? { ok: false, motivo: "A etiqueta não existe mais" } : { ok: true }
    }),
  }
}

describe("percorrerFluxo", () => {
  // gatilho → condição → sim: a1 / não: a2
  const fluxoSimNao = (valor: string): Fluxo => ({
    blocos: [gatilho(), condicao("c", valor), acao("a1"), acao("a2")],
    ligacoes: [liga("g", "c"), liga("c", "a1", "sim"), liga("c", "a2", "nao")],
  })

  it("condição que vale segue pelo sim", async () => {
    const ex = executores()
    const caminho = await percorrerFluxo(fluxoSimNao("vale"), ex)

    expect(caminho.blocos).toEqual(["g", "c", "a1"])
    expect(caminho.saidas).toEqual({ c: "sim" })
    expect(ex.executadas).toEqual(["a1"])
  })

  it("condição que não vale segue pelo não", async () => {
    const ex = executores()
    const caminho = await percorrerFluxo(fluxoSimNao("nao-vale"), ex)

    expect(caminho.blocos).toEqual(["g", "c", "a2"])
    expect(caminho.saidas).toEqual({ c: "nao" })
    expect(ex.executadas).toEqual(["a2"])
  })

  it("todas as verificações precisam valer (E) e a avaliação para na primeira que não vale", async () => {
    const ex = executores()
    const fluxo: Fluxo = {
      blocos: [gatilho(), condicao("c", "vale", "nao-vale", "vale"), acao("a1"), acao("a2")],
      ligacoes: [liga("g", "c"), liga("c", "a1", "sim"), liga("c", "a2", "nao")],
    }

    const caminho = await percorrerFluxo(fluxo, ex)

    expect(caminho.saidas).toEqual({ c: "nao" })
    expect(ex.verificadas).toEqual(["c-v0", "c-v1"])
  })

  it("ação que falha no meio do caminho não interrompe o resto", async () => {
    const ex = executores()
    const fluxo: Fluxo = {
      blocos: [gatilho(), acao("a1", "falha"), acao("a2", "explode"), acao("a3")],
      ligacoes: [liga("g", "a1"), liga("a1", "a2"), liga("a2", "a3")],
    }

    const caminho = await percorrerFluxo(fluxo, ex)

    expect(ex.executadas).toEqual(["a1", "a2", "a3"])
    expect(caminho.falhas).toEqual(["a1", "a2"])
    expect(caminho.blocos).toEqual(["g", "a1", "a2", "a3"])
    // O motivo de cada falha vai para o histórico (B11-03); exceção vira um motivo genérico
    expect(caminho.motivos).toEqual({ a1: "A etiqueta não existe mais", a2: "Erro inesperado ao executar a ação" })
  })

  it("caminhos que se juntam levam ao mesmo bloco, que roda uma vez", async () => {
    // sim: a1 → fim; não: a2 → fim. "fim" recebe duas ligações.
    const fluxo = (valor: string): Fluxo => ({
      blocos: [gatilho(), condicao("c", valor), acao("a1"), acao("a2"), acao("fim")],
      ligacoes: [liga("g", "c"), liga("c", "a1", "sim"), liga("c", "a2", "nao"), liga("a1", "fim"), liga("a2", "fim")],
    })

    const porSim = executores()
    await percorrerFluxo(fluxo("vale"), porSim)
    expect(porSim.executadas).toEqual(["a1", "fim"])

    const porNao = executores()
    await percorrerFluxo(fluxo("nao-vale"), porNao)
    expect(porNao.executadas).toEqual(["a2", "fim"])
  })

  it("saída sem ligação encerra o caminho", async () => {
    const ex = executores()
    // O "não" da condição não leva a lugar nenhum
    const fluxo: Fluxo = {
      blocos: [gatilho(), condicao("c", "nao-vale"), acao("a1")],
      ligacoes: [liga("g", "c"), liga("c", "a1", "sim")],
    }

    const caminho = await percorrerFluxo(fluxo, ex)

    expect(caminho.blocos).toEqual(["g", "c"])
    expect(ex.executarAcao).not.toHaveBeenCalled()
  })

  it("para ao voltar a um bloco já percorrido, mesmo com laço gravado por fora", async () => {
    const ex = executores()
    const fluxo: Fluxo = {
      blocos: [gatilho(), acao("a1"), acao("a2")],
      ligacoes: [liga("g", "a1"), liga("a1", "a2"), liga("a2", "a1")],
    }

    const caminho = await percorrerFluxo(fluxo, ex)

    expect(caminho.blocos).toEqual(["g", "a1", "a2"])
    expect(ex.executadas).toEqual(["a1", "a2"])
  })

  it("erro ao avaliar uma verificação encerra o caminho ali, com o erro e o que já foi percorrido", async () => {
    const executarAcao = vi.fn(async (): Promise<ResultadoAcao> => ({ ok: true }))
    const caminho = await percorrerFluxo(fluxoSimNao("vale"), {
      avaliarVerificacao: () => Promise.reject(new Error("banco caiu")),
      executarAcao,
    })

    expect(caminho.blocos).toEqual(["g", "c"])
    expect(caminho.erro).toEqual({ bloco: "c", motivo: "Não foi possível avaliar a condição: erro ao consultar o banco" })
    expect(caminho.saidas).toEqual({})
    expect(executarAcao).not.toHaveBeenCalled()
  })
})

describe("problemasDeEstrutura", () => {
  it("fluxo bem montado não tem problema", () => {
    const fluxo: Fluxo = { blocos: [gatilho(), acao("a1")], ligacoes: [liga("g", "a1")] }
    expect(problemasDeEstrutura(fluxo)).toEqual([])
  })

  it("recusa fluxo com laço", () => {
    const fluxo: Fluxo = {
      blocos: [gatilho(), acao("a1"), acao("a2")],
      ligacoes: [liga("g", "a1"), liga("a1", "a2"), liga("a2", "a1")],
    }
    expect(problemasDeEstrutura(fluxo)).toContain("O fluxo tem um laço: um caminho volta a um bloco anterior")
  })

  it("recusa fluxo sem gatilho ou com dois", () => {
    expect(problemasDeEstrutura({ blocos: [acao("a1")], ligacoes: [] })).toContain(
      "O fluxo precisa de exatamente um gatilho"
    )
    expect(problemasDeEstrutura({ blocos: [gatilho("g1"), gatilho("g2")], ligacoes: [] })).toContain(
      "O fluxo precisa de exatamente um gatilho"
    )
  })

  it("recusa ligação de saída que o bloco não tem, e duas ligações na mesma saída", () => {
    const saidaErrada: Fluxo = { blocos: [gatilho(), acao("a1")], ligacoes: [liga("g", "a1", "sim")] }
    const saidaDupla: Fluxo = {
      blocos: [gatilho(), acao("a1"), acao("a2")],
      ligacoes: [liga("g", "a1"), liga("g", "a2")],
    }
    expect(problemasDeEstrutura(saidaErrada)).toContain("O fluxo tem ligações inválidas")
    expect(problemasDeEstrutura(saidaDupla)).toContain("O fluxo tem ligações inválidas")
  })

  it("pendenciasDoFluxo continua trazendo os problemas de estrutura entre os gerais", () => {
    const fluxo: Fluxo = {
      blocos: [gatilho(), acao("a1"), acao("a2")],
      ligacoes: [liga("g", "a1"), liga("a1", "a2"), liga("a2", "a1")],
    }
    expect(pendenciasDoFluxo(fluxo).gerais).toEqual(problemasDeEstrutura(fluxo))
  })
})

describe("pendenciasDoFluxo: só o que o motor executa (B11-10)", () => {
  const EM_BREVE = "Ainda não disponível: escolha outra opção"

  it("fluxo só com blocos disponíveis não tem pendência de 'em breve'", () => {
    const fluxo: Fluxo = {
      blocos: [gatilho(), condicao("c", "label-1"), acao("a1")],
      ligacoes: [liga("g", "c"), liga("c", "a1", "sim")],
    }
    expect(Object.values(pendenciasDoFluxo(fluxo).porBloco).flat()).not.toContain(EM_BREVE)
  })

  it("marca gatilho, verificação e ação que o motor ainda não executa", () => {
    const fluxo: Fluxo = {
      blocos: [
        { id: "g", tipo: "gatilho", gatilho: "mensagem_recebida", parametros: {}, posicao },
        {
          id: "c",
          tipo: "condicao",
          verificacoes: [{ id: "v", tipo: "horario_comercial", operador: "dentro", valor: "" }],
          posicao,
        },
        { id: "a", tipo: "acao", acao: "iniciar_sequencia", parametros: { sequencia_id: "seq-1" }, posicao },
      ],
      ligacoes: [liga("g", "c"), liga("c", "a", "sim")],
    }
    const { porBloco } = pendenciasDoFluxo(fluxo)
    expect(porBloco.g).toContain(EM_BREVE)
    expect(porBloco.c).toContain(EM_BREVE)
    expect(porBloco.a).toContain(EM_BREVE)
  })
})

describe("tag nas ações de tag (B11-11)", () => {
  const PENDENCIA = "A tag não pode ter espaço e vai até 50 caracteres"
  const comTag = (tag: string): Fluxo => ({
    blocos: [gatilho(), { id: "a", tipo: "acao", acao: "adicionar_tag", parametros: { tag }, posicao }],
    ligacoes: [liga("g", "a")],
  })

  it("aceita tag sem espaço, em qualquer caixa", () => {
    expect(pendenciasDoFluxo(comTag("VIP")).porBloco.a ?? []).not.toContain(PENDENCIA)
    expect(normalizarTag("  VIP ")).toBe("vip")
  })

  it("recusa tag com espaço ou com mais de 50 caracteres", () => {
    expect(pendenciasDoFluxo(comTag("cliente vip")).porBloco.a).toContain(PENDENCIA)
    expect(pendenciasDoFluxo(comTag("x".repeat(51))).porBloco.a).toContain(PENDENCIA)
  })
})

describe("fluxoDaRegraAntiga", () => {
  it("regra da primeira versão vira gatilho → ação com os mesmos parâmetros", () => {
    const fluxo = fluxoDaRegraAntiga({
      gatilho_tipo: "card_movido",
      gatilho_config: { funil: "entrada", etapa: "negociacao" },
      acao_tipo: "mover_card",
      acao_config: { funil: "recompra", etapa: "ativo", texto: null },
    })

    expect(fluxo.blocos).toMatchObject([
      { id: "gatilho", tipo: "gatilho", gatilho: "card_movido", parametros: { funil: "entrada", etapa: "negociacao" } },
      { id: "acao", tipo: "acao", acao: "mover_card", parametros: { funil: "recompra", etapa: "ativo" } },
    ])
    expect(fluxo.blocos[1]).not.toHaveProperty("parametros.texto")
    expect(fluxo.ligacoes).toEqual([{ de: "gatilho", saida: "proximo", para: "acao" }])
    expect(problemasDeEstrutura(fluxo)).toEqual([])
  })

  it("config vazia ou fora do formato vira parâmetros vazios", () => {
    const fluxo = fluxoDaRegraAntiga({
      gatilho_tipo: "conversa_criada",
      gatilho_config: null,
      acao_tipo: "aplicar_etiqueta",
      acao_config: ["inesperado"],
    })
    expect(fluxo.blocos.map((b) => ("parametros" in b ? b.parametros : null))).toEqual([{}, {}])
  })
})

describe("lerRepeticao (B11-03)", () => {
  it("aceita os três modos", () => {
    expect(lerRepeticao({ modo: "sempre" })).toEqual({ modo: "sempre" })
    expect(lerRepeticao({ modo: "uma_vez_por_contato" })).toEqual({ modo: "uma_vez_por_contato" })
    expect(lerRepeticao({ modo: "a_cada_horas", horas: 24 })).toEqual({ modo: "a_cada_horas", horas: 24 })
  })

  it("fora do formato vira 'sempre', como as regras rodavam antes da proteção", () => {
    expect(lerRepeticao(null)).toEqual({ modo: "sempre" })
    expect(lerRepeticao({ modo: "duas_vezes" })).toEqual({ modo: "sempre" })
    expect(lerRepeticao({ modo: "a_cada_horas", horas: 0 })).toEqual({ modo: "sempre" })
    expect(lerRepeticao({ modo: "a_cada_horas", horas: 1.5 })).toEqual({ modo: "sempre" })
    expect(lerRepeticao({ modo: "a_cada_horas", horas: 24 * 366 })).toEqual({ modo: "sempre" })
  })
})

describe("tag no gatilho 'tag adicionada' (B11-06)", () => {
  const comTag = (tag: string): Fluxo => ({
    blocos: [
      { id: "g", tipo: "gatilho", gatilho: "tag_adicionada", parametros: { tag }, posicao },
      { id: "a", tipo: "acao", acao: "adicionar_tag", parametros: { tag: "x" }, posicao },
    ],
    ligacoes: [liga("g", "a")],
  })
  const PENDENCIA = "A tag não pode ter espaço e vai até 50 caracteres"

  it("vazia vale como 'qualquer tag'; preenchida segue as regras da tag", () => {
    expect(pendenciasDoFluxo(comTag("")).porBloco.g ?? []).toEqual([])
    expect(pendenciasDoFluxo(comTag("vip")).porBloco.g ?? []).toEqual([])
    expect(pendenciasDoFluxo(comTag("cliente vip")).porBloco.g).toContain(PENDENCIA)
  })
})
