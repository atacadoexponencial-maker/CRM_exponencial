// Testes das ações da B11-11 no motor: tags, remover etiqueta, dado do contato e
// atribuir a um time; e das da B11-08: resolver e reabrir a conversa. "Iniciar
// sequência" saiu na B28-06 e só falha com o motivo. O banco é falso
// (`automacoes-banco-falso.ts`).

import { describe, it, expect, vi } from "vitest"

vi.mock("@/lib/whatsapp-envio", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/whatsapp-envio")>()),
  enviarWhatsAppComMotivo: vi.fn().mockResolvedValue({ ok: true }),
}))

import { executarAcao } from "@/lib/automacoes/acoes"
import type { GatilhoAutomacao } from "@/lib/automacoes/contexto"
import type { AcaoTipo, BlocoAcao } from "@/lib/fluxo-automacao"
import { ACAO_REMOVIDA, percorrerFluxo, problemasDoFluxo, type Fluxo } from "@/lib/fluxo-automacao"
import { banco } from "./automacoes-banco-falso"

const conversaCriada: GatilhoAutomacao = {
  tipo: "conversa_criada",
  workspaceId: "ws-1",
  contactId: "contato-1",
  conversationId: "conv-1",
}

const cardMovido: GatilhoAutomacao = {
  tipo: "card_movido",
  workspaceId: "ws-1",
  contactId: "contato-1",
  cardId: "card-1",
  funil: "entrada",
  etapa: "sondagem",
}

/** B22-02: o atendente escolhido existe na empresa e está ativo. */
const ATENDENTE_ATIVO = { profiles: { um: { status: "active" } } }

const acao = (tipo: AcaoTipo, parametros: Record<string, string>): BlocoAcao => ({
  id: "a",
  tipo: "acao",
  acao: tipo,
  parametros,
  posicao: { x: 0, y: 0 },
})

describe("adicionar e remover tag", () => {
  it("adiciona a tag normalizada no contato da empresa", async () => {
    const b = banco({})
    const ok = await executarAcao(b.contexto(conversaCriada), acao("adicionar_tag", { tag: "  VIP " }))

    expect(ok).toEqual({ ok: true })
    expect(b.gravacoes("contact_tags")[0].args[0]).toEqual({ contact_id: "contato-1", workspace_id: "ws-1", tag: "vip" })
  })

  it("tag que o contato já tem conta como feita", async () => {
    const b = banco({ contact_tags: { erro: { code: "23505" } } })
    expect(await executarAcao(b.contexto(conversaCriada), acao("adicionar_tag", { tag: "vip" }))).toEqual({ ok: true })
  })

  it("tag com espaço não é gravada", async () => {
    const b = banco({})
    expect(await executarAcao(b.contexto(conversaCriada), acao("adicionar_tag", { tag: "cliente vip" }))).toEqual({
      ok: false,
      motivo: "A tag não é válida",
    })
    expect(b.gravacoes("contact_tags")).toEqual([])
  })

  it("remove a tag do contato, só na empresa dele", async () => {
    const b = banco({})
    const ok = await executarAcao(b.contexto(conversaCriada), acao("remover_tag", { tag: "VIP" }))

    expect(ok).toEqual({ ok: true })
    expect(b.gravacoes("contact_tags")[0].metodo).toBe("delete")
    expect(b.filtros("contact_tags")).toEqual([
      ["contact_id", "contato-1"],
      ["workspace_id", "ws-1"],
      ["tag", "vip"],
    ])
  })
})

describe("remover etiqueta", () => {
  it("tira a etiqueta da conversa do evento", async () => {
    const b = banco({})
    const ok = await executarAcao(b.contexto(conversaCriada), acao("remover_etiqueta", { label_id: "label-1" }))

    expect(ok).toEqual({ ok: true })
    expect(b.gravacoes("conversation_labels")[0].metodo).toBe("delete")
    expect(b.filtros("conversation_labels")).toEqual([
      ["conversation_id", "conv-1"],
      ["label_id", "label-1"],
    ])
  })

  it("sem conversa aberta, falha", async () => {
    const b = banco({ conversations: { um: null } })
    expect(await executarAcao(b.contexto(cardMovido), acao("remover_etiqueta", { label_id: "label-1" }))).toEqual({
      ok: false,
      motivo: "O contato não tem conversa aberta",
    })
  })
})

