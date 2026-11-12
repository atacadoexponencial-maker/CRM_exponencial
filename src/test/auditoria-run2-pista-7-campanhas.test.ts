// Auditoria run-2, pista 7 (06/11/2026): a campanha também não manda nada ao contato
// que nasceu de um pedido da loja (`origem = 'loja'`, telefone sem conferência)
// enquanto ele não escrever para a empresa. Banco em memória, que aplica os filtros
// (padrão de `campanhas-envio-reconfere.test.ts`).

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

const textos: string[] = []
const canal = {
  canal: "meta",
  enviarTexto: vi.fn(async (telefone: string) => {
    textos.push(telefone)
    return { ok: true, mensagemId: `wamid-${telefone}` }
  }),
  enviarMidia: vi.fn(),
}
vi.mock("@/lib/whatsapp", async (original) => ({
  ...(await original<typeof import("@/lib/whatsapp")>()),
  resolverProvider: vi.fn(async () => canal),
  providerDaConexao: vi.fn(() => canal),
}))

import { processarCampanhasPendentes } from "@/lib/campanhas"
import { MOTIVO_CONTATO_DA_LOJA } from "@/lib/contato-da-loja"

const campanha: Linha = {
  id: "camp", workspace_id: "ws_a", status: "enviando", tipo_mensagem: "texto", conteudo: "Promoção da semana",
  arquivo_url: null, arquivo_nome: null, whatsapp_connection_id: null, agendada_para: null, created_at: "2026-11-06T10:00:00Z",
}
const destinatario = (id: string, contato: string, telefone: string): Linha => ({
  id, campaign_id: "camp", workspace_id: "ws_a", contact_id: contato, nome_snapshot: id,
  telefone_snapshot: telefone, status: "pendente", reservado_em: null,
})
const contato = (id: string, ws: string, telefone: string, origem: string | null = null): Linha => ({
  id, workspace_id: ws, phone_number: telefone, excluido_em: null, atendente: null, origem,
})
const conversa = (id: string, ws: string, contactId: string): Linha => ({ id, workspace_id: ws, contact_id: contactId })
const recebida = (id: string, ws: string, conversaId: string): Linha => ({ id, workspace_id: ws, conversation_id: conversaId, direction: "recebida" })

beforeEach(() => {
  textos.length = 0
  canal.enviarTexto.mockClear()
  tabelas = { campaigns: [{ ...campanha }], campaign_recipients: [], contacts: [], conversations: [], messages: [] }
})

describe("Auditoria run-2, pista 7 — campanha e contato da loja", () => {
  it("contato da loja que nunca escreveu: fica de fora, com o motivo no relatório", async () => {
    tabelas.contacts.push(contato("c_loja", "ws_a", "5511988887777", "loja"), contato("c_normal", "ws_a", "5511900000001"))
    tabelas.campaign_recipients.push(destinatario("r_loja", "c_loja", "5511988887777"), destinatario("r_normal", "c_normal", "5511900000001"))

    await processarCampanhasPendentes()

    expect(textos).toEqual(["5511900000001"])
    expect(tabelas.campaign_recipients.find((r) => r.id === "r_loja")).toMatchObject({ status: "excluido", motivo: MOTIVO_CONTATO_DA_LOJA })
    expect(tabelas.campaign_recipients.find((r) => r.id === "r_normal")).toMatchObject({ status: "enviado" })
  })

  it("contato da loja que escreveu pelo número sem o nove (outro contato): recebe", async () => {
    tabelas.contacts.push(contato("c_loja", "ws_a", "5511988887777", "loja"), contato("c_sem_nove", "ws_a", "551188887777"))
    tabelas.conversations.push(conversa("conv_1", "ws_a", "c_sem_nove"))
    tabelas.messages.push(recebida("m_1", "ws_a", "conv_1"))
    tabelas.campaign_recipients.push(destinatario("r_loja", "c_loja", "5511988887777"))

    await processarCampanhasPendentes()

    expect(textos).toEqual(["5511988887777"])
    expect(tabelas.campaign_recipients[0]).toMatchObject({ status: "enviado" })
  })

  it("só conta mensagem recebida, e na própria empresa", async () => {
    tabelas.contacts.push(
      contato("c_loja", "ws_a", "5511988887777", "loja"),
      // o mesmo telefone escreveu para OUTRA empresa
      contato("c_outra", "ws_b", "5511988887777")
    )
    tabelas.conversations.push(conversa("conv_a", "ws_a", "c_loja"), conversa("conv_b", "ws_b", "c_outra"))
    tabelas.messages.push(
      recebida("m_b", "ws_b", "conv_b"),
      // na empresa da campanha, só a mensagem que a empresa mandou
      { id: "m_a", workspace_id: "ws_a", conversation_id: "conv_a", direction: "enviada" }
    )
    tabelas.campaign_recipients.push(destinatario("r_loja", "c_loja", "5511988887777"))

    await processarCampanhasPendentes()

    expect(textos).toEqual([])
    expect(tabelas.campaign_recipients[0]).toMatchObject({ status: "excluido", motivo: MOTIVO_CONTATO_DA_LOJA })
  })
})
