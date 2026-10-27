// B42-02 — campanha agendada antes do filtro novo é enviada para a lista fechada na
// confirmação. Banco em memória (padrão do teste B20-03): o motor real processaria as
// campanhas de produção.

import { describe, it, expect, vi, beforeEach } from "vitest"

type Linha = Record<string, unknown>
let tabelas: Record<string, Linha[]>
const fetchFalso = vi.fn()

/** Cadeia mínima do supabase-js, com filtros de verdade sobre as linhas em memória. */
function consulta(tabela: string) {
  const filtros: Array<(l: Linha) => boolean> = []
  let alteracao: Linha | null = null
  let limite = Infinity
  const linhas = () => (tabelas[tabela] ?? []).filter((l) => filtros.every((f) => f(l)))
  const elo = {
    select: () => elo,
    update: (dados: Linha) => { alteracao = dados; return elo },
    eq: (c: string, v: unknown) => { filtros.push((l) => l[c] === v); return elo },
    in: (c: string, vs: unknown[]) => { filtros.push((l) => vs.includes(l[c])); return elo },
    lte: (c: string, v: string) => { filtros.push((l) => String(l[c]) <= v); return elo },
    is: () => elo,
    // B44-05: a reserva do destinatário filtra "sem reserva ou vencida"; aqui nada está reservado.
    or: () => elo,
    order: () => elo,
    limit: (n: number) => { limite = n; return elo },
    maybeSingle: async () => {
      const alvo = linhas()[0] ?? null
      if (alvo && alteracao) Object.assign(alvo, alteracao)
      return { data: alvo, error: null }
    },
    single: async () => ({ data: linhas()[0] ?? null, error: null }),
    then: (ok: (r: { data: Linha[]; error: null }) => unknown) => {
      const alvo = linhas().slice(0, limite)
      if (alteracao) for (const l of alvo) Object.assign(l, alteracao)
      return Promise.resolve({ data: alvo, error: null }).then(ok)
    },
  }
  return elo
}

vi.mock("@/integrations/supabase/service", () => ({
  createServiceClient: () => ({ from: (t: string) => consulta(t) }),
}))

beforeEach(() => {
  fetchFalso.mockReset()
  fetchFalso.mockImplementation(async () => new Response(JSON.stringify({ id: "msg-1", status: "queued", position: 1 }), { status: 202 }))
  vi.stubGlobal("fetch", fetchFalso)
  vi.stubEnv("GATEWAY_BASE_URL", "https://gateway.exemplo.com/v1")
  vi.stubEnv("GATEWAY_SERVICE_KEY", "chave")
  tabelas = {
    campaigns: [{
      id: "camp_antiga", workspace_id: "ws_a", status: "agendada", agendada_para: "2026-01-01T12:00:00.000Z",
      tipo_mensagem: "texto", conteudo: "oi", arquivo_url: null, arquivo_nome: null, whatsapp_connection_id: "conexao_a",
      // Segmento do jeito antigo: se o motor o lesse, mandaria também para a Carla.
      segmento: { tipos: ["lojista"] },
    }],
    whatsapp_connections: [{ id: "conexao_a", workspace_id: "ws_a", canal: "gateway", status: "connected", instance_id: "inst_a", instance_token: "token-a", phone_number_id: null, access_token: null }],
    campaign_recipients: [
      { id: "r1", campaign_id: "camp_antiga", workspace_id: "ws_a", contact_id: "c-ana", nome_snapshot: "Ana", telefone_snapshot: "5511999990001", status: "pendente" },
      { id: "r2", campaign_id: "camp_antiga", workspace_id: "ws_a", contact_id: "c-bia", nome_snapshot: "Bia", telefone_snapshot: "5511999990002", status: "pendente" },
    ],
    contacts: [
      { id: "c-ana", workspace_id: "ws_a", name: "Ana", phone_number: "5511999990001", tipo: "lojista" },
      { id: "c-bia", workspace_id: "ws_a", name: "Bia", phone_number: "5511999990002", tipo: "lojista" },
      { id: "c-carla", workspace_id: "ws_a", name: "Carla", phone_number: "5511999990003", tipo: "lojista" },
    ],
  }
})

describe("B42-02 — campanha agendada antiga e a lista fechada", () => {
  it("CA-B42-29: should enviar a agendada antiga, no horário, só para a lista fechada na confirmação", async () => {
    const { processarCampanhasPendentes } = await import("@/lib/campanhas")
    await processarCampanhasPendentes()

    expect(tabelas.campaigns[0].status).not.toBe("agendada")
    const corpos = fetchFalso.mock.calls.map(([, init]) => String((init as RequestInit | undefined)?.body ?? ""))
    const telefones = ["5511999990001", "5511999990002", "5511999990003"].filter((t) => corpos.some((c) => c.includes(t)))
    expect(telefones).toEqual(["5511999990001", "5511999990002"])
    expect(tabelas.campaign_recipients.every((r) => r.status !== "pendente")).toBe(true)
  })
})