describe("alterar dado do contato", () => {
  it("troca o tipo", async () => {
    const b = banco({})
    const ok = await executarAcao(b.contexto(conversaCriada), acao("alterar_dado_contato", { campo: "tipo", valor: "lojista" }))

    expect(ok).toEqual({ ok: true })
    expect(b.gravacoes("contacts")[0].args[0]).toEqual({ tipo: "lojista" })
    expect(b.filtros("contacts")).toEqual([
      ["id", "contato-1"],
      ["workspace_id", "ws-1"],
    ])
  })

  it("acrescenta uma linha às observações", async () => {
    const b = banco({ contacts: { um: { observacoes: "Cliente desde 2024\n" } } })
    await executarAcao(b.contexto(conversaCriada), acao("alterar_dado_contato", { campo: "observacoes", valor: "Entrou em sondagem" }))

    expect(b.gravacoes("contacts")[0].args[0]).toEqual({ observacoes: "Cliente desde 2024\nEntrou em sondagem" })
  })

  it("observações vazias recebem a linha como texto inteiro", async () => {
    const b = banco({ contacts: { um: { observacoes: null } } })
    await executarAcao(b.contexto(conversaCriada), acao("alterar_dado_contato", { campo: "observacoes", valor: "Primeira nota" }))

    expect(b.gravacoes("contacts")[0].args[0]).toEqual({ observacoes: "Primeira nota" })
  })

  it("classificação e tipo inventado não são gravados", async () => {
    const b = banco({})
    const contexto = b.contexto(conversaCriada)

    expect((await executarAcao(contexto, acao("alterar_dado_contato", { campo: "classificacao", valor: "ativo" }))).ok).toBe(false)
    expect((await executarAcao(contexto, acao("alterar_dado_contato", { campo: "tipo", valor: "atacadista" }))).ok).toBe(false)
    expect(b.gravacoes("contacts")).toEqual([])
  })
})

describe("atribuir a um time (B22-04: escolha e conversa gravadas pela função do banco)", () => {
  const rpcDoTime = (b: ReturnType<typeof banco>) =>
    b.chamadas.filter((c) => c.tabela === "rpc:atribuir_conversa_ao_time").map((c) => c.args[0])
  const escolheu = (atendente_id: string, manteve = false) => ({ atribuir_conversa_ao_time: { data: [{ atendente_id, manteve }] } })

  it("pede a escolha com a empresa, o time e a conversa do evento, e passa o card para o escolhido", async () => {
    const b = banco({ pipeline_cards: { lista: [{ id: "card-entrada", funil: "entrada" }] } }, escolheu("carla"))
    expect(await executarAcao(b.contexto(conversaCriada), acao("atribuir_time", { time_id: "time-1" }))).toEqual({ ok: true })

    expect(rpcDoTime(b)).toEqual([{ p_workspace_id: "ws-1", p_team_id: "time-1", p_conversation_id: "conv-1" }])
    // A conversa é gravada pela função, travada por time; o motor só passa o
    // responsável de todas as conversas do contato ao novo dono (B45-02)
    expect(b.gravacoes("conversations").map((g) => g.args[0])).toEqual([{ assigned_to: "carla" }])
    expect(b.gravacoes("pipeline_cards")[0].args[0]).toEqual({ atendente_id: "carla" })
  })

  it("conversa já com um membro ativo do time: fica com ele, e o card vai junto (B53-02)", async () => {
    const b = banco({ pipeline_cards: { lista: [{ id: "card-entrada", funil: "entrada" }] } }, escolheu("ana", true))
    expect(await executarAcao(b.contexto(conversaCriada), acao("atribuir_time", { time_id: "time-1" }))).toEqual({ ok: true })
    expect(b.gravacoes("pipeline_cards")[0].args[0]).toEqual({ atendente_id: "ana" })
  })

  it("contato sem conversa aberta: pede a escolha sem conversa e passa só o card", async () => {
    const tag: GatilhoAutomacao = { tipo: "tag_adicionada", workspaceId: "ws-1", contactId: "contato-1", tag: "vip" }
    const b = banco(
      { conversations: { um: null }, pipeline_cards: { lista: [{ id: "card-entrada", funil: "entrada" }] } },
      escolheu("ana")
    )
    expect(await executarAcao(b.contexto(tag), acao("atribuir_time", { time_id: "time-1" }))).toEqual({ ok: true })
    expect(rpcDoTime(b)[0]).toMatchObject({ p_conversation_id: null })
    expect(b.gravacoes("pipeline_cards")[0].args[0]).toEqual({ atendente_id: "ana" })
  })

  it("time sem membro ativo falha e não grava nada", async () => {
    const b = banco({ teams: { um: { id: "time-1" } } }, { atribuir_conversa_ao_time: { data: [] } })
    expect(await executarAcao(b.contexto(conversaCriada), acao("atribuir_time", { time_id: "time-1" }))).toEqual({
      ok: false,
      motivo: "O time não tem atendente ativo",
    })
    expect(b.gravacoes("pipeline_cards")).toEqual([])
  })

  it("B22-27: time apagado falha com o motivo certo, e não 'sem atendente ativo'", async () => {
    const b = banco({ teams: { um: null } }, { atribuir_conversa_ao_time: { data: [] } })
    expect(await executarAcao(b.contexto(conversaCriada), acao("atribuir_time", { time_id: "time-1" }))).toEqual({
      ok: false,
      motivo: "O time não existe mais",
    })
  })

  it("erro na função: falha como erro de banco e não grava nada", async () => {
    const b = banco({}, { atribuir_conversa_ao_time: { erro: { message: "timeout" } } })
    expect(await executarAcao(b.contexto(conversaCriada), acao("atribuir_time", { time_id: "time-1" }))).toEqual({
      ok: false,
      motivo: "Erro ao gravar no banco",
    })
    expect(b.gravacoes("pipeline_cards")).toEqual([])
  })
})

