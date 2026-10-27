// B44-05 — campanha sai uma vez só, não trava a fila e pula contato apagado
// (auditoria de 27/10/2026). Banco em memória (padrão do teste B20-03): o motor real
// processaria as campanhas "enviando" de produção. Cada chamada ao banco em memória
// filtra e altera de uma vez, como um UPDATE ... WHERE do Postgres.

import { describe, it, expect, vi, beforeEach } from "vitest"

type Linha = Record<string, unknown>
let tabelas: Record<string, Linha[]>

/** "reservado_em.is.null,reservado_em.lt.<data>" do supabase-js, sobre a linha em memória. */
function filtroOu(expressao: string): (l: Linha) => boolean {
  const partes = expressao.split(",").map((p) => p.split("."))
  return (l) =>
    partes.some(([coluna, operador, ...resto]) => {
      const valor = resto.join(".")
      if (operador === "is" && valor === "null") return l[coluna] == null
      if (operador === "lt") return l[coluna] != null && String(l[coluna]) < valor
      return false
    })
}

function consulta(tabela: string) {
  const filtros: Array<(l: Linha) => boolean> = []
  let alteracao: Linha | null = null
  let limite = Infinity
  const linhas = () => (tabelas[tabela] ?? []).filter((l) => filtros.every((f) => f(l)))
  const aplicar = (alvo: Linha[]) => {
    if (alteracao) for (const l of alvo) Object.assign(l, alteracao)
    return alvo
  }
  const elo = {
    select: () => elo,
    update: (dados: Linha) => { alteracao = dados; return elo },
    eq: (c: string, v: unknown) => { filtros.push((l) => l[c] === v); return elo },
    in: (c: string, vs: unknown[]) => { filtros.push((l) => vs.includes(l[c])); return elo },
    lte: (c: string, v: string) => { filtros.push((l) => String(l[c]) <= v); return elo },
    or: (expressao: string) => { filtros.push(filtroOu(expressao)); return elo },
    is: () => elo,
    order: () => elo,
    limit: (n: number) => { limite = n; return elo },
    maybeSingle: async () => ({ data: aplicar(linhas().slice(0, 1))[0] ?? null, error: null }),
    single: async () => ({ data: aplicar(linhas().slice(0, 1))[0] ?? null, error: null }),
    then: (ok: (r: { data: Linha[]; count: number; error: null }) => unknown) => {
      const alvo = aplicar(linhas().slice(0, limite))
      return Promise.resolve({ data: alvo, count: alvo.length, error: null }).then(ok)
    },
  }
  return elo
}

vi.mock("@/integrations/supabase/service", () => ({
  createServiceClient: () => ({ from: (t: string) => consulta(t) }),
}))
vi.mock("@/lib/campos-personalizados-servidor", () => ({
  camposDaEmpresa: vi.fn().mockResolvedValue([]),
  valoresDosContatos: vi.fn().mockResolvedValue(new Map()),
}))

/** Canal de envio falso: cada envio espera um pouco, para as execuções se cruzarem. */
const enviados: string[] = []
const canal = {
  canal: "meta",
  enviarTexto: vi.fn(async (telefone: string) => {
    await new Promise((r) => setTimeout(r, 1))
    enviados.push(telefone)
    return { ok: true, mensagemId: `wamid-${telefone}-${enviados.length}` }
  }),
  enviarMidia: vi.fn(),
}
vi.mock("@/lib/whatsapp", async (original) => ({
  ...(await original<typeof import("@/lib/whatsapp")>()),
  resolverProvider: vi.fn(async () => canal),
  providerDaConexao: vi.fn(() => canal),
}))

import { MOTIVO_CONTATO_APAGADO, MOTIVO_TEXTO_SEM_RESERVA, processarCampanhasPendentes } from "@/lib/campanhas"

const campanha = (id: string, workspace: string, extra: Linha = {}): Linha => ({
  id, workspace_id: workspace, status: "enviando", tipo_mensagem: "texto", conteudo: "Oi, {{nome_contato|cliente}}",
  arquivo_url: null, arquivo_nome: null, whatsapp_connection_id: null, agendada_para: null, created_at: "2026-10-27T10:00:00Z", ...extra,
})
const destinatario = (id: string, campanhaId: string, workspace: string, telefone: string, contato: string | null): Linha => ({
  id, campaign_id: campanhaId, workspace_id: workspace, contact_id: contato, nome_snapshot: `Cliente ${id}`,
  telefone_snapshot: telefone, status: "pendente", reservado_em: null,
})

