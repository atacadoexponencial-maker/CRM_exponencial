// B20-03 — o motor de campanhas nunca usa o número de outra empresa. Banco em memória:
// o motor real processaria as campanhas "enviando" de produção.

import { describe, it, expect, vi, beforeEach } from "vitest"
import { MOTIVO_SEM_NUMERO } from "@/lib/whatsapp/motivo-da-falha"

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
    order: () => elo,
    limit: (n: number) => { limite = n; return elo },
    maybeSingle: async () => ({ data: linhas()[0] ?? null, error: null }),
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
  vi.stubGlobal("fetch", fetchFalso)
  vi.stubEnv("GATEWAY_BASE_URL", "https://gateway.exemplo.com/v1")
  vi.stubEnv("GATEWAY_SERVICE_KEY", "chave")
  tabelas = {
    campaigns: [{ id: "camp_a", workspace_id: "ws_a", status: "enviando", tipo_mensagem: "texto", conteudo: "oi", arquivo_url: null, arquivo_nome: null, whatsapp_connection_id: "conexao_b" }],
    whatsapp_connections: [{ id: "conexao_b", workspace_id: "ws_b", canal: "gateway", status: "connected", instance_id: "inst_b", instance_token: "token-da-b", phone_number_id: null, access_token: null }],
    campaign_recipients: [{ id: "r1", campaign_id: "camp_a", workspace_id: "ws_a", contact_id: null, nome_snapshot: "X", telefone_snapshot: "5511999990000", status: "pendente" }],
    contacts: [],
  }
})

describe("B20-03 — Motor de campanhas e o número de outra empresa", () => {
  it("should not disparar pelo número de outra empresa gravado na campanha", async () => {
    const { processarCampanhasPendentes } = await import("@/lib/campanhas")
    const enviados = await processarCampanhasPendentes()

    expect(enviados).toBe(0)
    expect(fetchFalso).not.toHaveBeenCalled()
    expect(tabelas.campaign_recipients[0]).toMatchObject({ status: "falhou", motivo: MOTIVO_SEM_NUMERO })
  })
})
