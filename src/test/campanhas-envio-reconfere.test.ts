// B47-01 — o envio de campanha confere de novo o anexo e os destinatários, porque Admin e
// Gerente conseguem gravar a campanha direto no banco, sem passar pela tela. Banco em
// memória (padrão do teste B20-03): o motor real processaria as campanhas "enviando" do
// banco inteiro.

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
  createServiceClient: () => ({
    from: (t: string) => consulta(t),
    // B49-02: o anexo sai com link assinado na hora do envio
    storage: { from: () => ({ createSignedUrl: async (c: string, s: number) => ({ data: { signedUrl: `https://assinado/${c}?validade=${s}` } }) }) },
  }),
}))
vi.mock("@/lib/campos-personalizados-servidor", () => ({
  camposDaEmpresa: vi.fn().mockResolvedValue([]),
  valoresDosContatos: vi.fn().mockResolvedValue(new Map()),
}))

/** Canal de envio falso: guarda para quem e o que foi mandado. */
const textos: string[] = []
const midias: Array<{ telefone: string; url: string }> = []
const canal = {
  canal: "meta",
  enviarTexto: vi.fn(async (telefone: string) => {
    textos.push(telefone)
    return { ok: true, mensagemId: `wamid-${telefone}` }
  }),
  enviarMidia: vi.fn(async (telefone: string, midia: { url: string }) => {
    midias.push({ telefone, url: midia.url })
    return { ok: true, mensagemId: `wamid-midia-${telefone}` }
  }),
}
vi.mock("@/lib/whatsapp", async (original) => ({
  ...(await original<typeof import("@/lib/whatsapp")>()),
  resolverProvider: vi.fn(async () => canal),
  providerDaConexao: vi.fn(() => canal),
}))

import { MOTIVO_ANEXO_DE_FORA, MOTIVO_FORA_DA_EMPRESA, processarCampanhasPendentes } from "@/lib/campanhas"

const pastaDaEmpresa = (ws: string) =>
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/chat-attachments/${ws}/campanhas/`

const campanha = (id: string, extra: Linha = {}): Linha => ({
  id, workspace_id: "ws_a", status: "enviando", tipo_mensagem: "texto", conteudo: "Oi, {{nome_contato|cliente}}",
  arquivo_url: null, arquivo_nome: null, whatsapp_connection_id: null, agendada_para: null,
  created_at: "2026-10-28T10:00:00Z", ...extra,
})
const destinatario = (id: string, campanhaId: string, telefone: string, contato: string | null): Linha => ({
  id, campaign_id: campanhaId, workspace_id: "ws_a", contact_id: contato, nome_snapshot: `Cliente ${id}`,
  telefone_snapshot: telefone, status: "pendente", reservado_em: null,
})
const contato = (id: string, ws: string, telefone: string): Linha => ({
  id, workspace_id: ws, phone_number: telefone, excluido_em: null, atendente: null,
})

beforeEach(() => {
  textos.length = 0
  midias.length = 0
  canal.enviarTexto.mockClear()
  canal.enviarMidia.mockClear()
  tabelas = {
    campaigns: [],
    campaign_recipients: [],
    contacts: [contato("c_a1", "ws_a", "5511900000001"), contato("c_a2", "ws_a", "5511900000002"), contato("c_b1", "ws_b", "5511900000099")],
  }
})

describe("B47-01 — envio de campanha confere anexo e destinatários", () => {
  it("CA-B47-01: should interromper sem enviar a campanha com anexo de fora gravado direto no banco", async () => {
    tabelas.campaigns.push(
      campanha("camp_fora", { tipo_mensagem: "imagem", arquivo_url: "http://127.0.0.1:6379/info", arquivo_nome: "x.png" }),
      campanha("camp_outra_empresa", { tipo_mensagem: "imagem", arquivo_url: `${pastaDaEmpresa("ws_b")}foto.png`, arquivo_nome: "foto.png" }),
    )
    tabelas.campaign_recipients.push(
      destinatario("r1", "camp_fora", "5511900000001", "c_a1"),
      destinatario("r2", "camp_outra_empresa", "5511900000002", "c_a2"),
    )

    await processarCampanhasPendentes()

    expect(canal.enviarTexto).not.toHaveBeenCalled()
    expect(canal.enviarMidia).not.toHaveBeenCalled()
    for (const id of ["camp_fora", "camp_outra_empresa"]) {
      expect(tabelas.campaigns.find((c) => c.id === id)).toMatchObject({ status: "interrompida", interrompida_motivo: MOTIVO_ANEXO_DE_FORA })
    }
    expect(tabelas.campaign_recipients.every((r) => r.status === "pendente")).toBe(true)
  })

  it("CA-B47-02: should excluir sem enviar o destinatário que aponta para contato de outra empresa", async () => {
    tabelas.campaigns.push(campanha("camp"))
    tabelas.campaign_recipients.push(
      destinatario("r_intruso", "camp", "5511900000099", "c_b1"),
      destinatario("r_certo", "camp", "5511900000001", "c_a1"),
    )

    await processarCampanhasPendentes()

    expect(textos).toEqual(["5511900000001"])
    expect(tabelas.campaign_recipients.find((r) => r.id === "r_intruso")).toMatchObject({ status: "excluido", motivo: MOTIVO_FORA_DA_EMPRESA })
    expect(tabelas.campaign_recipients.find((r) => r.id === "r_certo")).toMatchObject({ status: "enviado" })
  })

  it("CA-B47-03: should mandar para o telefone atual do contato, e nunca para o guardado na campanha", async () => {
    tabelas.campaigns.push(campanha("camp"))
    // Guardado com um número inventado; o contato tem outro
    tabelas.campaign_recipients.push(destinatario("r1", "camp", "5599988887777", "c_a1"))

    await processarCampanhasPendentes()

    expect(textos).toEqual(["5511900000001"])
    expect(textos).not.toContain("5599988887777")
    expect(tabelas.campaign_recipients[0]).toMatchObject({ status: "enviado", telefone_snapshot: "5511900000001" })
  })

  it("CA-B47-04: should mandar a campanha feita pela tela, com o anexo da empresa, para todos", async () => {
    const anexo = `${pastaDaEmpresa("ws_a")}1793190000000-catalogo.png`
    tabelas.campaigns.push(campanha("camp", { tipo_mensagem: "imagem", arquivo_url: anexo, arquivo_nome: "catalogo.png" }))
    tabelas.campaign_recipients.push(
      destinatario("r1", "camp", "5511900000001", "c_a1"),
      destinatario("r2", "camp", "5511900000002", "c_a2"),
    )

    await processarCampanhasPendentes()

    const link = "https://assinado/ws_a/campanhas/1793190000000-catalogo.png?validade=3600"
    expect(midias).toEqual([
      { telefone: "5511900000001", url: link },
      { telefone: "5511900000002", url: link },
    ])
    expect(tabelas.campaign_recipients.every((r) => r.status === "enviado")).toBe(true)
    expect(tabelas.campaigns[0]).toMatchObject({ status: "enviada" })
  })
})
