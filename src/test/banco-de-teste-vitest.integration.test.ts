// @vitest-environment node
// B46-02 — o Vitest roda no banco de teste e se recusa a rodar na produção.
// Os critérios da trava chamam um Vitest filho com outras variáveis do Supabase.

import { createClient } from "@supabase/supabase-js"
import { spawnSync } from "node:child_process"
import { createRequire } from "node:module"
import { dirname, join, resolve } from "node:path"
import { describe, it, expect, afterAll } from "vitest"
import { lerEnvProducao, lerEnvTeste } from "../../supabase/banco-de-teste/comum.mjs"

const RAIZ = resolve(__dirname, "../..")
const semSessao = { auth: { autoRefreshToken: false, persistSession: false } }
const envTeste = lerEnvTeste(RAIZ)
const envProducao = lerEnvProducao(RAIZ)
const testeAdmin = createClient(envTeste.NEXT_PUBLIC_SUPABASE_URL, envTeste.SUPABASE_SERVICE_ROLE_KEY, semSessao)
const producaoAdmin = createClient(envProducao.NEXT_PUBLIC_SUPABASE_URL, envProducao.SUPABASE_SERVICE_ROLE_KEY, semSessao)

const VITEST = join(dirname(createRequire(__filename).resolve("vitest/package.json")), "vitest.mjs")

function vitestFilho(argumentos: string[], banco: Record<string, string> = {}, tempo = 120_000) {
  const r = spawnSync(process.execPath, [VITEST, "run", ...argumentos], {
    cwd: RAIZ,
    encoding: "utf8",
    timeout: tempo,
    env: { ...process.env, ...banco, FORCE_COLOR: "0" },
  })
  return { status: r.status, saida: `${r.stdout}\n${r.stderr}` }
}

// Um arquivo qualquer: a trava age antes de coletar os testes.
const ARQUIVO_QUALQUER = "src/test/porteiro-rapido.test.ts"

describe("B46-02 — testes de integração no banco de teste", () => {
  describe("gravação", () => {
    let usuarioId: string | undefined
    afterAll(async () => {
      if (usuarioId) await testeAdmin.auth.admin.deleteUser(usuarioId)
    })

    it("CA-B46-05: should gravar no banco de teste o que o teste cria, e nada na produção", async () => {
      // O cliente montado como os testes montam: a partir do process.env.
      const doVitest = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, semSessao)
      const { data, error } = await doVitest.auth.admin.createUser({
        email: `b46-gravacao-${Date.now()}@example.com`,
        password: `Senha-${Date.now()}-b46`,
        email_confirm: true,
      })
      expect(error).toBeNull()
      usuarioId = data.user!.id

      const noTeste = await testeAdmin.auth.admin.getUserById(usuarioId)
      expect(noTeste.data.user?.id).toBe(usuarioId)

      const naProducao = await producaoAdmin.auth.admin.getUserById(usuarioId)
      expect(naProducao.data.user).toBeNull()
    })
  })

  it("CA-B46-06: should recusar rodar os testes com o banco da produção, sem rodar nenhum", () => {
    const r = vitestFilho([ARQUIVO_QUALQUER], {
      NEXT_PUBLIC_SUPABASE_URL: envProducao.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: envProducao.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: envProducao.SUPABASE_SERVICE_ROLE_KEY,
    })
    expect(r.status).not.toBe(0)
    expect(r.saida).toContain("os testes de integração só rodam no banco de teste")
    expect(r.saida).not.toMatch(/Tests\s+\d+ passed/)
  }, 120_000)

  it("CA-B46-08: should parar com um aviso só quando o banco de teste não responde", () => {
    const r = vitestFilho([ARQUIVO_QUALQUER], {
      NEXT_PUBLIC_SUPABASE_URL: "https://bancoquenaoexiste000.supabase.co",
    })
    expect(r.status).not.toBe(0)
    expect(r.saida).toContain("o banco de teste não respondeu: confira se ele está pausado no painel do Supabase")
    expect(r.saida).not.toMatch(/Tests\s+\d+ (passed|failed)/)
  }, 120_000)

  it("CA-B46-07: should passar a suíte de integração inteira no banco de teste", () => {
    // Um arquivo por vez: todos juntos estouram o limite de login do Supabase, em
    // qualquer banco. Fora os desta série, para o teste não chamar a si mesmo.
    const r = vitestFilho(
      ["integration.test", "--no-file-parallelism", "--exclude", "src/test/banco-de-teste*", "--exclude", "e2e/**", "--exclude", "**/node_modules/**"],
      {},
      2_700_000,
    )
    const linhas = r.saida.split("\n")
    // Quando falha, a mensagem do teste já diz quais arquivos e testes.
    expect(linhas.filter((l) => /^\s*FAIL\s/.test(l))).toEqual([])
    expect(linhas.find((l) => /^\s*Tests\s/.test(l))).toMatch(/^\s*Tests\s+\d+ passed/)
    expect(r.status).toBe(0)
  }, 2_800_000)
})
