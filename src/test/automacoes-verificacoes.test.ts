// Testes das verificações de contato no motor (B11-11): tag, tipo e
// classificação. O banco é falso (`automacoes-banco-falso.ts`).

import { describe, it, expect } from "vitest"
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