describe("mover card segue a regra do CRM (B11-11)", () => {
  it("contato sem card na Recompra: não move nem cria nada", async () => {
    const b = banco({ pipeline_cards: { umEmOrdem: [null] } })
    const ok = await executarAcao(b.contexto(cardMovido), acao("mover_card", { funil: "recompra", etapa: "onboarding" }))

    expect(ok).toEqual({ ok: false, motivo: "O contato não tem card no Funil de Recompra" })
    expect(b.gravacoes("pipeline_cards")).toEqual([])
  })

  it("Ganho no Funil de Entrada cria o card na Recompra, em Onboarding", async () => {
    // 1ª consulta: o card na Entrada; 2ª: card na Recompra, que não existe
    const b = banco({ pipeline_cards: { umEmOrdem: [{ id: "card-1", etapa: "negociacao" }, null] } })
    const ok = await executarAcao(b.contexto(cardMovido), acao("mover_card", { funil: "entrada", etapa: "ganho" }))

    expect(ok).toEqual({ ok: true })
    const gravacoes = b.gravacoes("pipeline_cards").map((g) => [g.metodo, g.args[0]])
    expect(gravacoes).toEqual([
      ["update", expect.objectContaining({ etapa: "ganho" })],
      ["insert", { funil: "recompra", etapa: "onboarding", contact_id: "contato-1", workspace_id: "ws-1", atendente_id: null }],
    ])
    expect(b.gravacoes("pipeline_card_history")[0].args[0]).toMatchObject({ de_etapa: "negociacao", para_etapa: "ganho" })
  })

  it("Ganho com card na Recompra já existente não cria outro", async () => {
    const b = banco({ pipeline_cards: { umEmOrdem: [{ id: "card-1", etapa: "negociacao" }, { id: "card-r" }] } })
    await executarAcao(b.contexto(cardMovido), acao("mover_card", { funil: "entrada", etapa: "ganho" }))

    expect(b.gravacoes("pipeline_cards").map((g) => g.metodo)).toEqual(["update"])
  })

  it("outras etapas só movem o card", async () => {
    const b = banco({ pipeline_cards: { umEmOrdem: [{ id: "card-1", etapa: "lead" }] } })
    await executarAcao(b.contexto(cardMovido), acao("mover_card", { funil: "entrada", etapa: "negociacao" }))

    expect(b.gravacoes("pipeline_cards").map((g) => g.metodo)).toEqual(["update"])
  })
})

describe("mover card cria o card na Entrada quando o contato não tem (decisões 7.5, 15/10)", () => {
  it("contato sem card na Entrada ganha o card na etapa escolhida, sem histórico de movimento", async () => {
    const b = banco({ pipeline_cards: { umEmOrdem: [null] } })
    const ok = await executarAcao(b.contexto(conversaCriada), acao("mover_card", { funil: "entrada", etapa: "sondagem" }))

    expect(ok).toEqual({ ok: true })
    expect(b.gravacoes("pipeline_cards").map((g) => [g.metodo, g.args[0]])).toEqual([
      ["insert", { funil: "entrada", etapa: "sondagem", contact_id: "contato-1", workspace_id: "ws-1" }],
    ])
    expect(b.gravacoes("pipeline_card_history")).toEqual([])
  })

  it("criado direto em Ganho também abre o card da Recompra", async () => {
    const b = banco({ pipeline_cards: { umEmOrdem: [null, null] } })
    await executarAcao(
      b.contexto(conversaCriada),
      acao("mover_card", { funil: "entrada", etapa: "ganho", iniciar_sequencia: "sim" })
    )

    expect(b.gravacoes("pipeline_cards").map((g) => [g.metodo, g.args[0]])).toEqual([
      ["insert", { funil: "entrada", etapa: "ganho", contact_id: "contato-1", workspace_id: "ws-1" }],
      ["insert", { funil: "recompra", etapa: "onboarding", contact_id: "contato-1", workspace_id: "ws-1", atendente_id: null }],
    ])
    expect(b.gravacoes("sequence_runs")).toEqual([])
  })

  it("card que nasceu ao mesmo tempo por outro caminho (23505) é movido", async () => {
    // 1ª busca: sem card; o insert esbarra no índice único; 2ª busca: o card que nasceu
    const b = banco({ pipeline_cards: { umEmOrdem: [null, { id: "card-1", etapa: "lead" }] } })
    const contexto = b.contexto(conversaCriada)
    const from = contexto.supabase.from.bind(contexto.supabase)
    contexto.supabase.from = ((tabela: string) => {
      const consulta = from(tabela as "pipeline_cards") as unknown as Record<string, unknown>
      if (tabela === "pipeline_cards") {
        const insert = consulta.insert as (...args: unknown[]) => unknown
        consulta.insert = (...args: unknown[]) => {
          insert(...args)
          return Promise.resolve({ data: null, error: { code: "23505" } })
        }
      }
      return consulta
    }) as unknown as typeof contexto.supabase.from

    const ok = await executarAcao(contexto, acao("mover_card", { funil: "entrada", etapa: "sondagem" }))

    expect(ok).toEqual({ ok: true })
    expect(b.gravacoes("pipeline_cards").map((g) => g.metodo)).toEqual(["insert", "update"])
    expect(b.gravacoes("pipeline_card_history")[0].args[0]).toMatchObject({ de_etapa: "lead", para_etapa: "sondagem" })
  })

  it("outro erro ao criar vai para o histórico como erro no banco", async () => {
    const b = banco({ pipeline_cards: { umEmOrdem: [null] } })
    const contexto = b.contexto(conversaCriada)
    const from = contexto.supabase.from.bind(contexto.supabase)
    contexto.supabase.from = ((tabela: string) => {
      const consulta = from(tabela as "pipeline_cards") as unknown as Record<string, unknown>
      if (tabela === "pipeline_cards") consulta.insert = () => Promise.resolve({ data: null, error: { code: "XX000" } })
      return consulta
    }) as unknown as typeof contexto.supabase.from

    expect(await executarAcao(contexto, acao("mover_card", { funil: "entrada", etapa: "sondagem" }))).toEqual({
      ok: false,
      motivo: "Erro ao gravar no banco",
    })
  })
})

