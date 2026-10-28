// @vitest-environment node
// B46-04 — a rotina diária entra no banco de teste para o plano grátis não pausá-lo.

import { createClient } from "@supabase/supabase-js"
import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { describe, it, expect } from "vitest"
import { lerEnvProducao, lerEnvTeste } from "../../supabase/banco-de-teste/comum.mjs"

const RAIZ = resolve(__dirname, "../..")
const ROTINA = join(RAIZ, "supabase/banco-de-teste/manter-acordado.mjs")
const semSessao = { auth: { autoRefreshToken: false, persistSession: false } }
const envTeste = lerEnvTeste(RAIZ)
const envProducao = lerEnvProducao(RAIZ)
const teste = createClient(envTeste.NEXT_PUBLIC_SUPABASE_URL, envTeste.SUPABASE_SERVICE_ROLE_KEY, semSessao)
const producao = createClient(envProducao.NEXT_PUBLIC_SUPABASE_URL, envProducao.SUPABASE_SERVICE_ROLE_KEY, semSessao)

function rodarRotina(env: Record<string, string> = {}) {
  const r = spawnSync(process.execPath, [ROTINA], { cwd: RAIZ, encoding: "utf8", timeout: 60_000, env: { ...process.env, ...env } })
  return { status: r.status, saida: `${r.stdout}\n${r.stderr}` }
}

async function usuarioDaRotina(c: typeof teste) {
  const { data } = await c.auth.admin.listUsers({ perPage: 1000 })
  return data.users.find((u) => u.email === envTeste.BANCO_TESTE_ROTINA_EMAIL)
}

describe("B46-04 — banco de teste sempre acordado", () => {
  it("CA-B46-19: should registrar no banco de teste o acesso da rotina diária, e nada na produção", async () => {
    const inicio = Date.now()
    // As mesmas variáveis que o GitHub Actions passa
    const r = rodarRotina({
      BANCO_TESTE_URL: envTeste.NEXT_PUBLIC_SUPABASE_URL,
      BANCO_TESTE_ANON_KEY: envTeste.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      BANCO_TESTE_ROTINA_EMAIL: envTeste.BANCO_TESTE_ROTINA_EMAIL,
      BANCO_TESTE_ROTINA_SENHA: envTeste.BANCO_TESTE_ROTINA_SENHA,
    })
    expect(r.status).toBe(0)
    expect(r.saida).toContain("banco de teste acordado")

    const usuario = await usuarioDaRotina(teste)
    expect(usuario).toBeTruthy()
    expect(new Date(usuario!.last_sign_in_at!).getTime()).toBeGreaterThanOrEqual(inicio - 5_000)
    expect(await usuarioDaRotina(producao)).toBeUndefined()

    // O GitHub roda o mesmo comando todo dia, com os segredos do banco de teste
    const workflow = readFileSync(join(RAIZ, ".github/workflows/banco-de-teste-acordado.yml"), "utf8")
    expect(workflow).toMatch(/cron: "\d+ \d+ \* \* \*"/)
    expect(workflow).toContain("node supabase/banco-de-teste/manter-acordado.mjs")

    // Com o endereço da produção, a rotina não acessa nada
    const naProducao = rodarRotina({
      BANCO_TESTE_URL: envProducao.NEXT_PUBLIC_SUPABASE_URL,
      BANCO_TESTE_ANON_KEY: envProducao.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      BANCO_TESTE_ROTINA_EMAIL: envTeste.BANCO_TESTE_ROTINA_EMAIL,
      BANCO_TESTE_ROTINA_SENHA: envTeste.BANCO_TESTE_ROTINA_SENHA,
    })
    expect(naProducao.status).not.toBe(0)
    expect(naProducao.saida).toContain("a rotina só roda no banco de teste")
  }, 120_000)
})
