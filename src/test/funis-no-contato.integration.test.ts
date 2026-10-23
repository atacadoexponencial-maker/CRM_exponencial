// @vitest-environment node
// B41-03 — os funis da empresa no contato: ficha do chat, perfil, histórico, lixeira e
// classificação. Bate no Supabase real.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

vi.mock("@/integrations/supabase/server", () => ({ createClient: vi.fn() }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/whatsapp/realtime", () => ({ transmitirContatoExcluido: vi.fn(async () => {}) }))

import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { criarFunil } from "@/app/(auth)/configuracoes/funis/actions"
import { adicionarContatoAoFunil, listarCardsDoFunil, listarCardsEntrada, listarCardsRecompra, moverCard, removerCardDoFunil } from "@/app/(auth)/pipeline/actions"
import { buscarDadosContato } from "@/app/(auth)/contatos/actions"
import { buscarInfoContato } from "@/app/(auth)/chat/actions"
import { excluirContato, resumoExclusaoContato, restaurarContato } from "@/app/(auth)/contatos/lixeira/actions"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SENHA = "senha-test-123!"
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
const ts = Date.now()

let ws = "", admin = "", contato = "", conversa = ""
let navegador: SupabaseClient
const funis: Record<string, { id: string; etapas: Array<{ id: string; nome: string }> }> = {}

async function novoFunil(nome: string, etapas: string[]) {
  const r = await criarFunil(nome, etapas.map((n) => ({ nome: n })))
  expect(r.erro).toBeUndefined()
  const { data } = await service.from("funil_etapas").select("id, nome, ordem").eq("funil_id", r.id!)
  funis[nome] = { id: r.id!, etapas: [...data!].sort((a, b) => a.ordem - b.ordem) }
}

beforeAll(async () => {
  ws = (await service.from("workspaces").insert({ name: `[TESTE] B41-03 ${ts}` }).select("id").single()).data!.id
  const email = `b41-03-admin-${ts}@funis-test.com`
  admin = (await service.auth.admin.createUser({ email, password: SENHA, email_confirm: true })).data.user!.id
  await service.from("profiles").insert({ id: admin, workspace_id: ws, name: "Admin B41-03", role: "admin", status: "active" })
  navegador = createClient(URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  await navegador.auth.signInWithPassword({ email, password: SENHA })
  vi.mocked(createSsrClient).mockResolvedValue(navegador as never)

  contato = (await service.from("contacts").insert({ workspace_id: ws, name: "Loja Março", phone_number: `55419${String(ts).slice(-7)}` }).select("id").single()).data!.id
  await service.from("pipeline_cards").insert({ workspace_id: ws, contact_id: contato, funil: "entrada", etapa: "sondagem" })
  conversa = (await service.from("conversations").insert({ workspace_id: ws, contact_id: contato, assigned_to: admin, status: "em_atendimento" }).select("id").single()).data!.id

  await novoFunil("Feira de Março", ["Convidado", "Confirmou"])
  await novoFunil("Lançamento", ["Avisado"])
  expect((await adicionarContatoAoFunil(funis["Feira de Março"].id, contato)).erro).toBeUndefined()
  const { data: card } = await service.from("pipeline_cards").select("id").eq("contact_id", contato).eq("funil", funis["Feira de Março"].id).single()
  await moverCard(card!.id, funis["Feira de Março"].etapas[1].id)
}, 120_000)

afterAll(async () => {
  await service.from("pipeline_cards").delete().eq("workspace_id", ws)
  await service.from("funis").delete().eq("workspace_id", ws)
  await service.from("conversations").delete().eq("workspace_id", ws)
  await service.from("contacts").delete().eq("workspace_id", ws)
  await service.from("profiles").delete().eq("workspace_id", ws)
  await service.auth.admin.deleteUser(admin)
  await service.from("workspaces").delete().eq("id", ws)
}, 120_000)

describe("B41-03 — Funis da empresa no contato", { timeout: 60_000 }, () => {
  it("CA-B41-25: should mostrar na ficha do chat e no perfil o funil novo com a etapa, e o link do quadro", async () => {
    const info = await buscarInfoContato(conversa)
    expect(info.cadastro.funis).toEqual([
      { funil: "entrada", etapa: "Sondagem" },
      { funil: funis["Feira de Março"].id, etapa: "Confirmou", nome: "Feira de Março" },
    ])

    const perfil = await buscarDadosContato(contato)
    expect(perfil!.cards).toHaveLength(2)
    expect(perfil!.cards).toEqual(expect.arrayContaining([
      { funil: "entrada", etapaLabel: "Sondagem", href: "/pipeline" },
      { funil: funis["Feira de Março"].id, etapaLabel: "Confirmou", nome: "Feira de Março", href: `/pipeline/funil/${funis["Feira de Março"].id}` },
    ]))
  })

  it("CA-B41-26: should citar o funil novo e as etapas dele no histórico do contato", async () => {
    const perfil = await buscarDadosContato(contato)
    const descricoes = perfil!.timeline.map((e) => e.descricao)
    expect(descricoes).toContain("Card criado no funil Feira de Março — etapa: Convidado")
    expect(descricoes).toContain("Convidado → Confirmou")
  })

  it("CA-B41-27: should levar os 3 cards para a lixeira com o contato e trazê-los de volta ao restaurar", async () => {
    expect((await adicionarContatoAoFunil(funis["Lançamento"].id, contato)).erro).toBeUndefined()

    const resumo = await resumoExclusaoContato(contato)
    if ("erro" in resumo) throw new Error(resumo.erro)
    expect(resumo.resumo.funis).toHaveLength(3)
    expect(resumo.resumo.funis[0]).toBe("entrada")
    expect(resumo.resumo.funis).toEqual(expect.arrayContaining(["entrada", funis["Feira de Março"].id, funis["Lançamento"].id]))
    expect(resumo.resumo.nomesDosFunis).toMatchObject({ [funis["Feira de Março"].id]: "Feira de Março", [funis["Lançamento"].id]: "Lançamento" })

    expect(await excluirContato(contato)).toEqual({ ok: true })
    expect((await listarCardsEntrada()).map((c) => c.contactId)).not.toContain(contato)
    expect(await listarCardsDoFunil(funis["Feira de Março"].id)).toEqual([])
    expect(await listarCardsDoFunil(funis["Lançamento"].id)).toEqual([])

    expect(await restaurarContato(contato)).toEqual({ ok: true })
    expect((await listarCardsEntrada()).find((c) => c.contactId === contato)!.etapa).toBe("sondagem")
    expect((await listarCardsDoFunil(funis["Feira de Março"].id)).map((c) => c.etapa)).toEqual([funis["Feira de Março"].etapas[1].id])
    expect((await listarCardsDoFunil(funis["Lançamento"].id)).map((c) => c.etapa)).toEqual([funis["Lançamento"].etapas[0].id])
  })

  it("CA-B41-28: should manter a classificação do contato ao entrar, mudar e sair do funil novo", async () => {
    const cliente = (await service.from("contacts").insert({ workspace_id: ws, name: "Cliente Ativo", phone_number: `55429${String(ts).slice(-7)}` }).select("id").single()).data!.id
    await service.from("pipeline_cards").insert({ workspace_id: ws, contact_id: cliente, funil: "recompra", etapa: "ativos" })
    const classificacao = async () => (await service.from("contacts").select("classificacao").eq("id", cliente).single()).data!.classificacao
    expect(await classificacao()).toBe("ativo")

    const feira = funis["Feira de Março"]
    expect((await adicionarContatoAoFunil(feira.id, cliente)).erro).toBeUndefined()
    expect(await classificacao()).toBe("ativo")
    const { data: card } = await service.from("pipeline_cards").select("id").eq("contact_id", cliente).eq("funil", feira.id).single()
    await moverCard(card!.id, feira.etapas[1].id)
    expect(await classificacao()).toBe("ativo")
    expect((await removerCardDoFunil(card!.id)).erro).toBeUndefined()
    expect(await classificacao()).toBe("ativo")
    expect((await listarCardsRecompra()).find((c) => c.contactId === cliente)!.etapa).toBe("ativos")
  })
})