describe("mover card numa regra antiga com 'iniciar a sequência da etapa' (B28-06)", () => {
  it("a opção é ignorada: o card move e nenhuma sequência começa", async () => {
    const b = banco({ pipeline_cards: { umEmOrdem: [{ id: "card-1", etapa: "sondagem", atendente_id: "carla" }] } })
    const ok = await executarAcao(
      b.contexto(cardMovido),
      acao("mover_card", { funil: "entrada", etapa: "catalogo_enviado", iniciar_sequencia: "sim" })
    )
    expect(ok).toEqual({ ok: true })
    expect(b.gravacoes("pipeline_cards").map((g) => g.metodo)).toEqual(["update"])
    expect(b.gravacoes("sequence_runs")).toEqual([])
  })
})

describe("motivos de falha que vão para o histórico (B11-03)", () => {
  it("etiqueta apagada", async () => {
    const b = banco({ conversation_labels: { erro: { code: "23503" } } })
    expect(await executarAcao(b.contexto(conversaCriada), acao("aplicar_etiqueta", { label_id: "apagada" }))).toEqual({
      ok: false,
      motivo: "A etiqueta não existe mais",
    })
  })

  it("atendente apagado entre a conferência e a gravação", async () => {
    const b = banco({ ...ATENDENTE_ATIVO, conversations: { erro: { code: "23503" } } })
    expect(await executarAcao(b.contexto(conversaCriada), acao("atribuir_atendente", { atendente_id: "x" }))).toEqual({
      ok: false,
      motivo: "O atendente não existe mais",
    })
  })

  it("evento sem contato e ação que o motor não conhece (fluxo gravado por fora do editor)", async () => {
    const b = banco({})
    expect(await executarAcao(b.contexto({ ...cardMovido, contactId: null }), acao("adicionar_tag", { tag: "vip" }))).toEqual({
      ok: false,
      motivo: "O evento não tem contato",
    })
    expect(await executarAcao(b.contexto(conversaCriada), acao("acao_inexistente" as AcaoTipo, {}))).toEqual({
      ok: false,
      motivo: "Esta ação ainda não está disponível",
    })
  })
})

describe("iniciar sequência removida (B28-06)", () => {
  it("CA-B28-34: a ação falha com o motivo, as outras ações do caminho rodam, e a regra não para por ela", async () => {
    const posicao = { x: 0, y: 0 }
    const fluxo: Fluxo = {
      blocos: [
        { id: "g", tipo: "gatilho", gatilho: "conversa_criada", parametros: {}, posicao },
        { id: "seq", tipo: "acao", acao: "iniciar_sequencia", parametros: { sequencia_id: "seq-1" }, posicao },
        { id: "etiqueta", tipo: "acao", acao: "aplicar_etiqueta", parametros: { label_id: "label-1" }, posicao },
      ],
      ligacoes: [
        { de: "g", saida: "proximo", para: "seq" },
        { de: "seq", saida: "proximo", para: "etiqueta" },
      ],
    }
    // O motor só não roda regra com problema no fluxo: a ação removida não é um
    expect(problemasDoFluxo(fluxo)).toEqual([])

    const b = banco({})
    const contexto = b.contexto(conversaCriada)
    const caminho = await percorrerFluxo(fluxo, {
      avaliarVerificacao: async () => true,
      executarAcao: (bloco) => executarAcao(contexto, bloco),
    })

    expect(caminho.falhas).toEqual(["seq"])
    expect(caminho.motivos.seq).toBe("A ação 'iniciar sequência' foi removida: troque no editor")
    expect(ACAO_REMOVIDA).toBe(caminho.motivos.seq)
    expect(b.gravacoes("conversation_labels").map((g) => g.args[0])).toEqual([{ conversation_id: "conv-1", label_id: "label-1" }])
    expect(b.gravacoes("sequence_runs")).toEqual([])
  })
})

