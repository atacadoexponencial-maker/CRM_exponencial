// Testes das verificações de contato no motor (B11-11): tag, tipo e
// classificação; a de horário comercial (B11-08); texto e tipo da mensagem
// (B11-04). O banco é falso (`automacoes-banco-falso.ts`).

import { afterEach, beforeEach, describe, it, expect, vi } from "vitest"
import type { GatilhoAutomacao } from "@/lib/automacoes/contexto"
import { verificacaoVale } from "@/lib/automacoes/verificacoes"
import type { Verificacao, VerificacaoTipo } from "@/lib/fluxo-automacao"
import { banco } from "./automacoes-banco-falso"

const evento: GatilhoAutomacao = {
  tipo: "card_movido",
  workspaceId: "ws-1",
  contactId: "contato-1",
  cardId: "card-1",
  funil: "entrada",
  etapa: "sondagem",
}

const verificacao = (tipo: VerificacaoTipo, operador: string, valor: string): Verificacao => ({
  id: "v",
  tipo,
  operador,
  valor,
})

describe("tag do contato", () => {
  it("tem: vale quando o contato tem a tag, procurada já normalizada", async () => {
    const b = banco({ contact_tags: { um: { id: "t1" } } })
    expect(await verificacaoVale(b.contexto(evento), verificacao("tag_contato", "tem", "VIP"))).toBe(true)
    expect(b.filtros("contact_tags")).toEqual([
      ["contact_id", "contato-1"],
      ["workspace_id", "ws-1"],
      ["tag", "vip"],
    ])
  })

  it("não tem: vale quando a tag não está lá", async () => {
    const semTag = banco({ contact_tags: { um: null } })
    const comTag = banco({ contact_tags: { um: { id: "t1" } } })
    expect(await verificacaoVale(semTag.contexto(evento), verificacao("tag_contato", "nao_tem", "vip"))).toBe(true)
    expect(await verificacaoVale(comTag.contexto(evento), verificacao("tag_contato", "nao_tem", "vip"))).toBe(false)
  })

  it("erro de banco sobe, para encerrar a regra", async () => {
    const b = banco({ contact_tags: { erro: { message: "timeout" } } })
    await expect(verificacaoVale(b.contexto(evento), verificacao("tag_contato", "tem", "vip"))).rejects.toBeTruthy()
  })
})

describe("tipo do contato", () => {
  it("é / não é", async () => {
    const lojista = banco({ contacts: { um: { tipo: "lojista" } } })
    expect(await verificacaoVale(lojista.contexto(evento), verificacao("tipo_contato", "e", "lojista"))).toBe(true)
    expect(await verificacaoVale(lojista.contexto(evento), verificacao("tipo_contato", "nao_e", "lojista"))).toBe(false)
  })

  it("contato sem tipo não é nenhum tipo", async () => {
    const semTipo = banco({ contacts: { um: { tipo: null } } })
    expect(await verificacaoVale(semTipo.contexto(evento), verificacao("tipo_contato", "e", "lojista"))).toBe(false)
    expect(await verificacaoVale(semTipo.contexto(evento), verificacao("tipo_contato", "nao_e", "lojista"))).toBe(true)
  })
})

describe("classificação do contato", () => {
  it("é calculada pela etapa dos cards, como o CRM mostra", async () => {
    const ativo = banco({ pipeline_cards: { lista: [{ funil: "recompra", etapa: "ativos" }] } })
    const lead = banco({ pipeline_cards: { lista: [{ funil: "entrada", etapa: "sondagem" }] } })
    const semCard = banco({ pipeline_cards: { lista: [] } })

    expect(await verificacaoVale(ativo.contexto(evento), verificacao("classificacao", "e", "ativo"))).toBe(true)
    expect(await verificacaoVale(lead.contexto(evento), verificacao("classificacao", "e", "lead"))).toBe(true)
    expect(await verificacaoVale(semCard.contexto(evento), verificacao("classificacao", "e", "sem_historico"))).toBe(true)
    expect(await verificacaoVale(lead.contexto(evento), verificacao("classificacao", "nao_e", "ativo"))).toBe(true)
  })

  it("não lê a coluna contacts.classificacao", async () => {
    const b = banco({ pipeline_cards: { lista: [] } })
    await verificacaoVale(b.contexto(evento), verificacao("classificacao", "e", "lead"))
    expect(b.chamadas.some((c) => c.tabela === "contacts")).toBe(false)
  })
})

describe("evento sem contato", () => {
  it("as verificações de contato não valem", async () => {
    const b = banco({})
    const semContato: GatilhoAutomacao = { ...evento, contactId: null }
    for (const v of [
      verificacao("tag_contato", "nao_tem", "vip"),
      verificacao("tipo_contato", "nao_e", "lojista"),
      verificacao("classificacao", "nao_e", "ativo"),
    ]) {
      expect(await verificacaoVale(b.contexto(semContato), v)).toBe(false)
    }
  })
})

