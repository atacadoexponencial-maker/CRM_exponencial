// B54-06 — o motor de campanhas manda template pela API Oficial com os valores de cada
// destinatário, o arquivo do cabeçalho por link assinado de 1 hora, recusa da Meta com
// motivo em português, e número desconectado com o motivo próprio. Banco em memória
// (padrão do teste B47-01) e canal falso que guarda o que recebeu.

import { describe, it, expect, vi, beforeEach } from "vitest"
import type { TemplateEnvio } from "@/lib/whatsapp"

type Linha = Record<string, unknown>
let tabelas: Record<string, Linha[]>

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
    storage: { from: () => ({ createSignedUrl: async (c: string, s: number) => ({ data: { signedUrl: `https://assinado/${c}?validade=${s}` } }) }) },
  }),
}))
vi.mock("@/lib/campos-personalizados-servidor", () => ({
  camposDaEmpresa: vi.fn().mockResolvedValue([{ id: "cp-1", nome: "Cidade", tipo: "texto", opcoes: [] }]),
  valoresDosContatos: vi.fn().mockResolvedValue(new Map([["c_a1", { "cp-1": "Recife" }]])),
}))
vi.mock("@/lib/campos-personalizados", () => ({ formatarValor: (_c: unknown, v: unknown) => String(v) }))

const templates: Array<{ telefone: string; template: TemplateEnvio }> = []
let respostaDoCanal: (telefone: string) => { ok: true; mensagemId: string } | { ok: false; motivo: string } = (t) => ({ ok: true, mensagemId: `wamid-${t}` })
const canal = {
  canal: "meta",
  enviarTexto: vi.fn(async () => ({ ok: true, mensagemId: "wamid-texto" })),
  enviarMidia: vi.fn(async () => ({ ok: true, mensagemId: "wamid-midia" })),
  enviarTemplate: vi.fn(async (telefone: string, template: TemplateEnvio) => {
    templates.push({ telefone, template })
    return respostaDoCanal(telefone)
  }),
}
vi.mock("@/lib/whatsapp", async (original) => ({
  ...(await original<typeof import("@/lib/whatsapp")>()),
  resolverProvider: vi.fn(async () => canal),
  providerDaConexao: vi.fn(() => canal),
}))

import { processarCampanhasPendentes } from "@/lib/campanhas"
import { MOTIVO_NUMERO_DESCONECTADO } from "@/lib/whatsapp/motivo-da-falha"