describe("resolver e reabrir a conversa (B11-08)", () => {
  it("resolve a conversa do evento", async () => {
    const b = banco({})
    expect(await executarAcao(b.contexto(conversaCriada), acao("resolver_conversa", {}))).toEqual({ ok: true })
    expect(b.gravacoes("conversations")[0].args[0]).toEqual({ status: "resolvida" })
    expect(b.filtros("conversations")).toContainEqual(["id", "conv-1"])
  })

  it("sem conversa aberta, não há o que resolver: conta como feita", async () => {
    const b = banco({ conversations: { um: null } })
    expect(await executarAcao(b.contexto(cardMovido), acao("resolver_conversa", {}))).toEqual({ ok: true })
    expect(b.gravacoes("conversations")).toEqual([])
  })

  it("reabre a conversa resolvida: com atendente, em atendimento; sem, em espera", async () => {
    const comAtendente = banco({ conversations: { um: { id: "conv-1", status: "resolvida", assigned_to: "u-1" } } })
    const semAtendente = banco({ conversations: { um: { id: "conv-1", status: "resolvida", assigned_to: null } } })
    await executarAcao(comAtendente.contexto(conversaCriada), acao("reabrir_conversa", {}))
    await executarAcao(semAtendente.contexto(conversaCriada), acao("reabrir_conversa", {}))
    expect(comAtendente.gravacoes("conversations")[0].args[0]).toEqual({ status: "em_atendimento" })
    expect(semAtendente.gravacoes("conversations")[0].args[0]).toEqual({ status: "em_espera" })
  })

  it("fora dos gatilhos de conversa, reabre a mais recente do contato, mesmo resolvida", async () => {
    const b = banco({ conversations: { um: { id: "conv-9", status: "resolvida", assigned_to: null } } })
    expect(await executarAcao(b.contexto(cardMovido), acao("reabrir_conversa", {}))).toEqual({ ok: true })
    expect(b.filtros("conversations")).toEqual([
      ["workspace_id", "ws-1"],
      ["contact_id", "contato-1"],
      ["id", "conv-9"],
    ])
  })

  it("conversa já aberta conta como feita; contato sem conversa, falha", async () => {
    const aberta = banco({ conversations: { um: { id: "conv-1", status: "em_atendimento", assigned_to: "u-1" } } })
    const nenhuma = banco({ conversations: { um: null } })
    expect(await executarAcao(aberta.contexto(conversaCriada), acao("reabrir_conversa", {}))).toEqual({ ok: true })
    expect(aberta.gravacoes("conversations")).toEqual([])
    expect(await executarAcao(nenhuma.contexto(cardMovido), acao("reabrir_conversa", {}))).toEqual({
      ok: false,
      motivo: "O contato não tem conversa",
    })
  })
})

describe("B11-04 — na mensagem recebida, a regra age na conversa onde a mensagem chegou", () => {
  const mensagemRecebida: GatilhoAutomacao = {
    tipo: "mensagem_recebida",
    workspaceId: "ws-1",
    contactId: "contato-1",
    conversationId: "conv-da-mensagem",
    messageId: "msg-1",
    tipoMensagem: "texto",
    texto: "Quero o catálogo",
  }

  it("aplica a etiqueta na conversa do evento, sem procurar a aberta do contato", async () => {
    const b = banco({})
    expect(await executarAcao(b.contexto(mensagemRecebida), acao("aplicar_etiqueta", { label_id: "l-1" }))).toEqual({ ok: true })
    expect(b.gravacoes("conversation_labels")[0].args[0]).toEqual({ conversation_id: "conv-da-mensagem", label_id: "l-1" })
    expect(b.filtros("conversations")).toEqual([])
  })

  it("reabre a conversa do evento", async () => {
    const b = banco({ conversations: { um: { id: "conv-da-mensagem", status: "resolvida", assigned_to: null } } })
    expect(await executarAcao(b.contexto(mensagemRecebida), acao("reabrir_conversa", {}))).toEqual({ ok: true })
    expect(b.filtros("conversations")).toEqual([
      ["id", "conv-da-mensagem"],
      ["id", "conv-da-mensagem"],
    ])
  })
})

