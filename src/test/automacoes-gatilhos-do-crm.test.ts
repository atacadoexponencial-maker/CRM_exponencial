// Testes dos gatilhos que nascem em telas do CRM (B11-06): o que muda de fato
// em tipo, nicho e cidade, os cards depois de um movimento manual, a classificação
// que muda (ou não) e o evento que cada tela manda para o motor.

import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/automacoes/fila", () => ({ dispararAutomacoes: vi.fn().mockResolvedValue(undefined) }))
vi.mock("@/integrations/supabase/service", () => ({ createServiceClient: vi.fn() }))

import { createServiceClient } from "@/integrations/supabase/service"
import {
  camposQueMudaram,
  cardsDepoisDoMovimento,
  dispararDadosAlterados,
  dispararEtiquetaAplicada,
  dispararMensagemEnviadaPeloTime,
  dispararTagAdicionada,
  prepararGatilhoDeClassificacao,
} from "@/lib/automacoes/gatilhos-do-crm"
import { dispararAutomacoes } from "@/lib/automacoes/fila"

const motor = vi.mocked(dispararAutomacoes)

/** Service client falso: toda consulta devolve `resultado`, pelo `await` ou pelo `maybeSingle`. */
function servico(resultado: { data: unknown; error?: unknown }) {
  const obj: Record<string, unknown> = {}
  for (const m of ["from", "select", "eq"]) obj[m] = vi.fn(() => obj)
  obj.maybeSingle = vi.fn(() => Promise.resolve(resultado))
  obj.then = (resolve: (v: unknown) => void) => Promise.resolve(resultado).then(resolve)
  vi.mocked(createServiceClient).mockReturnValue(obj as unknown as ReturnType<typeof createServiceClient>)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("camposQueMudaram", () => {
  it("só os campos que mudaram de fato, com o valor novo sem espaço nas pontas", () => {
    expect(
      camposQueMudaram({ tipo: null, nicho: "Moda", cidade: "Fortaleza" }, { tipo: "lojista", nicho: "Moda ", cidade: "Recife" })
    ).toEqual([
      { campo: "tipo", valor: "lojista" },
      { campo: "cidade", valor: "Recife" },
    ])
  })

  it("dado apagado vira valor vazio; vazio e nulo são a mesma coisa", () => {
    expect(camposQueMudaram({ cidade: "Recife" }, { cidade: null })).toEqual([{ campo: "cidade", valor: "" }])
    expect(camposQueMudaram({ cidade: null }, { cidade: "" })).toEqual([])
  })

  it("campo que não veio no depois não conta como mudança", () => {
    expect(camposQueMudaram({ tipo: "lojista", nicho: "Moda" }, { tipo: "lojista" })).toEqual([])
  })
})

describe("cardsDepoisDoMovimento", () => {
  const entrada = { id: "c1", funil: "entrada", etapa: "negociacao" }

  it("muda a etapa só do card movido", () => {
    expect(cardsDepoisDoMovimento([entrada], "c1", "nutricao")).toEqual([{ ...entrada, etapa: "nutricao" }])
  })

  it("Ganho na Entrada sem card na Recompra: acrescenta o Onboarding, como o CRM cria", () => {
    expect(cardsDepoisDoMovimento([entrada], "c1", "ganho")).toEqual([
      { ...entrada, etapa: "ganho" },
      { funil: "recompra", etapa: "onboarding" },
    ])
  })

  it("Ganho com card na Recompra já existente: não acrescenta outro", () => {
    const recompra = { id: "c2", funil: "recompra", etapa: "ativos" }
    expect(cardsDepoisDoMovimento([entrada, recompra], "c1", "ganho")).toHaveLength(2)
  })
})

describe("prepararGatilhoDeClassificacao", () => {
  it("dispara 'classificação alterada' quando a mudança muda a classificação", async () => {
    servico({ data: [{ id: "c1", funil: "entrada", etapa: "negociacao" }] })
    const disparar = await prepararGatilhoDeClassificacao("ws", "contato", (cards) => cardsDepoisDoMovimento(cards, "c1", "ganho"))
    expect(motor).not.toHaveBeenCalled()

    await disparar()
    expect(motor).toHaveBeenCalledWith({
      tipo: "dado_contato_alterado",
      workspaceId: "ws",
      contactId: "contato",
      campo: "classificacao",
      valor: "ativo",
    })
  })

  it("movimento que não muda a classificação não dispara", async () => {
    servico({ data: [{ id: "c1", funil: "entrada", etapa: "lead" }] })
    const disparar = await prepararGatilhoDeClassificacao("ws", "contato", (cards) => cardsDepoisDoMovimento(cards, "c1", "sondagem"))
    await disparar()
    expect(motor).not.toHaveBeenCalled()
  })

  it("lead novo para quem não tinha card: de 'sem histórico' para 'lead'", async () => {
    servico({ data: [] })
    const disparar = await prepararGatilhoDeClassificacao("ws", "contato", (cards) => [...cards, { funil: "entrada", etapa: "lead" }])
    await disparar()
    expect(motor).toHaveBeenCalledWith(expect.objectContaining({ campo: "classificacao", valor: "lead" }))
  })

  it("erro ao ler os cards ou card sem contato: não dispara nem lança", async () => {
    servico({ data: null, error: { message: "timeout" } })
    await (await prepararGatilhoDeClassificacao("ws", "contato", (c) => c))()
    await (await prepararGatilhoDeClassificacao("ws", null, (c) => c))()
    expect(motor).not.toHaveBeenCalled()
  })
})

describe("eventos que as telas mandam para o motor", () => {
  it("tag adicionada vai normalizada", async () => {
    await dispararTagAdicionada("ws", "contato", "  VIP ")
    expect(motor).toHaveBeenCalledWith({ tipo: "tag_adicionada", workspaceId: "ws", contactId: "contato", tag: "vip" })
  })

  it("etiqueta aplicada leva a empresa e o contato da conversa", async () => {
    servico({ data: { workspace_id: "ws", contact_id: "contato" } })
    await dispararEtiquetaAplicada("conv-1", "label-1")
    expect(motor).toHaveBeenCalledWith({
      tipo: "etiqueta_aplicada",
      workspaceId: "ws",
      contactId: "contato",
      conversationId: "conv-1",
      labelId: "label-1",
    })
  })

  it("dados alterados: um evento por campo que mudou", async () => {
    await dispararDadosAlterados("ws", "contato", { tipo: null, nicho: "Moda", cidade: null }, { tipo: "revendedor", nicho: "Moda", cidade: "Natal" })
    expect(motor.mock.calls.map(([e]) => [e.tipo, "campo" in e ? e.campo : null, "valor" in e ? e.valor : null])).toEqual([
      ["dado_contato_alterado", "tipo", "revendedor"],
      ["dado_contato_alterado", "cidade", "Natal"],
    ])
  })
})

describe("B11-05 — mensagem enviada pelo time", () => {
  it("manda para o motor o evento com a mensagem que saiu pelo chat", async () => {
    const mensagem = {
      workspaceId: "ws-1",
      contactId: "contato-1",
      conversationId: "conversa-1",
      messageId: "msg-1",
      tipoMensagem: "texto",
      texto: "Segue o catálogo",
    }
    await dispararMensagemEnviadaPeloTime(mensagem)
    expect(motor).toHaveBeenCalledWith({ tipo: "mensagem_enviada_time", ...mensagem })
  })
})
