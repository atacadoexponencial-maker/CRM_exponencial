// @vitest-environment node
// B49-02 — campanha e limpeza de arquivos com os anexos fechados. Banco em memória
// (padrão B20-03: o motor real processaria as campanhas "enviando" do banco inteiro),
// mas o armazenamento é o do banco de teste, para o link gerado ser baixado de verdade.

import { createClient } from "@supabase/supabase-js"
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest"

type Linha = Record<string, unknown>
let tabelas: Record<string, Linha[]>

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
    // "reservado_em.is.null,..." da reserva: o destinatário em memória nunca está reservado
    or: () => { filtros.push((l) => l.reservado_em == null); return elo },
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

const armazenamentoReal = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
}).storage

vi.mock("@/integrations/supabase/service", () => ({
  createServiceClient: () => ({ from: (t: string) => consulta(t), storage: armazenamentoReal }),
}))
vi.mock("@/lib/campos-personalizados-servidor", () => ({
  camposDaEmpresa: vi.fn().mockResolvedValue([]),
  valoresDosContatos: vi.fn().mockResolvedValue(new Map()),
}))

/** Canal de envio falso: guarda o link que receberia para baixar. */
const links: string[] = []
const canal = {
  canal: "gateway",
  enviarTexto: vi.fn(async () => ({ ok: true, mensagemId: "wamid-texto" })),
  enviarMidia: vi.fn(async (telefone: string, midia: { url: string }) => {
    links.push(midia.url)
    return { ok: true, mensagemId: `wamid-${telefone}` }
  }),
}
vi.mock("@/lib/whatsapp", async (original) => ({
  ...(await original<typeof import("@/lib/whatsapp")>()),
  resolverProvider: vi.fn(async () => canal),
  providerDaConexao: vi.fn(() => canal),
}))

import { MOTIVO_ANEXO_DE_FORA, processarCampanhasPendentes } from "@/lib/campanhas"
import { anexoDaEmpresa } from "@/lib/anexo-da-campanha"
import { BUCKET_ANEXOS } from "@/lib/anexos-do-chat"

const ts = Date.now()
const WS = `00000000-0000-4000-8000-${String(ts).slice(-12)}`
const CAMINHO = `${WS}/campanhas/${ts}-catalogo.png`
let enderecoGravado = ""

beforeAll(async () => {
  const { error } = await armazenamentoReal.from(BUCKET_ANEXOS).upload(CAMINHO, new Blob(["catalogo da campanha"], { type: "image/png" }), { contentType: "image/png" })
  if (error) throw new Error(error.message)
  enderecoGravado = armazenamentoReal.from(BUCKET_ANEXOS).getPublicUrl(CAMINHO).data.publicUrl
}, 60_000)

afterAll(async () => {
  await armazenamentoReal.from(BUCKET_ANEXOS).remove([CAMINHO])
}, 60_000)

const campanha = (id: string, extra: Linha = {}): Linha => ({
  id, workspace_id: WS, status: "enviando", tipo_mensagem: "imagem", conteudo: "Catálogo novo",
  arquivo_url: enderecoGravado, arquivo_nome: "catalogo.png", whatsapp_connection_id: null, agendada_para: null,
  // Criada há dois dias: o link de quando ela foi salva já teria vencido
  created_at: new Date(Date.now() - 2 * 24 * 3600_000).toISOString(), ...extra,
})
const destinatario = (id: string, contato: string): Linha => ({
  id, campaign_id: "camp", workspace_id: WS, contact_id: contato, nome_snapshot: `Cliente ${id}`,
  telefone_snapshot: "5511900000000", status: "pendente", reservado_em: null,
})

beforeEach(() => {
  links.length = 0
  canal.enviarMidia.mockClear()
  tabelas = {
    campaigns: [],
    campaign_recipients: [],
    contacts: [
      { id: "c1", workspace_id: WS, phone_number: "5511900000001", excluido_em: null, atendente: null },
      { id: "c2", workspace_id: WS, phone_number: "5511900000002", excluido_em: null, atendente: null },
    ],
  }
})

function payloadDoToken(link: string): { iat: number; exp: number } {
  const token = new URL(link).searchParams.get("token")!
  return JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString())
}

describe("B49-02 — campanha com os anexos fechados", { timeout: 60_000 }, () => {
  it("CA-B49-10: should mandar a cada destinatário um link gerado na hora, que baixa o anexo", async () => {
    tabelas.campaigns.push(campanha("camp"))
    tabelas.campaign_recipients.push(destinatario("r1", "c1"), destinatario("r2", "c2"))
    const antes = Math.floor(Date.now() / 1000) - 5

    await processarCampanhasPendentes()

    expect(links).toHaveLength(2)
    for (const link of links) {
      expect(link).not.toBe(enderecoGravado)
      expect(link).toContain(`/object/sign/${BUCKET_ANEXOS}/`)
      // Gerado no envio (e não na criação, dois dias antes), com a validade da fila do gateway
      const { iat, exp } = payloadDoToken(link)
      expect(iat).toBeGreaterThanOrEqual(antes)
      expect(exp - iat).toBe(30 * 24 * 3600)
      const resposta = await fetch(link)
      expect(await resposta.text()).toBe("catalogo da campanha")
    }
    // Pelo gateway, aceito na fila do número (B8-02)
    expect(tabelas.campaign_recipients.map((r) => r.status)).toEqual(["na_fila", "na_fila"])
  })

  it("CA-B49-12: should recusar e interromper anexo de outra empresa ou de fora da pasta, no endereço gravado ou num link assinado", async () => {
    const assinadoDaPropria = (await armazenamentoReal.from(BUCKET_ANEXOS).createSignedUrl(CAMINHO, 3600)).data!.signedUrl
    const deOutraEmpresa = enderecoGravado.replace(WS, "11111111-1111-4111-8111-111111111111")
    const foraDaPasta = enderecoGravado.replace("/campanhas/", "/recebidas/")

    // Salvar usa esta mesma conferência (campanhas/actions.ts)
    expect(anexoDaEmpresa(enderecoGravado, WS)).toBe(true)
    for (const url of [assinadoDaPropria, deOutraEmpresa, foraDaPasta]) expect(anexoDaEmpresa(url, WS)).toBe(false)

    tabelas.campaigns.push(
      campanha("camp_assinado", { arquivo_url: assinadoDaPropria }),
      campanha("camp_outra", { arquivo_url: deOutraEmpresa }),
      campanha("camp_fora", { arquivo_url: foraDaPasta }),
    )
    await processarCampanhasPendentes()

    expect(canal.enviarMidia).not.toHaveBeenCalled()
    for (const c of tabelas.campaigns) expect(c).toMatchObject({ status: "interrompida", interrompida_motivo: MOTIVO_ANEXO_DE_FORA })
  })
})
