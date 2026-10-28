// @vitest-environment node
// B46-01 — o banco de teste existe, é igual à produção e recebe migration sozinho.
// Lê o banco de teste do .env.teste.local e a produção do .env.local. Na produção, só lê.

import { createClient } from "@supabase/supabase-js"
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { spawnSync } from "node:child_process"
import { describe, it, expect, afterAll } from "vitest"
import { enderecoDoBanco, lerEnvProducao, lerEnvTeste, REF_PRODUCAO, rodarSupabase } from "../../supabase/banco-de-teste/comum.mjs"

const envTeste = lerEnvTeste()
const semSessao = { auth: { autoRefreshToken: false, persistSession: false } }
const testeAdmin = createClient(envTeste.NEXT_PUBLIC_SUPABASE_URL, envTeste.SUPABASE_SERVICE_ROLE_KEY, semSessao)
const testeAnon = createClient(envTeste.NEXT_PUBLIC_SUPABASE_URL, envTeste.NEXT_PUBLIC_SUPABASE_ANON_KEY, semSessao)
const envProducao = lerEnvProducao()
const producaoAdmin = createClient(envProducao.NEXT_PUBLIC_SUPABASE_URL, envProducao.SUPABASE_SERVICE_ROLE_KEY, semSessao)

const PASTA_MIGRATIONS = resolve(__dirname, "../../supabase/migrations")
const VERSAO_DE_PROVA = "99991231000000"

function executar(sql: string, onde: "teste" | "producao"): string {
  const alvo =
    onde === "teste" ? ["--db-url", enderecoDoBanco(envTeste)] : ["--linked", "--project-ref", REF_PRODUCAO]
  const r = rodarSupabase(["db", "query", ...alvo, "--output-format", "json", sql])
  if (r.status !== 0) throw new Error(`consulta no banco de ${onde} falhou: ${r.stdout}`)
  return r.stdout
}

function consultar(sql: string, onde: "teste" | "producao"): Record<string, unknown>[] {
  return JSON.parse(executar(sql, onde)).rows
}

function versoesNoBanco(onde: "teste" | "producao"): string[] {
  return consultar("select version from supabase_migrations.schema_migrations order by version", onde).map((l) =>
    String(l.version),
  )
}

describe("B46-01 — banco de teste no ar, igual à produção", () => {
  it("CA-B46-01: should ter no banco de teste todas as migrations da pasta, sem faltar nenhuma", () => {
    const naPasta = readdirSync(PASTA_MIGRATIONS)
      .filter((f) => f.endsWith(".sql"))
      .map((f) => f.split("_")[0])
      .sort()
    expect(versoesNoBanco("teste")).toEqual(naPasta)
  }, 120_000)

  it("CA-B46-02: should ter as mesmas pastas de arquivos da produção, com os mesmos limites", async () => {
    const resumo = async (c: typeof testeAdmin) => {
      const { data, error } = await c.storage.listBuckets()
      expect(error).toBeNull()
      return data!
        .map((b) => ({
          id: b.id,
          publica: b.public,
          limite: b.file_size_limit ?? null,
          tipos: [...(b.allowed_mime_types ?? [])].sort(),
        }))
        .sort((a, b) => a.id.localeCompare(b.id))
    }
    const naProducao = await resumo(producaoAdmin)
    expect(naProducao.length).toBeGreaterThan(0)
    expect(await resumo(testeAdmin)).toEqual(naProducao)
  })

  describe("login", () => {
    let usuarioId: string | undefined
    afterAll(async () => {
      if (usuarioId) await testeAdmin.auth.admin.deleteUser(usuarioId)
    })

    it("CA-B46-03: should entrar com e-mail e senha no banco de teste sem confirmação de e-mail", async () => {
      const email = `b46-login-${Date.now()}@example.com`
      const senha = `Senha-${Date.now()}-b46`
      // Mesmo caminho do cadastro e da tela de usuários: criado já confirmado.
      const { data, error } = await testeAdmin.auth.admin.createUser({ email, password: senha, email_confirm: true })
      expect(error).toBeNull()
      usuarioId = data.user!.id

      const login = await testeAnon.auth.signInWithPassword({ email, password: senha })
      expect(login.error).toBeNull()
      expect(login.data.session?.access_token).toBeTruthy()
    })
  })

  it("CA-B46-04: should não ter no banco de teste nenhuma empresa da produção", async () => {
    const ids = async (c: typeof testeAdmin) => {
      const { data, error } = await c.from("workspaces").select("id")
      expect(error).toBeNull()
      return new Set((data ?? []).map((w) => w.id as string))
    }
    const naProducao = await ids(producaoAdmin)
    expect(naProducao.size).toBeGreaterThan(0)
    const vindasDaProducao = [...(await ids(testeAdmin))].filter((id) => naProducao.has(id))
    expect(vindasDaProducao).toEqual([])
  })

  describe("migration só no banco de teste", () => {
    const pasta = mkdtempSync(join(tmpdir(), "b46-migrations-"))

    afterAll(() => {
      executar("drop table if exists public._b46_prova", "teste")
      executar(`delete from supabase_migrations.schema_migrations where version = '${VERSAO_DE_PROVA}'`, "teste")
      rmSync(pasta, { recursive: true, force: true })
    }, 60_000)

    it("CA-B46-14: should aplicar a migration nova no banco de teste e deixar a produção sem ela", async () => {
      const destino = join(pasta, "supabase", "migrations")
      mkdirSync(destino, { recursive: true })
      for (const f of readdirSync(PASTA_MIGRATIONS)) copyFileSync(join(PASTA_MIGRATIONS, f), join(destino, f))
      writeFileSync(join(destino, `${VERSAO_DE_PROVA}_b46_prova.sql`), "create table public._b46_prova (id int);\n")

      const r = spawnSync(
        process.execPath,
        [resolve(__dirname, "../../supabase/banco-de-teste/aplicar-migrations.mjs"), "--workdir", pasta],
        { encoding: "utf8", cwd: resolve(__dirname, "../..") },
      )
      expect(r.status).toBe(0)

      expect(versoesNoBanco("teste")).toContain(VERSAO_DE_PROVA)
      expect(consultar("select to_regclass('public._b46_prova') as tabela", "teste")[0].tabela).toBe("_b46_prova")

      expect(versoesNoBanco("producao")).not.toContain(VERSAO_DE_PROVA)
      const naProducao = await producaoAdmin.from("_b46_prova").select("id").limit(1)
      expect(naProducao.error?.code).toBe("PGRST205")
    }, 300_000)
  })
})
