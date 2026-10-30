// B54-06 — confirmar uma campanha por template reconfere na Meta que o template continua
// aprovado no número da campanha. Banco e Meta falsos.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

type Linha = Record<string, unknown>
const conexoes: Linha[] = [
  { id: "num-oficial", workspace_id: "w-1", canal: "meta", waba_id: "waba-1", access_token: "tk-1", status: "connected" },
]

function consulta() {
  const filtros: Array<[string, unknown]> = []
  const linhas = () => conexoes.filter((l) => filtros.every(([c, v]) => l[c] === v))
  const q = {
    select: () => q,
    eq: (c: string, v: unknown) => { filtros.push([c, v]); return q },
    limit: () => q,
    maybeSingle: async () => ({ data: linhas()[0] ?? null, error: null }),
    then: (ok: (r: { count: number; data: Linha[]; error: null }) => unknown) =>
      Promise.resolve({ count: linhas().length, data: linhas(), error: null }).then(ok),
  }
  return q
}
const supabaseFalso = { from: () => consulta() }

vi.mock("@/lib/sessao", () => ({
  sessaoAtual: vi.fn(async () => ({ user: { id: "u-1" }, perfil: { role: "admin", workspace_id: "w-1" }, supabase: supabaseFalso })),
}))
vi.mock("@/integrations/supabase/service", () => ({ createServiceClient: () => supabaseFalso }))
vi.mock("@/integrations/supabase/server", () => ({ createClient: vi.fn() }))
vi.mock("@/lib/campanhas", () => ({ processarCampanhasPendentes: vi.fn() }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/fuso-da-empresa", () => ({ fusoDaEmpresa: async () => "America/Sao_Paulo" }))
const valoresDoFiltro = vi.fn(async () => ({ funis: [] }))
vi.mock("@/app/(auth)/contatos/actions", () => ({
  valoresDoFiltro: (...a: unknown[]) => valoresDoFiltro(...(a as [])),
  filtrarContatos: vi.fn(async () => ({ contatos: [], total: 0 })),
}))

import { AVISO_TEMPLATE_NAO_APROVADO, confirmarCampanha, type DadosCampanha } from "@/app/(auth)/campanhas/actions"

let statusNaMeta = "APPROVED"

const dados = (): DadosCampanha => ({
  nome: "Oferta",
  segmento: {},
  tipoMensagem: "template",
  conteudo: "",
  arquivoUrl: null,
  arquivoNome: null,
  whatsappConnectionId: "num-oficial",
  template: {
    id: "t-1", name: "oferta", language: "pt_BR", cabecalho: null,
    variaveis: { corpo: [{ origem: "nome_contato", reserva: "cliente" }], cabecalho: [], botoes: {} },
  },
})

beforeEach(() => {
  valoresDoFiltro.mockClear()
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
    data: [{ id: "t-1", name: "oferta", status: statusNaMeta, category: "MARKETING", language: "pt_BR", components: [{ type: "BODY", text: "Oi {{1}}" }] }],
  }))))
})
afterEach(() => vi.unstubAllGlobals())

describe("B54-06 — confirmar reconfere o template", () => {
  it("CA-B54-23: should recusar a confirmação com o aviso quando o template foi pausado ou rejeitado depois de escolhido", async () => {
    for (const status of ["PAUSED", "REJECTED"]) {
      statusNaMeta = status
      const r = await confirmarCampanha("camp-1", dados(), null)
      expect(r.erro).toBe("O template não está mais aprovado na Meta. Escolha outro ou corrija-o em Configurações > Templates")
      expect(r.erro).toBe(AVISO_TEMPLATE_NAO_APROVADO)
    }
    // a confirmação parou antes de montar os destinatários
    expect(valoresDoFiltro).not.toHaveBeenCalled()

    // aprovado: a reconferência passa e a confirmação segue para os passos seguintes
    statusNaMeta = "APPROVED"
    const r = await confirmarCampanha("camp-1", dados(), null)
    expect(r.erro).not.toBe(AVISO_TEMPLATE_NAO_APROVADO)
    expect(valoresDoFiltro).toHaveBeenCalled()
  })
})
