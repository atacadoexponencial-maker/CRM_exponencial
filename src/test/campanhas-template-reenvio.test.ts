// B54-05 — o reenvio para os que falharam (a única cópia de campanha que existe,
// SUP-B54-12) leva junto o template, as origens, o arquivo e o número. O banco é falso.

import { beforeEach, describe, expect, it, vi } from "vitest"

type Linha = Record<string, unknown>
let tabelas: Record<string, Linha[]>
let inseridos: Linha[]

function consulta(tabela: string) {
  const filtros: Array<(l: Linha) => boolean> = []
  const q = {
    select: (_c?: string, opts?: { count?: string; head?: boolean }) => {
      if (opts?.count) {
        return { ...q, eq: (c: string, v: unknown) => { filtros.push((l) => l[c] === v); return q }, then: undefined }
      }
      return q
    },
    eq: (c: string, v: unknown) => { filtros.push((l) => l[c] === v); return q },
    single: async () => ({ data: (tabelas[tabela] ?? []).find((l) => filtros.every((f) => f(l))) ?? null, error: null }),
    insert: (linha: Linha) => {
      const nova = { id: `novo-${inseridos.length + 1}`, ...linha }
      inseridos.push(nova)
      tabelas[tabela] = [...(tabelas[tabela] ?? []), nova]
      return { select: () => ({ single: async () => ({ data: nova, error: null }) }) }
    },
    // count: exact, head: true
    get count() { return (tabelas[tabela] ?? []).filter((l) => filtros.every((f) => f(l))).length },
    then(resolve: (v: { count: number }) => void) {
      resolve({ count: (tabelas[tabela] ?? []).filter((l) => filtros.every((f) => f(l))).length })
    },
  }
  return q
}

const supabaseFalso = { from: (t: string) => consulta(t) }

vi.mock("@/lib/sessao", () => ({
  sessaoAtual: vi.fn(async () => ({ user: { id: "u-1" }, perfil: { role: "admin", workspace_id: "w-1" }, supabase: supabaseFalso })),
}))
vi.mock("@/integrations/supabase/service", () => ({ createServiceClient: vi.fn() }))
vi.mock("@/integrations/supabase/server", () => ({ createClient: vi.fn() }))
vi.mock("@/lib/campanhas", () => ({ processarCampanhasPendentes: vi.fn() }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/fuso-da-empresa", () => ({ fusoDaEmpresa: async () => "America/Sao_Paulo" }))

import { criarReenvioParaFalhos } from "@/app/(auth)/campanhas/actions"

const TEMPLATE = {
  id: "t-vend", name: "vendedor_da_loja", language: "pt_BR", cabecalho: "imagem",
  variaveis: { corpo: [{ origem: "nome_contato", reserva: "cliente" }], cabecalho: [], botoes: {} },
}

beforeEach(() => {
  inseridos = []
  tabelas = {
    campaigns: [{
      id: "camp-1", workspace_id: "w-1", nome: "Lançamento", tipo_mensagem: "template", conteudo: "",
      arquivo_url: "https://x.supabase.co/storage/v1/object/public/chat-attachments/w-1/campanhas/capa.jpg", arquivo_nome: "capa.jpg",
      whatsapp_connection_id: "num-oficial", template: TEMPLATE,
    }],
    campaign_recipients: [
      { id: "r1", campaign_id: "camp-1", status: "falhou" },
      { id: "r2", campaign_id: "camp-1", status: "enviado" },
    ],
  }
})

describe("B54-05 — reenvio copia o template", () => {
  it("CA-B54-21: should criar o reenvio com o mesmo template, origens, arquivo e número da campanha de origem", async () => {
    const r = await criarReenvioParaFalhos("camp-1")
    expect(r.erro).toBeUndefined()
    expect(inseridos).toHaveLength(1)
    expect(inseridos[0]).toMatchObject({
      nome: "Lançamento (reenvio)",
      segmento: { reenvioDe: "camp-1" },
      tipo_mensagem: "template",
      arquivo_url: "https://x.supabase.co/storage/v1/object/public/chat-attachments/w-1/campanhas/capa.jpg",
      arquivo_nome: "capa.jpg",
      whatsapp_connection_id: "num-oficial",
      template: TEMPLATE,
    })
  })
})