describe("atribuir passa também o card principal do contato (B11-08)", () => {
  const tagAdicionada: GatilhoAutomacao = { tipo: "tag_adicionada", workspaceId: "ws-1", contactId: "contato-1", tag: "vip" }
  const cardAtualizado = (b: ReturnType<typeof banco>) =>
    b.chamadas.filter((c) => c.tabela === "pipeline_cards" && c.metodo === "eq" && c.args[0] === "id").map((c) => c.args[1])

  it("fora do gatilho de card movido, o card da Recompra é o principal", async () => {
    const b = banco({ ...ATENDENTE_ATIVO, 
      pipeline_cards: { lista: [{ id: "card-entrada", funil: "entrada" }, { id: "card-recompra", funil: "recompra" }] },
    })
    expect(await executarAcao(b.contexto(conversaCriada), acao("atribuir_atendente", { atendente_id: "u-1" }))).toEqual({
      ok: true,
    })
    expect(b.gravacoes("conversations")[0].args[0]).toEqual({ assigned_to: "u-1" })
    expect(b.gravacoes("pipeline_cards")[0].args[0]).toEqual({ atendente_id: "u-1" })
    expect(cardAtualizado(b)).toEqual(["card-recompra"])
    expect(b.filtros("pipeline_cards")).toContainEqual(["contact_id", "contato-1"])
  })

  it("sem card na Recompra, fica o da Entrada", async () => {
    const b = banco({ ...ATENDENTE_ATIVO,  pipeline_cards: { lista: [{ id: "card-entrada", funil: "entrada" }] } })
    await executarAcao(b.contexto(conversaCriada), acao("atribuir_atendente", { atendente_id: "u-1" }))
    expect(cardAtualizado(b)).toEqual(["card-entrada"])
  })

  it("no card movido, é o card que se moveu, mesmo com card na Recompra", async () => {
    const b = banco({ ...ATENDENTE_ATIVO,  pipeline_cards: { lista: [{ id: "card-recompra", funil: "recompra" }] } })
    await executarAcao(b.contexto(cardMovido), acao("atribuir_atendente", { atendente_id: "u-1" }))
    expect(cardAtualizado(b)).toEqual(["card-1"])
    expect(b.chamadas.some((c) => c.tabela === "pipeline_cards" && c.metodo === "select")).toBe(false)
  })

  it("sem conversa aberta, passa só o card", async () => {
    const b = banco({ ...ATENDENTE_ATIVO,  conversations: { um: null }, pipeline_cards: { lista: [{ id: "card-entrada", funil: "entrada" }] } })
    expect(await executarAcao(b.contexto(tagAdicionada), acao("atribuir_atendente", { atendente_id: "u-1" }))).toEqual({
      ok: true,
    })
    // B45-02: nenhuma conversa do evento muda de status; só o responsável das conversas do contato
    expect(b.gravacoes("conversations").map((g) => g.args[0])).toEqual([{ assigned_to: "u-1" }])
    expect(cardAtualizado(b)).toEqual(["card-entrada"])
  })

  it("sem conversa aberta e sem card, falha com o motivo", async () => {
    const b = banco({ ...ATENDENTE_ATIVO,  conversations: { um: null }, pipeline_cards: { lista: [] } })
    expect(await executarAcao(b.contexto(tagAdicionada), acao("atribuir_atendente", { atendente_id: "u-1" }))).toEqual({
      ok: false,
      motivo: "O contato não tem conversa aberta nem card",
    })
  })

  it("erro ao procurar o card: a conversa é passada mesmo assim, e a ação conta como erro", async () => {
    const b = banco({ ...ATENDENTE_ATIVO,  pipeline_cards: { erro: { message: "timeout" } } })
    expect(await executarAcao(b.contexto(conversaCriada), acao("atribuir_atendente", { atendente_id: "u-1" }))).toEqual({
      ok: false,
      motivo: "Erro ao gravar no banco",
    })
    expect(b.gravacoes("conversations")[0].args[0]).toEqual({ assigned_to: "u-1" })
  })
})

