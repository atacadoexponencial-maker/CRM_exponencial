// @vitest-environment node
// B21-03 — só o Admin gerencia times (auditoria de 06/10/2026, rodada 3). Bate no
// Supabase real, direto no banco, com a sessão de cada papel.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { describe, it, expect, beforeAll, afterAll } from "vitest"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const ts = Date.now()
const SENHA = "senha-segura-123"
let empresa = "", time = ""
const ids: Record<string, string> = {}
const navegadores: Record<string, SupabaseClient> = {}

beforeAll(async () => {
  empresa = (await service.from("workspaces").insert({ name: `Times B21 ${ts}` }).select("id").single()).data!.id
  for (const papel of ["admin", "gerente", "atendente"]) {
    const email = `b21-03-${papel}-${ts}@teste.com`
    const id = (await service.auth.admin.createUser({ email, password: SENHA, email_confirm: true })).data.user!.id
    await service.from("profiles").insert({ id, workspace_id: empresa, name: papel, role: papel })
    const nav = createClient(URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
    await nav.auth.signInWithPassword({ email, password: SENHA })
    ids[papel] = id
    navegadores[papel] = nav
  }
  time = (await service.from("teams").insert({ workspace_id: empresa, name: "Entrada" }).select("id").single()).data!.id
}, 60_000)

afterAll(async () => {
  await service.from("user_teams").delete().in("user_id", Object.values(ids))
  await service.from("teams").delete().eq("workspace_id", empresa)
  await service.from("profiles").delete().eq("workspace_id", empresa)
  for (const id of Object.values(ids)) await service.auth.admin.deleteUser(id)
  await service.from("workspaces").delete().eq("id", empresa)
}, 60_000)

describe("B21-03 — Só o Admin gerencia times", { timeout: 30_000 }, () => {
  for (const papel of ["gerente", "atendente"]) {
    it(`should not deixar ${papel} criar, renomear ou apagar time pelo banco`, async () => {
      const nav = navegadores[papel]
      const { error: criar } = await nav.from("teams").insert({ workspace_id: empresa, name: `Time do ${papel}` })
      expect(criar).not.toBeNull()
      await nav.from("teams").update({ name: "Renomeado" }).eq("id", time)
      await nav.from("teams").delete().eq("id", time)

      const { data } = await service.from("teams").select("id, name").eq("workspace_id", empresa)
      expect(data).toEqual([{ id: time, name: "Entrada" }])
    })

    it(`should not deixar ${papel} se pôr num time pelo banco`, async () => {
      const { error } = await navegadores[papel].from("user_teams").insert({ user_id: ids[papel], team_id: time })
      expect(error).not.toBeNull()
    })

    it(`should deixar ${papel} ver os times da empresa`, async () => {
      const { data } = await navegadores[papel].from("teams").select("id").eq("workspace_id", empresa)
      expect(data).toEqual([{ id: time }])
    })
  }

  it("should deixar o Admin criar, renomear, apagar time e definir membros", async () => {
    const nav = navegadores.admin
    const { data: novo, error } = await nav.from("teams").insert({ workspace_id: empresa, name: "Recompra" }).select("id").single()
    expect(error).toBeNull()
    expect((await nav.from("teams").update({ name: "Recompra VIP" }).eq("id", novo!.id)).error).toBeNull()
    expect((await nav.from("user_teams").insert({ user_id: ids.atendente, team_id: novo!.id })).error).toBeNull()
    await nav.from("user_teams").delete().eq("team_id", novo!.id)
    expect((await nav.from("teams").delete().eq("id", novo!.id)).error).toBeNull()

    const { data } = await service.from("teams").select("id").eq("id", novo!.id)
    expect(data).toHaveLength(0)
  })
})