beforeEach(() => {
  enviados.length = 0
  canal.enviarTexto.mockClear()
  tabelas = { campaigns: [], campaign_recipients: [], contacts: [] }
})

describe("B44-05 — Campanha sai uma vez só e não trava a fila", () => {
  it("CA-B44-18: should mandar uma mensagem só por destinatário com duas execuções ao mesmo tempo", async () => {
    tabelas.campaigns.push(campanha("camp_a", "ws_a"))
    for (let i = 0; i < 40; i++) {
      const telefone = `55119900${String(i).padStart(5, "0")}`
      tabelas.campaign_recipients.push(destinatario(`r${i}`, "camp_a", "ws_a", telefone, `contato-${i}`))
      tabelas.contacts.push({ id: `contato-${i}`, excluido_em: null, atendente: null })
    }

    await Promise.all([processarCampanhasPendentes(), processarCampanhasPendentes()])

    expect(enviados).toHaveLength(40)
    expect(new Set(enviados).size).toBe(40)
    expect(tabelas.campaign_recipients.every((r) => r.status === "enviado")).toBe(true)
  })

  it("CA-B44-19: should interromper, com o motivo, a campanha que não tem como sair", async () => {
    tabelas.campaigns.push(campanha("camp_travada", "ws_a", { conteudo: "Oi, {{nome_contato}}" }))
    tabelas.campaign_recipients.push(destinatario("r1", "camp_travada", "ws_a", "5511990000001", "c1"))

    await processarCampanhasPendentes()

    expect(tabelas.campaigns[0]).toMatchObject({ status: "interrompida", interrompida_motivo: MOTIVO_TEXTO_SEM_RESERVA })
    expect(enviados).toEqual([])
  })

  it("CA-B44-20: should enviar a campanha de outra empresa mesmo com três travadas na frente", async () => {
    for (const n of [1, 2, 3, 4]) {
      tabelas.campaigns.push(campanha(`travada_${n}`, "ws_a", { conteudo: "{{nome_contato}}", created_at: `2026-10-27T0${n}:00:00Z` }))
    }
    tabelas.campaigns.push(campanha("camp_b", "ws_b", { created_at: "2026-10-27T09:00:00Z" }))
    tabelas.campaign_recipients.push(destinatario("rb", "camp_b", "ws_b", "5511990000099", "cb"))
    tabelas.contacts.push({ id: "cb", excluido_em: null, atendente: null })

    await processarCampanhasPendentes()

    expect(enviados).toEqual(["5511990000099"])
    expect(tabelas.campaigns.find((c) => c.id === "camp_b")?.status).toBe("enviada")
  })

  it("CA-B44-21: should not mandar para quem teve o contato apagado de vez", async () => {
    tabelas.campaigns.push(campanha("camp_a", "ws_a"))
    tabelas.campaign_recipients.push(destinatario("r_apagado", "camp_a", "ws_a", "5511990000001", null))
    tabelas.campaign_recipients.push(destinatario("r_ativo", "camp_a", "ws_a", "5511990000002", "c2"))
    tabelas.contacts.push({ id: "c2", excluido_em: null, atendente: null })

    await processarCampanhasPendentes()

    expect(enviados).toEqual(["5511990000002"])
    expect(tabelas.campaign_recipients.find((r) => r.id === "r_apagado")).toMatchObject({ status: "excluido", motivo: MOTIVO_CONTATO_APAGADO })
  })

  it("CA-B44-22: should pular, no reenvio para falhas, quem teve o contato apagado de vez", async () => {
    // O reenvio nasce como campanha nova, com os falhos da original como destinatários.
    tabelas.campaigns.push(campanha("reenvio", "ws_a", { segmento: { reenvioDe: "camp_a" } }))
    tabelas.campaign_recipients.push(destinatario("r_apagado", "reenvio", "ws_a", "5511990000001", null))

    await processarCampanhasPendentes()

    expect(enviados).toEqual([])
    expect(tabelas.campaign_recipients[0]).toMatchObject({ status: "excluido", motivo: MOTIVO_CONTATO_APAGADO })
  })
})