describe("no Ganho da Entrada, atribuir passa o card da Recompra (decisões 10.5, 15/10)", () => {
  const ganho: GatilhoAutomacao = {
    tipo: "card_movido",
    workspaceId: "ws-1",
    contactId: "contato-1",
    cardId: "card-entrada",
    funil: "entrada",
    etapa: "ganho",
  }
  const cardAtualizado = (b: ReturnType<typeof banco>) =>
    b.chamadas.filter((c) => c.tabela === "pipeline_cards" && c.metodo === "eq" && c.args[0] === "id").map((c) => c.args[1])
  const DOIS_CARDS = { lista: [{ id: "card-entrada", funil: "entrada" }, { id: "card-recompra", funil: "recompra" }] }
  const CONVERSA = { conversations: { um: { id: "conv-1", status: "em_atendimento" } } }

  it("atribuir atendente passa o card da Recompra e deixa o da Entrada com quem vendeu", async () => {
    const b = banco({ ...ATENDENTE_ATIVO, ...CONVERSA, pipeline_cards: DOIS_CARDS })
    expect(await executarAcao(b.contexto(ganho), acao("atribuir_atendente", { atendente_id: "u-1" }))).toEqual({ ok: true })
    expect(cardAtualizado(b)).toEqual(["card-recompra"])
    expect(b.gravacoes("conversations")[0].args[0]).toEqual({ assigned_to: "u-1" })
  })

  it("atribuir ao time passa o card da Recompra para quem o time escolheu", async () => {
    const b = banco({ pipeline_cards: DOIS_CARDS }, { atribuir_conversa_ao_time: { data: [{ atendente_id: "fulana", manteve: false }] } })
    expect(await executarAcao(b.contexto(ganho), acao("atribuir_time", { time_id: "time-recompra" }))).toEqual({ ok: true })
    expect(cardAtualizado(b)).toEqual(["card-recompra"])
    expect(b.gravacoes("pipeline_cards")[0].args[0]).toEqual({ atendente_id: "fulana" })
  })

  it("conversa já com alguém do time: o card da Recompra recebe essa pessoa mesmo assim", async () => {
    const b = banco({ pipeline_cards: DOIS_CARDS }, { atribuir_conversa_ao_time: { data: [{ atendente_id: "fulana", manteve: true }] } })
    expect(await executarAcao(b.contexto(ganho), acao("atribuir_time", { time_id: "time-recompra" }))).toEqual({ ok: true })
    expect(cardAtualizado(b)).toEqual(["card-recompra"])
  })

  it("sem card na Recompra, passa só a conversa e não toca no card da Entrada", async () => {
    const b = banco({ ...ATENDENTE_ATIVO, ...CONVERSA, pipeline_cards: { lista: [{ id: "card-entrada", funil: "entrada" }] } })
    expect(await executarAcao(b.contexto(ganho), acao("atribuir_atendente", { atendente_id: "u-1" }))).toEqual({ ok: true })
    expect(cardAtualizado(b)).toEqual([])
    expect(b.gravacoes("conversations")[0].args[0]).toEqual({ assigned_to: "u-1" })
  })

  it("em outra etapa da Entrada, continua o card que se moveu", async () => {
    const b = banco({ ...ATENDENTE_ATIVO, pipeline_cards: DOIS_CARDS })
    await executarAcao(b.contexto({ ...ganho, etapa: "negociacao" }), acao("atribuir_atendente", { atendente_id: "u-1" }))
    expect(cardAtualizado(b)).toEqual(["card-entrada"])
  })
})

describe("atribuir atendente só para quem está ativo (B22-02)", () => {
  it("atendente desativado: falha com o motivo e não mexe na conversa nem no card", async () => {
    const b = banco({ profiles: { um: { status: "inactive" } } })
    expect(await executarAcao(b.contexto(conversaCriada), acao("atribuir_atendente", { atendente_id: "u-1" }))).toEqual({
      ok: false,
      motivo: "O atendente está desativado",
    })
    expect(b.gravacoes("conversations")).toEqual([])
    expect(b.gravacoes("pipeline_cards")).toEqual([])
  })

  it("atendente excluído ou de outra empresa: falha com o motivo", async () => {
    const b = banco({ profiles: { um: null } })
    expect(await executarAcao(b.contexto(conversaCriada), acao("atribuir_atendente", { atendente_id: "u-1" }))).toEqual({
      ok: false,
      motivo: "O atendente não existe mais",
    })
    expect(b.filtros("profiles")).toEqual([
      ["id", "u-1"],
      ["workspace_id", "ws-1"],
    ])
    expect(b.gravacoes("conversations")).toEqual([])
  })

  it("erro ao conferir o atendente: não atribui e conta como erro", async () => {
    const b = banco({ profiles: { erro: { message: "timeout" } } })
    expect(await executarAcao(b.contexto(conversaCriada), acao("atribuir_atendente", { atendente_id: "u-1" }))).toEqual({
      ok: false,
      motivo: "Erro ao gravar no banco",
    })
    expect(b.gravacoes("conversations")).toEqual([])
  })
})

describe("atribuir põe a conversa em espera em atendimento, como o chat (B22-03)", () => {
  const atribuirU1 = acao("atribuir_atendente", { atendente_id: "u-1" })

  it("conversa em espera: passa a em atendimento com o atendente", async () => {
    const b = banco({ ...ATENDENTE_ATIVO, conversations: { um: { status: "em_espera" } } })
    expect(await executarAcao(b.contexto(conversaCriada), atribuirU1)).toEqual({ ok: true })
    expect(b.gravacoes("conversations")[0].args[0]).toEqual({ assigned_to: "u-1", status: "em_atendimento" })
  })

  it("conversa já em atendimento: só troca o atendente", async () => {
    const b = banco({ ...ATENDENTE_ATIVO, conversations: { um: { status: "em_atendimento" } } })
    await executarAcao(b.contexto(conversaCriada), atribuirU1)
    expect(b.gravacoes("conversations")[0].args[0]).toEqual({ assigned_to: "u-1" })
  })

  it("conversa resolvida: continua resolvida, só troca o atendente", async () => {
    const b = banco({ ...ATENDENTE_ATIVO, conversations: { um: { status: "resolvida" } } })
    await executarAcao(b.contexto(conversaCriada), atribuirU1)
    expect(b.gravacoes("conversations")[0].args[0]).toEqual({ assigned_to: "u-1" })
  })

  it("erro ao ler a conversa: não grava nela, passa o card e conta como erro", async () => {
    const b = banco({
      ...ATENDENTE_ATIVO,
      conversations: { erro: { message: "timeout" } },
      pipeline_cards: { lista: [{ id: "card-entrada", funil: "entrada" }] },
    })
    expect(await executarAcao(b.contexto(conversaCriada), atribuirU1)).toEqual({ ok: false, motivo: "Erro ao gravar no banco" })
    // B45-02: o status da conversa do evento não muda; só o responsável das conversas do contato
    expect(b.gravacoes("conversations").map((g) => g.args[0])).toEqual([{ assigned_to: "u-1" }])
    expect(b.gravacoes("pipeline_cards")[0].args[0]).toEqual({ atendente_id: "u-1" })
  })
})