const pastaDaEmpresa = (ws: string) =>
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/chat-attachments/${ws}/campanhas/`

const TEMPLATE = {
  id: "t-1", name: "oferta_cidade", language: "pt_BR", cabecalho: null as string | null,
  variaveis: {
    corpo: [
      { origem: "nome_contato", reserva: "cliente" },
      { origem: "campo:cidade", reserva: "sua cidade" },
      { origem: "fixo", fixo: "10%" },
    ],
    cabecalho: [],
    botoes: {},
  },
}

const campanha = (id: string, extra: Linha = {}): Linha => ({
  id, workspace_id: "ws_a", status: "enviando", tipo_mensagem: "template", conteudo: "",
  arquivo_url: null, arquivo_nome: null, whatsapp_connection_id: "num-oficial", agendada_para: null,
  created_at: "2026-10-30T10:00:00Z", template: TEMPLATE, ...extra,
})
const destinatario = (id: string, campanhaId: string, telefone: string, contato: string, nome: string | null): Linha => ({
  id, campaign_id: campanhaId, workspace_id: "ws_a", contact_id: contato, nome_snapshot: nome,
  telefone_snapshot: telefone, status: "pendente", reservado_em: null,
})

beforeEach(() => {
  templates.length = 0
  canal.enviarTemplate.mockClear()
  respostaDoCanal = (t) => ({ ok: true, mensagemId: `wamid-${t}` })
  tabelas = {
    campaigns: [],
    campaign_recipients: [],
    contacts: [
      { id: "c_a1", workspace_id: "ws_a", phone_number: "5511900000001", excluido_em: null, atendente: { name: "Ana" } },
      { id: "c_a2", workspace_id: "ws_a", phone_number: "5511900000002", excluido_em: null, atendente: null },
    ],
    whatsapp_connections: [
      { id: "num-oficial", workspace_id: "ws_a", canal: "meta", phone_number_id: "ph-1", access_token: "tk", instance_id: null, instance_token: null, status: "connected" },
    ],
  }
})

describe("B54-06 — envio da campanha por template", () => {
  it("CA-B54-24: should mandar o template pelo nome e idioma com os três valores de cada destinatário, usando a reserva onde o dado está vazio", async () => {
    tabelas.campaigns.push(campanha("camp"))
    tabelas.campaign_recipients.push(
      destinatario("r1", "camp", "5511900000001", "c_a1", "Maria Souza"),
      destinatario("r2", "camp", "5511900000002", "c_a2", null),
    )

    await processarCampanhasPendentes()

    expect(canal.enviarTexto).not.toHaveBeenCalled()
    expect(templates).toHaveLength(2)
    const deMaria = templates.find((t) => t.telefone === "5511900000001")!.template
    const semNome = templates.find((t) => t.telefone === "5511900000002")!.template
    expect(deMaria).toMatchObject({ nome: "oferta_cidade", idioma: "pt_BR", corpo: ["Maria Souza", "Recife", "10%"] })
    expect(semNome).toMatchObject({ nome: "oferta_cidade", idioma: "pt_BR", corpo: ["cliente", "sua cidade", "10%"] })
    expect(tabelas.campaign_recipients.map((r) => r.status)).toEqual(["enviado", "enviado"])
    expect(tabelas.campaigns[0].status).toBe("enviada")
  })

  it("CA-B54-25: should levar o arquivo do cabeçalho de imagem por um link assinado de 1 hora", async () => {
    tabelas.campaigns.push(campanha("camp", {
      template: { ...TEMPLATE, cabecalho: "imagem" },
      arquivo_url: `${pastaDaEmpresa("ws_a")}capa.jpg`, arquivo_nome: "capa.jpg",
    }))
    tabelas.campaign_recipients.push(destinatario("r1", "camp", "5511900000001", "c_a1", "Maria"))

    await processarCampanhasPendentes()

    expect(templates).toHaveLength(1)
    expect(templates[0].template.cabecalho).toEqual({ tipo: "imagem", link: "https://assinado/ws_a/campanhas/capa.jpg?validade=3600", nomeArquivo: "capa.jpg" })
    expect(tabelas.campaign_recipients[0].status).toBe("enviado")
  })

  it("CA-B54-26: should marcar como falhou com o motivo em português o destinatário que a Meta recusou, e seguir com os demais", async () => {
    tabelas.campaigns.push(campanha("camp"))
    tabelas.campaign_recipients.push(
      destinatario("r1", "camp", "5511900000001", "c_a1", "Maria"),
      destinatario("r2", "camp", "5511900000002", "c_a2", "João"),
    )
    respostaDoCanal = (t) =>
      t === "5511900000001"
        ? { ok: false, motivo: 'Meta API error: 400 - {"error":{"message":"(#132015) Template is paused","code":132015,"error_subcode":2494010}}' }
        : { ok: true, mensagemId: `wamid-${t}` }

    await processarCampanhasPendentes()

    const r1 = tabelas.campaign_recipients.find((r) => r.id === "r1")!
    const r2 = tabelas.campaign_recipients.find((r) => r.id === "r2")!
    expect(r1).toMatchObject({ status: "falhou", motivo: "A Meta recusou: o template está pausado" })
    expect(r2.status).toBe("enviado")
    expect(tabelas.campaigns[0].status).toBe("enviada")
  })

  it("CA-B54-27: should falhar os pendentes com 'O número da campanha não está mais conectado' quando o número escolhido desconectou", async () => {
    tabelas.whatsapp_connections[0].status = "disconnected"
    tabelas.campaigns.push(campanha("camp"))
    tabelas.campaign_recipients.push(
      destinatario("r1", "camp", "5511900000001", "c_a1", "Maria"),
      destinatario("r2", "camp", "5511900000002", "c_a2", "João"),
    )

    await processarCampanhasPendentes()

    expect(canal.enviarTemplate).not.toHaveBeenCalled()
    expect(MOTIVO_NUMERO_DESCONECTADO).toBe("O número da campanha não está mais conectado")
    for (const r of tabelas.campaign_recipients) expect(r).toMatchObject({ status: "falhou", motivo: MOTIVO_NUMERO_DESCONECTADO })
    expect(tabelas.campaigns[0].status).toBe("enviada")
  })
})
