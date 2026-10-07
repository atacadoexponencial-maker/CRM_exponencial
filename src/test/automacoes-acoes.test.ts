// Testes das ações da B11-11 no motor: tags, remover etiqueta, dado do contato e
// atribuir a um time; e das da B11-08: iniciar sequência, resolver e reabrir a
// conversa. O banco é falso (`automacoes-banco-falso.ts`).

import { describe, it, expect, vi } from "vitest"

vi.mock("@/lib/whatsapp-envio", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/whatsapp-envio")>()),
  enviarTextoWhatsAppComMotivo: vi.fn().mockResolvedValue({ ok: true }),
}))

vi.mock("@/lib/sequencias", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/sequencias")>()),
  processarGatilhoSequencia: vi.fn().mockResolvedValue(undefined),
  iniciarExecucaoSequencia: vi.fn().mockResolvedValue({}),
}))

import { executarAcao } from "@/lib/automacoes/acoes"
import type { GatilhoAutomacao } from "@/lib/automacoes/contexto"
import type { AcaoTipo, BlocoAcao } from "@/lib/fluxo-automacao"
import { SEQUENCIA_JA_EM_ANDAMENTO, iniciarExecucaoSequencia, processarGatilhoSequencia } from "@/lib/sequencias"
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

describe("atribuir a um time", () => {
  const time = {
    user_teams: { lista: [{ user_id: "bruno" }, { user_id: "ana" }, { user_id: "carla" }] },
    profiles: {
      lista: [
        { id: "bruno", name: "Bruno" },
        { id: "ana", name: "Ana" },
        { id: "carla", name: "Carla" },
      ],
    },
  }

  it("escolhe o membro com menos conversas abertas e passa a conversa e o card para ele", async () => {
    const b = banco({
      ...time,
      // Bruno com 2 abertas, Ana com 1, Carla com nenhuma
      conversations: { lista: [{ assigned_to: "bruno" }, { assigned_to: "bruno" }, { assigned_to: "ana" }], um: { id: "conv-9" } },
    })
    const ok = await executarAcao(b.contexto(cardMovido), acao("atribuir_time", { time_id: "time-1" }))

    expect(ok).toEqual({ ok: true })
    expect(b.gravacoes("conversations")[0].args[0]).toEqual({ assigned_to: "carla" })
    expect(b.gravacoes("pipeline_cards")[0].args[0]).toEqual({ atendente_id: "carla" })
  })

  it("no empate, fica com o primeiro pelo nome", async () => {
    const b = banco({ ...time, conversations: { lista: [] } })
    await executarAcao(b.contexto(conversaCriada), acao("atribuir_time", { time_id: "time-1" }))

    expect(b.gravacoes("conversations")[0].args[0]).toEqual({ assigned_to: "ana" })
  })

  it("só conta conversas abertas dos membros, na empresa do evento", async () => {
    const b = banco({ ...time, conversations: { lista: [] } })
    await executarAcao(b.contexto(conversaCriada), acao("atribuir_time", { time_id: "time-1" }))

    const filtrosEmIn = b.chamadas.filter((c) => c.tabela === "conversations" && c.metodo === "in").map((c) => c.args)
    expect(filtrosEmIn).toContainEqual(["status", ["em_espera", "em_atendimento"]])
    expect(b.filtros("profiles")).toEqual([
      ["workspace_id", "ws-1"],
      ["status", "active"],
    ])
  })

  it("time sem membro ativo falha e não grava nada", async () => {
    const b = banco({ user_teams: { lista: [{ user_id: "bruno" }] }, profiles: { lista: [] } })
    expect(await executarAcao(b.contexto(conversaCriada), acao("atribuir_time", { time_id: "time-1" }))).toEqual({
      ok: false,
      motivo: "O time não tem atendente ativo",
    })
    expect(b.gravacoes("conversations")).toEqual([])
  })
})