describe("criar lembrete na Agenda (B28-01)", () => {
  const regra = { id: "regra-1", nome: "Pós-venda" }
  const lembrete = (parametros: Record<string, string>) => acao("criar_lembrete", parametros)

  it("CA-B28-27: cria o lembrete na Agenda do responsável, com as variáveis e o vencimento", async () => {
    const b = banco({
      conversations: { um: { assigned_to: "ana" } },
      profiles: { um: { status: "active", name: "Ana" } },
      contacts: { um: { name: "Bruno", phone_number: "5500000000102" } },
    })
    const antes = Date.now()
    const ok = await executarAcao(
      { ...b.contexto(conversaCriada), regra },
      // B38-05: toda variável tem texto reserva
      lembrete({ texto: "Ligar para {{nome_contato|o cliente}}", vence_em: "2", vence_unidade: "dias" })
    )

    expect(ok).toEqual({ ok: true })
    const [gravado] = b.gravacoes("reminders")
    const linha = gravado.args[0] as Record<string, string>
    expect(linha).toMatchObject({
      workspace_id: "ws-1",
      contact_id: "contato-1",
      atendente_id: "ana",
      origem: "automacao",
      automacao_nome: "Pós-venda",
      instrucao: "Ligar para Bruno",
    })
    const vence = new Date(linha.due_at).getTime()
    expect(vence - antes).toBeGreaterThanOrEqual(2 * 86_400_000)
    expect(vence - antes).toBeLessThan(2 * 86_400_000 + 60_000)
  })

  it("CA-B28-28: sem responsável na conversa, o lembrete vai para o primeiro admin ativo", async () => {
    const b = banco({
      conversations: { um: { assigned_to: null } },
      profiles: { um: { id: "admin-1" } },
      contacts: { um: { name: "Bruno", phone_number: "5500000000102" } },
    })
    const ok = await executarAcao({ ...b.contexto(conversaCriada), regra }, lembrete({ texto: "Ligar" }))

    expect(ok).toEqual({ ok: true })
    expect((b.gravacoes("reminders")[0].args[0] as Record<string, string>).atendente_id).toBe("admin-1")
    expect(b.filtros("profiles")).toEqual(
      expect.arrayContaining([
        ["workspace_id", "ws-1"],
        ["role", "admin"],
        ["status", "active"],
      ])
    )
    // "Primeiro": o mais antigo, um só
    const doPerfil = b.chamadas.filter((c) => c.tabela === "profiles")
    expect(doPerfil).toContainEqual(expect.objectContaining({ metodo: "order", args: ["created_at"] }))
    expect(doPerfil).toContainEqual(expect.objectContaining({ metodo: "limit", args: [1] }))
  })

  it("vencimento vazio vence na hora", async () => {
    const b = banco({
      conversations: { um: { assigned_to: "ana" } },
      profiles: { um: { status: "active" } },
      contacts: { um: { name: "Bruno" } },
    })
    const antes = Date.now()
    await executarAcao(b.contexto(conversaCriada), lembrete({ texto: "Ligar" }))
    const vence = new Date((b.gravacoes("reminders")[0].args[0] as Record<string, string>).due_at).getTime()
    expect(vence - antes).toBeLessThan(60_000)
  })

  it("CA-B28-29: pessoa escolhida desativada faz a ação falhar com o motivo, sem gravar", async () => {
    const b = banco({ profiles: { um: { status: "inactive" } } })
    const ok = await executarAcao(
      { ...b.contexto(conversaCriada), regra },
      lembrete({ texto: "Ligar", responsavel_id: "pessoa-1" })
    )

    expect(ok).toEqual({ ok: false, motivo: "A pessoa escolhida está desativada" })
    expect(b.gravacoes("reminders")).toEqual([])
  })

  it("empresa sem admin ativo e sem responsável: falha com o motivo", async () => {
    const b = banco({ conversations: { um: null }, profiles: { um: null } })
    const ok = await executarAcao(b.contexto(cardMovido), lembrete({ texto: "Ligar" }))
    expect(ok).toEqual({ ok: false, motivo: "Ninguém para receber o lembrete: a empresa não tem admin ativo" })
  })
})
