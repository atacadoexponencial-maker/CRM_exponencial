// @vitest-environment node
// B53-10 — editar o contato grava "Dados editados" na timeline, com quem editou
// e os nomes dos campos que mudaram; salvar sem mudança não grava nada.
// Bate no Supabase de teste, numa empresa criada para o teste e apagada no fim.

import { createClient } from "@supabase/supabase-js"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

vi.mock("@/integrations/supabase/server", () => ({ createClient: vi.fn() }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { atualizarDadosContato, atualizarObservacoesContato, buscarDadosContato } from "@/app/(auth)/contatos/actions"
import { salvarCamposDoContato } from "@/app/(auth)/contatos/campos-personalizados"

const mockSsr = vi.mocked(createSsrClient)
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SENHA = "senha-test-123!"
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
const ts = Date.now()
let ws = "", marcelleId = "", campoId = ""
let n = 0

async function contato(cidade: string) {
  const { data } = await service
    .from("contacts")
    .insert({ workspace_id: ws, name: "Loja Santos", phone_number: `5513954${String(ts).slice(-5)}${n++}`, cidade, observacoes: "Cliente antiga" })
    .select("id")
    .single()
  return data!.id as string
}

const edicoes = async (contactId: string) =>
  (await service.from("contato_edicoes").select("campos, autor_id").eq("contact_id", contactId)).data ?? []

const eventosDaTimeline = async (contactId: string) =>
  ((await buscarDadosContato(contactId))?.timeline ?? []).filter((e) => e.tipo === "dados_editados")

beforeAll(async () => {
  ws = (await service.from("workspaces").insert({ name: `B53-10 ${ts}` }).select("id").single()).data!.id
  const email = `b53-10-marcelle-${ts}@teste.com`
  const { data } = await service.auth.admin.createUser({ email, password: SENHA, email_confirm: true })
  marcelleId = data.user!.id
  await service.from("profiles").insert({ id: marcelleId, workspace_id: ws, name: "Marcelle", role: "admin", status: "active" })
  const navegador = createClient(URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  await navegador.auth.signInWithPassword({ email, password: SENHA })
  mockSsr.mockResolvedValue(navegador as never)
  campoId = (await service.from("campos_personalizados").insert({ workspace_id: ws, nome: "Segmento", tipo: "texto" }).select("id").single()).data!.id
}, 120_000)

afterAll(async () => {
  await service.from("contato_edicoes").delete().eq("workspace_id", ws)
  await service.from("contato_campos").delete().eq("workspace_id", ws)
  await service.from("campos_personalizados").delete().eq("workspace_id", ws)
  await service.from("pipeline_cards").delete().eq("workspace_id", ws)
  await service.from("contacts").delete().eq("workspace_id", ws)
  await service.from("profiles").delete().eq("id", marcelleId)
  await service.auth.admin.deleteUser(marcelleId)
  await service.from("workspaces").delete().eq("id", ws)
}, 120_000)

describe("B53-10 — Dados editados na timeline", { timeout: 60_000 }, () => {
  it("CA-B53-22: should mostrar 'Dados editados' por Marcelle com 'Cidade, Tipo' quando ela muda cidade e tipo", async () => {
    const id = await contato("Santos")
    expect(await atualizarDadosContato(id, { nome: "Loja Santos", tipo: "lojista", cidade: "Campinas", uf: null, icp: null })).toEqual({})

    const eventos = await eventosDaTimeline(id)
    expect(eventos).toHaveLength(1)
    expect(eventos[0]).toMatchObject({ tipo: "dados_editados", responsavel: "Marcelle", descricao: "Cidade, Tipo" })
    // O banco guarda só os nomes dos campos, sem valores
    expect(await edicoes(id)).toEqual([{ campos: ["Cidade", "Tipo"], autor_id: marcelleId }])
  })

  it("CA-B53-22: should registrar também observações e campo personalizado, cada um com o nome dele", async () => {
    const id = await contato("Santos")
    expect(await atualizarObservacoesContato(id, "Prefere WhatsApp à tarde")).toEqual({})
    expect(await salvarCamposDoContato(id, { [campoId]: "Moda praia" })).toEqual({})

    const descricoes = (await eventosDaTimeline(id)).map((e) => e.descricao).sort()
    expect(descricoes).toEqual(["Observações", "Segmento"])
  })

  it("CA-B53-23: should não gravar evento quando a pessoa salva sem alterar nada", async () => {
    const id = await contato("Santos")
    // O contato já tem o valor do campo antes do Salvar sem mudança
    await service.from("contato_campos").insert({ contact_id: id, campo_id: campoId, workspace_id: ws, valor_texto: "Moda praia" })

    expect(await atualizarDadosContato(id, { nome: "Loja Santos", tipo: null, cidade: "Santos", uf: null, icp: null })).toEqual({})
    expect(await atualizarObservacoesContato(id, "Cliente antiga")).toEqual({})
    expect(await salvarCamposDoContato(id, { [campoId]: "Moda praia" })).toEqual({})

    expect(await edicoes(id)).toEqual([])
    expect(await eventosDaTimeline(id)).toEqual([])
  })
})