describe("horário comercial (B11-08)", () => {
  // Quarta, 7 de outubro de 2026, 09:00 em Brasília
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-10-07T12:00:00Z"))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it("sem horário gravado, vale o padrão (seg a sex, 08:00 às 18:00)", async () => {
    const b = banco({ business_hours: { um: null } })
    expect(await verificacaoVale(b.contexto(evento), verificacao("horario_comercial", "dentro", ""))).toBe(true)
    expect(await verificacaoVale(b.contexto(evento), verificacao("horario_comercial", "fora", ""))).toBe(false)
    expect(b.filtros("business_hours")).toEqual([
      ["workspace_id", "ws-1"],
      ["workspace_id", "ws-1"],
    ])
  })

  it("usa o horário que a empresa gravou", async () => {
    const soSabado = banco({ business_hours: { um: { dias: [6], inicio: "08:00:00", fim: "12:00:00" } } })
    const tarde = banco({ business_hours: { um: { dias: [1, 2, 3, 4, 5], inicio: "13:00:00", fim: "18:00:00" } } })
    expect(await verificacaoVale(soSabado.contexto(evento), verificacao("horario_comercial", "fora", ""))).toBe(true)
    expect(await verificacaoVale(tarde.contexto(evento), verificacao("horario_comercial", "dentro", ""))).toBe(false)
  })

  it("erro de banco sobe, para encerrar a regra", async () => {
    const b = banco({ business_hours: { erro: { message: "timeout" } } })
    await expect(verificacaoVale(b.contexto(evento), verificacao("horario_comercial", "dentro", ""))).rejects.toBeTruthy()
  })
})

describe("B11-04 — texto e tipo da mensagem", () => {
  const mensagem = (texto: string, tipoMensagem = "texto"): GatilhoAutomacao => ({
    tipo: "mensagem_recebida",
    workspaceId: "ws-1",
    contactId: "contato-1",
    conversationId: "conversa-1",
    messageId: "mensagem-1",
    tipoMensagem,
    texto,
  })
  const vale = (evento: GatilhoAutomacao, tipo: VerificacaoTipo, operador: string, valor: string) =>
    verificacaoVale(banco({}).contexto(evento), verificacao(tipo, operador, valor))

  it("contém: sem distinguir maiúsculas nem acentos, nos dois lados", async () => {
    expect(await vale(mensagem("Quero o CATÁLOGO"), "texto_mensagem", "contem", "catálogo")).toBe(true)
    expect(await vale(mensagem("me manda o catalogo"), "texto_mensagem", "contem", "Catálogo")).toBe(true)
    expect(await vale(mensagem("oi"), "texto_mensagem", "contem", "catálogo")).toBe(false)
  })

  it("não contém: o contrário do contém", async () => {
    expect(await vale(mensagem("oi"), "texto_mensagem", "nao_contem", "catálogo")).toBe(true)
    expect(await vale(mensagem("Quero o CATÁLOGO"), "texto_mensagem", "nao_contem", "catálogo")).toBe(false)
  })

  it("começa com e é igual a, ignorando espaços repetidos e nas pontas", async () => {
    expect(await vale(mensagem("  Bom dia, tudo bem?"), "texto_mensagem", "comeca_com", "bom dia")).toBe(true)
    expect(await vale(mensagem("Olá, bom dia"), "texto_mensagem", "comeca_com", "bom dia")).toBe(false)
    expect(await vale(mensagem(" Quero   o catálogo "), "texto_mensagem", "igual", "quero o CATALOGO")).toBe(true)
    expect(await vale(mensagem("Quero o catálogo agora"), "texto_mensagem", "igual", "quero o catálogo")).toBe(false)
  })

  it("contém alguma das palavras: lista por vírgula, cada item como trecho, itens vazios ignorados", async () => {
    expect(await vale(mensagem("Qual o PREÇO do kit?"), "texto_mensagem", "contem_alguma", "valor, preço, tabela")).toBe(true)
    expect(await vale(mensagem("quais os preços"), "texto_mensagem", "contem_alguma", "preço")).toBe(true)
    expect(await vale(mensagem("oi"), "texto_mensagem", "contem_alguma", "preço, , valor")).toBe(false)
    expect(await vale(mensagem("oi"), "texto_mensagem", "contem_alguma", " , ,")).toBe(false)
  })

  it("mensagem sem texto (foto sem legenda): contém não vale, não contém vale", async () => {
    const foto = mensagem("", "imagem")
    expect(await vale(foto, "texto_mensagem", "contem", "catálogo")).toBe(false)
    expect(await vale(foto, "texto_mensagem", "nao_contem", "catálogo")).toBe(true)
  })

  it("tipo da mensagem: é e não é", async () => {
    const foto = mensagem("segue o catálogo", "imagem")
    expect(await vale(foto, "tipo_mensagem", "e", "imagem")).toBe(true)
    expect(await vale(foto, "tipo_mensagem", "nao_e", "imagem")).toBe(false)
    expect(await vale(foto, "tipo_mensagem", "nao_e", "texto")).toBe(true)
    expect(await vale(foto, "texto_mensagem", "contem", "catálogo")).toBe(true)
  })

  it("fora dos gatilhos de mensagem, nenhuma das duas vale, e o banco não é consultado", async () => {
    const b = banco({})
    expect(await verificacaoVale(b.contexto(evento), verificacao("texto_mensagem", "nao_contem", "x"))).toBe(false)
    expect(await verificacaoVale(b.contexto(evento), verificacao("tipo_mensagem", "nao_e", "texto"))).toBe(false)
    expect(b.chamadas).toEqual([])
  })

  it("operador desconhecido não vale", async () => {
    expect(await vale(mensagem("catálogo"), "texto_mensagem", "parecido", "catálogo")).toBe(false)
    expect(await vale(mensagem("catálogo"), "tipo_mensagem", "parecido", "texto")).toBe(false)
  })
})