describe("mover card segue a regra do CRM (B11-11)", () => {
  it("contato sem card no funil de destino: não move nem cria nada", async () => {
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
      ["insert", { funil: "recompra", etapa: "onboarding", contact_id: "contato-1", workspace_id: "ws-1" }],
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

describe("mover card com a opção de iniciar a sequência da etapa", () => {
  const iniciou = vi.mocked(processarGatilhoSequencia)

  it("Catálogo Enviado com a opção marcada inicia a sequência de catálogo, com o atendente do card", async () => {
    iniciou.mockClear()
    const b = banco({ pipeline_cards: { umEmOrdem: [{ id: "card-1", etapa: "sondagem", atendente_id: "carla" }] } })
    await executarAcao(
      b.contexto(cardMovido),
      acao("mover_card", { funil: "entrada", etapa: "catalogo_enviado", iniciar_sequencia: "sim" })
    )
    expect(iniciou).toHaveBeenCalledWith({
      workspaceId: "ws-1",
      contactId: "contato-1",
      atendenteId: "carla",
      gatilho: "catalogo_enviado",
    })
  })

  it("sem a opção, não inicia", async () => {
    iniciou.mockClear()
    const b = banco({ pipeline_cards: { umEmOrdem: [{ id: "card-1", etapa: "sondagem", atendente_id: null }] } })
    await executarAcao(b.contexto(cardMovido), acao("mover_card", { funil: "entrada", etapa: "catalogo_enviado" }))
    expect(iniciou).not.toHaveBeenCalled()
  })

  it("card que já estava na etapa não reinicia a sequência", async () => {
    iniciou.mockClear()
    const b = banco({ pipeline_cards: { umEmOrdem: [{ id: "card-1", etapa: "catalogo_enviado", atendente_id: null }] } })
    await executarAcao(
      b.contexto(cardMovido),
      acao("mover_card", { funil: "entrada", etapa: "catalogo_enviado", iniciar_sequencia: "sim" })
    )
    expect(iniciou).not.toHaveBeenCalled()
  })

  it("Ganho inicia o onboarding só quando o card da Recompra nasce", async () => {
    iniciou.mockClear()
    const novo = banco({ pipeline_cards: { umEmOrdem: [{ id: "card-1", etapa: "negociacao", atendente_id: null }, null] } })
    await executarAcao(novo.contexto(cardMovido), acao("mover_card", { funil: "entrada", etapa: "ganho", iniciar_sequencia: "sim" }))
    expect(iniciou).toHaveBeenCalledWith(expect.objectContaining({ gatilho: "onboarding" }))

    iniciou.mockClear()
    const jaTinha = banco({
      pipeline_cards: { umEmOrdem: [{ id: "card-1", etapa: "negociacao", atendente_id: null }, { id: "card-r" }] },
    })
    await executarAcao(jaTinha.contexto(cardMovido), acao("mover_card", { funil: "entrada", etapa: "ganho", iniciar_sequencia: "sim" }))
    expect(iniciou).not.toHaveBeenCalled()
  })

  it("Inativos, na Recompra, inicia a sequência de inativo; etapa sem sequência ignora a opção", async () => {
    iniciou.mockClear()
    const inativos = banco({ pipeline_cards: { umEmOrdem: [{ id: "card-r", etapa: "ativos", atendente_id: null }] } })
    await executarAcao(inativos.contexto(cardMovido), acao("mover_card", { funil: "recompra", etapa: "inativos", iniciar_sequencia: "sim" }))
    expect(iniciou).toHaveBeenCalledWith(expect.objectContaining({ gatilho: "inativo" }))

    iniciou.mockClear()
    const outra = banco({ pipeline_cards: { umEmOrdem: [{ id: "card-1", etapa: "lead", atendente_id: null }] } })
    await executarAcao(outra.contexto(cardMovido), acao("mover_card", { funil: "entrada", etapa: "sondagem", iniciar_sequencia: "sim" }))
    expect(iniciou).not.toHaveBeenCalled()
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

  it("atendente apagado", async () => {
    const b = banco({ conversations: { erro: { code: "23503" } } })
    expect(await executarAcao(b.contexto(conversaCriada), acao("atribuir_atendente", { atendente_id: "x" }))).toEqual({
      ok: false,
      motivo: "O atendente não existe mais",
    })
  })

  it("evento sem contato e ação ainda não disponível", async () => {
    const b = banco({})
    expect(await executarAcao(b.contexto({ ...cardMovido, contactId: null }), acao("adicionar_tag", { tag: "vip" }))).toEqual({
      ok: false,
      motivo: "O evento não tem contato",
    })
    expect(await executarAcao(b.contexto(conversaCriada), acao("enviar_mensagem_rapida", { mensagem_rapida_id: "r" }))).toEqual({
      ok: false,
      motivo: "Esta ação ainda não está disponível",
    })
  })
})

describe("iniciar sequência (B11-08)", () => {
  const iniciar = vi.mocked(iniciarExecucaoSequencia)

  it("inicia a sequência da empresa, com o atendente da conversa como responsável", async () => {
    iniciar.mockClear()
    const b = banco({ sequences: { um: { ativa: true } }, conversations: { um: { assigned_to: "u-1" } } })
    const ok = await executarAcao(b.contexto(conversaCriada), acao("iniciar_sequencia", { sequencia_id: "seq-1" }))

    expect(ok).toEqual({ ok: true })
    expect(b.filtros("sequences")).toEqual([
      ["id", "seq-1"],
      ["workspace_id", "ws-1"],
    ])
    expect(iniciar).toHaveBeenCalledWith(expect.anything(), {
      workspaceId: "ws-1",
      sequenceId: "seq-1",
      contactId: "contato-1",
      atendenteId: "u-1",
    })
  })

  it("sem conversa aberta, inicia sem responsável fixo", async () => {
    iniciar.mockClear()
    const b = banco({ sequences: { um: { ativa: true } }, conversations: { um: null } })
    await executarAcao(b.contexto(cardMovido), acao("iniciar_sequencia", { sequencia_id: "seq-1" }))
    expect(iniciar.mock.calls[0][1].atendenteId).toBeNull()
  })

  it("já em andamento para o contato conta como feita", async () => {
    iniciar.mockResolvedValueOnce({ erro: SEQUENCIA_JA_EM_ANDAMENTO })
    const b = banco({ sequences: { um: { ativa: true } }, conversations: { um: null } })
    expect(await executarAcao(b.contexto(conversaCriada), acao("iniciar_sequencia", { sequencia_id: "seq-1" }))).toEqual({
      ok: true,
    })
  })

  it("outro erro do início vira o motivo da falha", async () => {
    iniciar.mockResolvedValueOnce({ erro: "Sequência sem etapas" })
    const b = banco({ sequences: { um: { ativa: true } }, conversations: { um: null } })
    expect(await executarAcao(b.contexto(conversaCriada), acao("iniciar_sequencia", { sequencia_id: "seq-1" }))).toEqual({
      ok: false,
      motivo: "Sequência sem etapas",
    })
  })

  it("sequência apagada, de outra empresa ou desativada não inicia", async () => {
    iniciar.mockClear()
    const apagada = banco({ sequences: { um: null } })
    const desativada = banco({ sequences: { um: { ativa: false } } })
    expect(await executarAcao(apagada.contexto(conversaCriada), acao("iniciar_sequencia", { sequencia_id: "x" }))).toEqual({
      ok: false,
      motivo: "A sequência não existe mais",
    })
    expect(await executarAcao(desativada.contexto(conversaCriada), acao("iniciar_sequencia", { sequencia_id: "x" }))).toEqual({
      ok: false,
      motivo: "A sequência está desativada",
    })
    expect(iniciar).not.toHaveBeenCalled()
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

describe("atribuir passa também o card principal do contato (B11-08)", () => {
  const tagAdicionada: GatilhoAutomacao = { tipo: "tag_adicionada", workspaceId: "ws-1", contactId: "contato-1", tag: "vip" }
  const cardAtualizado = (b: ReturnType<typeof banco>) =>
    b.chamadas.filter((c) => c.tabela === "pipeline_cards" && c.metodo === "eq" && c.args[0] === "id").map((c) => c.args[1])

  it("fora do gatilho de card movido, o card da Recompra é o principal", async () => {
    const b = banco({
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
    const b = banco({ pipeline_cards: { lista: [{ id: "card-entrada", funil: "entrada" }] } })
    await executarAcao(b.contexto(conversaCriada), acao("atribuir_atendente", { atendente_id: "u-1" }))
    expect(cardAtualizado(b)).toEqual(["card-entrada"])
  })

  it("no card movido, é o card que se moveu, mesmo com card na Recompra", async () => {
    const b = banco({ pipeline_cards: { lista: [{ id: "card-recompra", funil: "recompra" }] } })
    await executarAcao(b.contexto(cardMovido), acao("atribuir_atendente", { atendente_id: "u-1" }))
    expect(cardAtualizado(b)).toEqual(["card-1"])
    expect(b.chamadas.some((c) => c.tabela === "pipeline_cards" && c.metodo === "select")).toBe(false)
  })

  it("sem conversa aberta, passa só o card", async () => {
    const b = banco({ conversations: { um: null }, pipeline_cards: { lista: [{ id: "card-entrada", funil: "entrada" }] } })
    expect(await executarAcao(b.contexto(tagAdicionada), acao("atribuir_atendente", { atendente_id: "u-1" }))).toEqual({
      ok: true,
    })
    expect(b.gravacoes("conversations")).toEqual([])
    expect(cardAtualizado(b)).toEqual(["card-entrada"])
  })

  it("sem conversa aberta e sem card, falha com o motivo", async () => {
    const b = banco({ conversations: { um: null }, pipeline_cards: { lista: [] } })
    expect(await executarAcao(b.contexto(tagAdicionada), acao("atribuir_atendente", { atendente_id: "u-1" }))).toEqual({
      ok: false,
      motivo: "O contato não tem conversa aberta nem card",
    })
  })

  it("erro ao procurar o card: a conversa é passada mesmo assim, e a ação conta como erro", async () => {
    const b = banco({ pipeline_cards: { erro: { message: "timeout" } } })
    expect(await executarAcao(b.contexto(conversaCriada), acao("atribuir_atendente", { atendente_id: "u-1" }))).toEqual({
      ok: false,
      motivo: "Erro ao gravar no banco",
    })
    expect(b.gravacoes("conversations")[0].args[0]).toEqual({ assigned_to: "u-1" })
  })
})
