// @vitest-environment node
// B40-02 — o cadastro do contato não guarda mais nicho: no banco de verdade, a
// coluna não existe, a busca de contatos devolve as linhas sem ela e recusa
// condição de nicho, e os tipos gerados do banco não a citam.

import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const SENHA = "senha-test-123!"

const service = createClient(URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

const ts = Date.now()
let workspaceId = ""
let userId = ""
let logado: SupabaseClient

beforeAll(async () => {
  const { data: ws } = await service.from("workspaces").insert({ name: `[TESTE] B40 ${ts}` }).select().single()
  workspaceId = ws!.id
  const email = `admin-${ts}@remover-nicho-test.com`
  const { data: u } = await service.auth.admin.createUser({ email, password: SENHA, email_confirm: true })
  userId = u.user!.id
  await service.from("profiles").insert({ id: userId, workspace_id: workspaceId, name: "Admin B40", role: "admin", status: "active" })
  await service.from("contacts").insert({ workspace_id: workspaceId, phone_number: `55119${String(ts).slice(-8)}`, name: "Loja B40", cidade: "Recife" })

  logado = createClient(URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  await logado.auth.signInWithPassword({ email, password: SENHA })
})

afterAll(async () => {
  await service.from("contacts").delete().eq("workspace_id", workspaceId)
  await service.from("profiles").delete().eq("id", userId)
  await service.auth.admin.deleteUser(userId)
  await service.from("workspaces").delete().eq("id", workspaceId)
})

describe("B40-02 — nicho fora do banco", () => {
  it("CA-B40-14: should não guardar mais nicho no cadastro, com a busca de contatos funcionando sem ele", async () => {
    // A coluna não existe mais.
    const { error } = await service.from("contacts").select("nicho").limit(1)
    expect(error?.code).toBe("42703")

    // A busca de contatos continua devolvendo o contato, sem nicho.
    const { data: linhas, error: erroBusca } = await logado.rpc("filtrar_contatos", {
      p_filtro: { juncao: "e", grupos: [{ juncao: "e", condicoes: [{ campo: "cidade", comparacao: "igual", valores: ["Recife"] }] }] },
      p_rapidos: [],
    })
    expect(erroBusca).toBeNull()
    expect((linhas as Array<Record<string, unknown>>).map((l) => l.name)).toEqual(["Loja B40"])
    expect(Object.keys((linhas as Array<Record<string, unknown>>)[0])).not.toContain("nicho")

    // E recusa condição de nicho como campo desconhecido.
    const { error: erroNicho } = await logado.rpc("filtrar_contatos", {
      p_filtro: { juncao: "e", grupos: [{ juncao: "e", condicoes: [{ campo: "nicho", comparacao: "e", valores: ["Moda"] }] }] },
      p_rapidos: [],
    })
    expect(erroNicho?.message).toContain("Campo de filtro desconhecido: nicho")

    // Os tipos gerados do banco não citam nicho.
    const tipos = readFileSync(resolve(__dirname, "../integrations/supabase/types.ts"), "utf8")
    expect(tipos).not.toMatch(/\bnicho\b/)
  })
})
