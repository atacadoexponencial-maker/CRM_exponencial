// @vitest-environment node
// B19-02 — o usuário só edita o próprio nome (auditoria de 06/10/2026). Bate no
// Supabase real, pelo navegador simulado: client com a anon key e login do atacante.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { describe, it, expect, beforeAll, afterAll } from "vitest"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const ts = Date.now()
const SENHA = "senha-segura-123"
let empresa = "", outraEmpresa = ""
let atendente = "", colega = "", desativado = ""
let navegadorAtendente: SupabaseClient, navegadorDesativado: SupabaseClient

async function criarUsuario(sufixo: string, ws: string, role: string, status = "active") {
  const email = `b19-02-${sufixo}-${ts}@teste.com`
  const { data } = await service.auth.admin.createUser({ email, password: SENHA, email_confirm: true })
  const id = data.user!.id
  await service.from("profiles").insert({ id, workspace_id: ws, name: `Nome ${sufixo}`, role, status })
  const navegador = createClient(URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  await navegador.auth.signInWithPassword({ email, password: SENHA })
  return { id, navegador }
}

async function perfil(id: string) {
  const { data } = await service.from("profiles").select("name, role, workspace_id, status").eq("id", id).single()
  return data!
}

beforeAll(async () => {
  empresa = (await service.from("workspaces").insert({ name: `Perfil B19 ${ts}` }).select("id").single()).data!.id
  outraEmpresa = (await service.from("workspaces").insert({ name: `Outra B19 ${ts}` }).select("id").single()).data!.id
  ;({ id: atendente, navegador: navegadorAtendente } = await criarUsuario("atendente", empresa, "atendente"))
  ;({ id: colega } = await criarUsuario("colega", empresa, "atendente"))
  ;({ id: desativado, navegador: navegadorDesativado } = await criarUsuario("desativado", empresa, "atendente", "inactive"))
}, 60_000)

afterAll(async () => {
  for (const id of [atendente, colega, desativado]) {
    await service.from("profiles").delete().eq("id", id)
    await service.auth.admin.deleteUser(id)
  }
  await service.from("workspaces").delete().in("id", [empresa, outraEmpresa])
}, 60_000)

describe("B19-02 — Perfil só deixa o usuário editar o próprio nome", { timeout: 30_000 }, () => {
  it("should deixar o usuário trocar o próprio nome", async () => {
    const { error } = await navegadorAtendente.from("profiles").update({ name: "Nome Novo" }).eq("id", atendente)
    expect(error).toBeNull()
    expect((await perfil(atendente)).name).toBe("Nome Novo")
  })

  it("should reject o usuário mudar o próprio papel para Admin", async () => {
    const { error } = await navegadorAtendente.from("profiles").update({ role: "admin" }).eq("id", atendente)
    expect(error).not.toBeNull()
    expect((await perfil(atendente)).role).toBe("atendente")
  })

  it("should reject o usuário mudar a própria empresa", async () => {
    const { error } = await navegadorAtendente.from("profiles").update({ workspace_id: outraEmpresa }).eq("id", atendente)
    expect(error).not.toBeNull()
    expect((await perfil(atendente)).workspace_id).toBe(empresa)
  })

  it("should reject usuário desativado se reativar", async () => {
    const { error } = await navegadorDesativado.from("profiles").update({ status: "active" }).eq("id", desativado)
    expect(error).not.toBeNull()
    expect((await perfil(desativado)).status).toBe("inactive")
  })

  it("should reject nome e papel juntos sem mudar nem o nome", async () => {
    const antes = (await perfil(atendente)).name
    const { error } = await navegadorAtendente.from("profiles").update({ name: "Outro", role: "admin" }).eq("id", atendente)
    expect(error).not.toBeNull()
    expect(await perfil(atendente)).toMatchObject({ name: antes, role: "atendente" })
  })

  it("should not alterar o perfil de outra pessoa", async () => {
    await navegadorAtendente.from("profiles").update({ name: "Invadido" }).eq("id", colega)
    expect((await perfil(colega)).name).toBe("Nome colega")
  })
})
