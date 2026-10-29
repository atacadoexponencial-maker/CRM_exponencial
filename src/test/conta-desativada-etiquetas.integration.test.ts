// @vitest-environment node
// B50-01 — conta desativada, com a sessão ainda válida, não lê nem altera etiquetas e
// mensagens rápidas. As regras dessas tabelas descobrem a empresa lendo o próprio perfil,
// e conta inativa não lê o próprio perfil desde a B20-02 (20261006000007). No banco de teste.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { describe, it, expect, beforeAll, afterAll } from "vitest"

const URL_BANCO = process.env.NEXT_PUBLIC_SUPABASE_URL!
const servico = createClient(URL_BANCO, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const ts = Date.now()
const SENHA = "senha-segura-123"
let ws = ""
let etiqueta = "", rapida = ""
const usuarios: string[] = []

async function entrar(role: "atendente" | "admin"): Promise<{ id: string; navegador: SupabaseClient }> {
  const email = `b50-01-${role}-${ts}-${usuarios.length}@teste.com`
  const id = (await servico.auth.admin.createUser({ email, password: SENHA, email_confirm: true })).data.user!.id
  usuarios.push(id)
  await servico.from("profiles").insert({ id, workspace_id: ws, name: role, role })
  const navegador = createClient(URL_BANCO, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
  await navegador.auth.signInWithPassword({ email, password: SENHA })
  return { id, navegador }
}

const desativar = (id: string) => servico.from("profiles").update({ status: "inactive" }).eq("id", id)

async function oQueExiste() {
  const [{ data: etiquetas }, { data: rapidas }] = await Promise.all([
    servico.from("labels").select("id, name").eq("workspace_id", ws).order("name"),
    servico.from("quick_replies").select("id, title, content").eq("workspace_id", ws).order("title"),
  ])
  return { etiquetas, rapidas }
}

beforeAll(async () => {
  ws = (await servico.from("workspaces").insert({ name: `B50-01 ${ts}` }).select("id").single()).data!.id
  etiqueta = (await servico.from("labels").insert({ workspace_id: ws, name: "VIP", color: "#f00" }).select("id").single()).data!.id
  rapida = (await servico.from("quick_replies").insert({ workspace_id: ws, title: "Boas-vindas", content: "Olá!" }).select("id").single()).data!.id
}, 60_000)

afterAll(async () => {
  await servico.from("labels").delete().eq("workspace_id", ws)
  await servico.from("quick_replies").delete().eq("workspace_id", ws)
  await servico.from("profiles").delete().eq("workspace_id", ws)
  for (const id of usuarios) await servico.auth.admin.deleteUser(id)
  await servico.from("workspaces").delete().eq("id", ws)
}, 60_000)

describe("B50-01 — conta desativada sem etiquetas e mensagens rápidas", { timeout: 60_000 }, () => {
  it("CA-B50-05: should not deixar a conta desativada ler etiquetas e mensagens rápidas da empresa", async () => {
    // Existem de verdade: lista vazia não é por falta de dado
    const antes = await oQueExiste()
    expect(antes.etiquetas).toHaveLength(1)
    expect(antes.rapidas).toHaveLength(1)

    const { id, navegador } = await entrar("atendente")
    expect((await navegador.from("labels").select("id").eq("workspace_id", ws)).data).toHaveLength(1)

    await desativar(id)
    expect((await navegador.from("labels").select("id").eq("workspace_id", ws)).data ?? []).toEqual([])
    expect((await navegador.from("quick_replies").select("id").eq("workspace_id", ws)).data ?? []).toEqual([])
  })

  it("CA-B50-06: should not deixar o admin desativado criar, alterar nem apagar etiqueta e mensagem rápida", async () => {
    const antes = await oQueExiste()
    const { id, navegador } = await entrar("admin")
    await desativar(id)

    await navegador.from("labels").insert({ workspace_id: ws, name: "Intrusa", color: "#000" })
    await navegador.from("quick_replies").insert({ workspace_id: ws, title: "Intrusa", content: "x" })
    await navegador.from("labels").update({ name: "Mudada" }).eq("id", etiqueta)
    await navegador.from("quick_replies").update({ content: "Mudada" }).eq("id", rapida)
    await navegador.from("labels").delete().eq("id", etiqueta)
    await navegador.from("quick_replies").delete().eq("id", rapida)

    expect(await oQueExiste()).toEqual(antes)
  })

  it("CA-B50-07: should deixar a conta ativa ler, e o admin ativo criar, alterar e apagar, como antes", async () => {
    const { navegador: atendente } = await entrar("atendente")
    expect((await atendente.from("labels").select("id").eq("workspace_id", ws)).data).toHaveLength(1)
    expect((await atendente.from("quick_replies").select("id").eq("workspace_id", ws)).data).toHaveLength(1)

    const { navegador: admin } = await entrar("admin")
    const nova = (await admin.from("labels").insert({ workspace_id: ws, name: "Nova", color: "#0f0" }).select("id").single()).data!.id
    const novaRapida = (await admin.from("quick_replies").insert({ workspace_id: ws, title: "Nova", content: "Oi" }).select("id").single()).data!.id
    await admin.from("labels").update({ name: "Renomeada" }).eq("id", nova)
    await admin.from("quick_replies").update({ content: "Oi de novo" }).eq("id", novaRapida)
    const { data: depois } = await servico.from("labels").select("name").eq("id", nova).single()
    const { data: rapidaDepois } = await servico.from("quick_replies").select("content").eq("id", novaRapida).single()
    expect(depois!.name).toBe("Renomeada")
    expect(rapidaDepois!.content).toBe("Oi de novo")

    await admin.from("labels").delete().eq("id", nova)
    await admin.from("quick_replies").delete().eq("id", novaRapida)
    expect((await servico.from("labels").select("id").eq("id", nova)).data).toEqual([])
    expect((await servico.from("quick_replies").select("id").eq("id", novaRapida)).data).toEqual([])
  })
})
