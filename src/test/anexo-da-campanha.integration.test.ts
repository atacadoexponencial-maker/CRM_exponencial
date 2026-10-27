// @vitest-environment node
// B44-06 — o anexo da campanha é sempre um arquivo enviado pela própria empresa,
// dos tipos que a campanha oferece (auditoria de 27/10/2026). Bate no Supabase real;
// o motor de campanhas é simulado, porque processaria as campanhas de produção.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest"

let clienteDaVez: SupabaseClient
vi.mock("@/integrations/supabase/server", () => ({ createClient: async () => clienteDaVez }))
vi.mock("@/lib/campanhas", () => ({ processarCampanhasPendentes: async () => 0 }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

import { confirmarCampanha, uploadArquivoCampanha, type DadosCampanha } from "@/app/(auth)/campanhas/actions"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const ts = Date.now()
const SENHA = "senha-segura-123"
const AVISO_DE_FORA = { erro: "Anexe o arquivo pela própria campanha" }
const AVISO_DE_TIPO = { erro: "Tipo de arquivo não aceito. Envie imagem JPG, PNG ou WebP, ou documento PDF, Word, Excel, PowerPoint ou TXT." }
// Cabeçalho de um PNG de 1x1: o bastante para o Storage aceitar a imagem.
const PNG = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0))
let empresaA = "", empresaB = "", gerenteA = "", contatoA = ""
const nomesDeCampanha: string[] = []

function dados(extra: Partial<DadosCampanha>): DadosCampanha {
  const nome = `[TESTE] B44-06 ${ts} ${nomesDeCampanha.length}`
  nomesDeCampanha.push(nome)
  return { nome, segmento: {}, tipoMensagem: "imagem", conteudo: "Oi!", arquivoUrl: null, arquivoNome: "foto.png", ...extra }
}
const amanha = () => new Date(Date.now() + 24 * 3600 * 1000).toISOString()
const arquivo = (conteudo: BlobPart, nome: string, tipo: string) => {
  const formulario = new FormData()
  formulario.append("arquivo", new File([conteudo], nome, { type: tipo }))
  return formulario
}
const arquivosDe = async (empresa: string) =>
  ((await service.storage.from("chat-attachments").list(`${empresa}/campanhas`)).data ?? []).map((a) => a.name)

beforeAll(async () => {
  empresaA = (await service.from("workspaces").insert({ name: `[TESTE] B44-06 A ${ts}` }).select("id").single()).data!.id
  empresaB = (await service.from("workspaces").insert({ name: `[TESTE] B44-06 B ${ts}` }).select("id").single()).data!.id
  const email = `b44-06-gerente-${ts}@teste.com`
  gerenteA = (await service.auth.admin.createUser({ email, password: SENHA, email_confirm: true })).data.user!.id
  await service.from("profiles").insert({ id: gerenteA, workspace_id: empresaA, name: "Gerente A", role: "gerente" })
  // Confirmar exige um número conectado na empresa.
  await service.from("whatsapp_connections").insert({ workspace_id: empresaA, canal: "gateway", status: "connected", phone_number: "5511933330000", instance_id: `inst_b44_06_${ts}`, instance_token: "token-a" })
  contatoA = (await service.from("contacts").insert({ workspace_id: empresaA, name: "Cliente A", phone_number: `55319${String(ts).slice(-8)}` }).select("id").single()).data!.id
  clienteDaVez = createClient(URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  await clienteDaVez.auth.signInWithPassword({ email, password: SENHA })
}, 60_000)

afterAll(async () => {
  const { data: campanhas } = await service.from("campaigns").select("id").eq("workspace_id", empresaA)
  for (const c of campanhas ?? []) await service.from("campaign_recipients").delete().eq("campaign_id", c.id)
  await service.from("campaigns").delete().eq("workspace_id", empresaA)
  const guardados = await arquivosDe(empresaA)
  if (guardados.length) await service.storage.from("chat-attachments").remove(guardados.map((n) => `${empresaA}/campanhas/${n}`))
  await service.from("contacts").delete().eq("id", contatoA)
  await service.from("whatsapp_connections").delete().eq("workspace_id", empresaA)
  await service.from("profiles").delete().eq("id", gerenteA)
  await service.auth.admin.deleteUser(gerenteA)
  await service.from("workspaces").delete().in("id", [empresaA, empresaB])
}, 60_000)

describe("B44-06 — Anexo da campanha só da própria empresa", { timeout: 30_000 }, () => {
  it("CA-B44-23: should recusar confirmar com arquivo que não veio da própria empresa", async () => {
    const pastaDeB = `${URL}/storage/v1/object/public/chat-attachments/${empresaB}/campanhas/foto.png`
    const pastaDeA = `${URL}/storage/v1/object/public/chat-attachments/${empresaA}/campanhas`
    for (const arquivoUrl of [
      "https://atacante.exemplo/foto.png",
      "http://169.254.169.254/latest/meta-data/",
      pastaDeB,
      `${pastaDeA}/../../${empresaB}/campanhas/foto.png`,
      `${pastaDeA}/%2e%2e%2f${empresaB}%2ffoto.png`,
    ]) {
      expect(await confirmarCampanha(null, dados({ arquivoUrl }), amanha()), arquivoUrl).toEqual(AVISO_DE_FORA)
    }
    const { data: confirmadas } = await service.from("campaigns").select("id").eq("workspace_id", empresaA).neq("status", "rascunho")
    expect(confirmadas).toEqual([])
  })

  it("CA-B44-24: should confirmar a campanha com a imagem anexada pela própria campanha", async () => {
    const anexado = await uploadArquivoCampanha(arquivo(PNG, "foto.png", "image/png"))
    expect(anexado.erro).toBeUndefined()

    const nome = dados({}).nome
    expect(await confirmarCampanha(null, { ...dados({ arquivoUrl: anexado.url! }), nome }, amanha())).toEqual({})

    const { data: campanha } = await service.from("campaigns").select("status, arquivo_url").eq("workspace_id", empresaA).eq("nome", nome).single()
    expect(campanha).toEqual({ status: "agendada", arquivo_url: anexado.url })
  })

  it("CA-B44-25: should aceitar só os tipos oferecidos, com extensão pelo tipo", async () => {
    const antes = await arquivosDe(empresaA)

    expect(await uploadArquivoCampanha(arquivo("<svg onload='alert(1)'/>", "foto.svg", "image/svg+xml"))).toEqual(AVISO_DE_TIPO)
    expect(await uploadArquivoCampanha(arquivo("<script>alert(1)</script>", "pagina.html", "text/html"))).toEqual(AVISO_DE_TIPO)
    expect(await arquivosDe(empresaA)).toEqual(antes)

    const aceito = await uploadArquivoCampanha(arquivo(PNG, "foto.html", "image/png"))
    expect(aceito.url).toMatch(/\.png$/)
    const nomeNoStorage = aceito.url!.split("/").pop()!
    const { data: guardado } = await service.storage.from("chat-attachments").list(`${empresaA}/campanhas`, { search: nomeNoStorage })
    expect(guardado?.[0]?.metadata?.mimetype).toBe("image/png")
  })
})
