// B48-14: o fuso é da empresa. Começa em Brasília, só o Admin troca, e as telas, a
// Agenda e o horário comercial das automações passam a usá-lo. O processo do teste
// roda em UTC, como a Vercel.
process.env.TZ = "UTC"

import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/integrations/supabase/server", () => ({ createClient: vi.fn() }))
vi.mock("@/integrations/supabase/service", () => ({ createServiceClient: vi.fn() }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

import { createClient } from "@/integrations/supabase/server"
import { createServiceClient } from "@/integrations/supabase/service"
import { buscarDadosPainel } from "@/app/(auth)/pipeline/actions"
import { salvarFuso } from "@/app/(auth)/configuracoes/empresa/actions"
import { fusoDaEmpresa } from "@/lib/fuso-da-empresa"
import { dentroDoHorario } from "@/lib/horario-comercial"
import { rangeDoPeriodo } from "@/lib/metricas-dashboard"
import { estimarDuracaoDoDisparo } from "@/lib/whatsapp/gateway/fila-campanha"
import { FUSO_DA_OPERACAO, formatarHoraDoDia, instanteNoFuso } from "@/lib/datas"

const MANAUS = "America/Manaus"
/** Movimento do card às 18:00 UTC: 15:00 em Brasília, 14:00 em Manaus. */
const MOVIMENTO = "2026-10-27T18:00:00.000Z"

/** Banco falso de quem está logado: o perfil, a empresa e o histórico de um card. */
function banco({ papel, fuso }: { papel: string; fuso?: string | null }) {
  const linhas: Record<string, unknown[]> = {
    profiles: [{ id: "u-1", role: papel, name: "Ana", workspace_id: "w-1" }],
    workspaces: fuso === undefined ? [] : [{ fuso }],
    pipeline_card_history: [{ de_etapa: "lead", para_etapa: "sondagem", created_at: MOVIMENTO, alterado_por: { name: "Ana" } }],
    pipeline_card_notes: [],
    pipeline_cards: [{ funil: "entrada" }],
  }
  return {
    auth: { getUser: async () => ({ data: { user: { id: "u-1" } }, error: null }) },
    from: (tabela: string) => {
      const obj: Record<string, unknown> = {}
      for (const m of ["select", "eq", "in", "order"]) obj[m] = () => obj
      obj.maybeSingle = () => Promise.resolve({ data: (linhas[tabela] ?? [])[0] ?? null, error: null })
      obj.single = obj.maybeSingle
      obj.then = (resolve: (v: unknown) => void) => Promise.resolve({ data: linhas[tabela] ?? [], error: null }).then(resolve)
      return obj
    },
  }
}

/** A chave de serviço, que é por onde o fuso é gravado: guarda o que pediram. */
function servico() {
  const gravacoes: Array<{ valores: unknown; id: unknown }> = []
  const cliente = {
    from: (tabela: string) => ({
      update: (valores: unknown) => ({
        eq: (_coluna: string, id: unknown) => {
          if (tabela === "workspaces") gravacoes.push({ valores, id })
          return Promise.resolve({ error: null })
        },
      }),
    }),
  }
  vi.mocked(createServiceClient).mockReturnValue(cliente as never)
  return gravacoes
}

const logado = (papel: string, fuso?: string | null) => vi.mocked(createClient).mockResolvedValue(banco({ papel, fuso }) as never)

beforeEach(() => vi.clearAllMocks())

describe("B48-14: fuso da empresa", () => {
  it("CA-B48-35: empresa sem fuso escolhido mostra o movimento das 18:00 UTC às 15:00", async () => {
    logado("atendente")
    expect(await fusoDaEmpresa()).toBe(FUSO_DA_OPERACAO)
    const { historico } = await buscarDadosPainel("card-1")
    expect(historico[0].data).toContain("15:00")
  })

  it("CA-B48-35: um fuso fora da lista guardado no banco também cai em Brasília", async () => {
    logado("atendente", "Europe/Lisbon")
    expect(await fusoDaEmpresa()).toBe(FUSO_DA_OPERACAO)
  })

  it("CA-B48-36: o Admin escolhe Manaus e salva; o fuso vai para a empresa dele", async () => {
    logado("admin")
    const gravacoes = servico()
    expect(await salvarFuso(MANAUS)).toEqual({})
    expect(gravacoes).toEqual([{ valores: { fuso: MANAUS }, id: "w-1" }])
  })

  it("CA-B48-36: com a empresa em Manaus, o mesmo movimento aparece às 14:00 para todos os papéis", async () => {
    for (const papel of ["admin", "gerente", "atendente"]) {
      logado(papel, MANAUS)
      const { historico } = await buscarDadosPainel("card-1")
      expect(historico[0].data, papel).toContain("14:00")
      expect(historico[0].data, papel).not.toContain("15:00")
    }
  })

  it("CA-B48-36: o follow-up digitado às 09:00 vence às 09:00 de Manaus", () => {
    expect(instanteNoFuso("2026-10-28", "09:00", MANAUS).toISOString()).toBe("2026-10-28T13:00:00.000Z")
    expect(instanteNoFuso("2026-10-28", "09:00", FUSO_DA_OPERACAO).toISOString()).toBe("2026-10-28T12:00:00.000Z")
    expect(formatarHoraDoDia("2026-10-28T13:00:00.000Z", MANAUS)).toBe("09:00")
  })

  it("CA-B48-36: o horário comercial 08:00–18:00 é lido no fuso da empresa", () => {
    const horario = { dias: [1, 2, 3, 4, 5], inicio: "08:00", fim: "18:00" }
    // Quarta, 21:30 UTC: 17:30 em Manaus (dentro), 18:30 em Brasília (fora)
    const quarta = new Date("2026-10-28T21:30:00.000Z")
    expect(dentroDoHorario(horario, quarta, MANAUS)).toBe(true)
    expect(dentroDoHorario(horario, quarta, FUSO_DA_OPERACAO)).toBe(false)
  })

  it("CA-B48-36: o \"hoje\" do Dashboard vira à meia-noite do fuso, não à do servidor", () => {
    // 01:00 UTC do dia 28 ainda é dia 27 em Brasília e em Manaus
    const agora = new Date("2026-10-28T01:00:00.000Z")
    expect(rangeDoPeriodo({ periodo: "mes" }, FUSO_DA_OPERACAO, agora).fim.toISOString()).toBe("2026-10-28T02:59:59.999Z")
    expect(rangeDoPeriodo({ periodo: "mes" }, MANAUS, agora).fim.toISOString()).toBe("2026-10-28T03:59:59.999Z")
    expect(rangeDoPeriodo({ periodo: "mes" }, MANAUS, agora).inicio.toISOString()).toBe("2026-10-01T04:00:00.000Z")
  })

  it("CA-B48-36: a estimativa da campanha lê a janela em Brasília, não no relógio do servidor", () => {
    // 18:00 em Brasília (21:00 UTC), janela 08–20: começa agora, não amanhã
    const estimativa = estimarDuracaoDoDisparo({ destinatarios: 10, agora: new Date("2026-10-28T21:00:00.000Z") })
    expect(estimativa.diasDeJanela).toBe(1)
    expect(estimativa.minutosTotais).toBeLessThan(60)
  })

  it("CA-B48-37: Gerente e Atendente não trocam o fuso", async () => {
    for (const papel of ["gerente", "atendente"]) {
      logado(papel, FUSO_DA_OPERACAO)
      const gravacoes = servico()
      expect(await salvarFuso(MANAUS), papel).toEqual({ erro: "Sem permissão" })
      expect(gravacoes, papel).toEqual([])
      expect(await fusoDaEmpresa(), papel).toBe(FUSO_DA_OPERACAO)
    }
  })
})
