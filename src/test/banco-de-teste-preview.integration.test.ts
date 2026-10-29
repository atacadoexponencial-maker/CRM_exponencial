// @vitest-environment node
// B46-03 — o preview e os roteiros de tela usam o banco de teste; os roteiros de
// envio, só a produção. Os comandos de e2e/preview rodam como processos filhos.

import { createClient } from "@supabase/supabase-js"
import { spawnSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { createRequire } from "node:module"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { lerEnvProducao, lerEnvTeste } from "../../supabase/banco-de-teste/comum.mjs"

const RAIZ = resolve(__dirname, "../..")
const comum = createRequire(__filename)("../../e2e/preview/comum.cjs")
const semSessao = { auth: { autoRefreshToken: false, persistSession: false } }
const envTeste = lerEnvTeste(RAIZ)
const envProducao = lerEnvProducao(RAIZ)
const teste = createClient(envTeste.NEXT_PUBLIC_SUPABASE_URL, envTeste.SUPABASE_SERVICE_ROLE_KEY, semSessao)
const producao = createClient(envProducao.NEXT_PUBLIC_SUPABASE_URL, envProducao.SUPABASE_SERVICE_ROLE_KEY, semSessao)
const WS_TESTE = envTeste.B11_TESTE_WORKSPACE_ID
const WS_PRODUCAO = envProducao.B11_TESTE_WORKSPACE_ID

function rodar(script: string, argumentos: string[] = [], env: Record<string, string> = {}, tempo = 300_000) {
  const r = spawnSync(process.execPath, [join(RAIZ, "e2e/preview", script), ...argumentos], {
    cwd: RAIZ,
    encoding: "utf8",
    timeout: tempo,
    env: { ...process.env, ...env },
  })
  return { status: r.status, saida: `${r.stdout}\n${r.stderr}` }
}

// O preview do último commit enviado deste branch, publicado depois da troca na Vercel.
let preview = ""
beforeAll(() => {
  const r = rodar("endereco-preview.cjs", ["@{upstream}"], {}, 480_000)
  preview = r.saida.match(/^success (\S+)/m)?.[1] ?? ""
}, 500_000)

describe("B46-03 — preview e roteiros no banco de teste", () => {
  describe("etiqueta pelo preview", () => {
    const nome = `B46 preview ${Date.now()}`
    afterAll(async () => {
      await teste.from("labels").delete().eq("workspace_id", WS_TESTE).eq("name", nome)
    })

    it("CA-B46-09: should gravar no banco de teste, e não na produção, o que se faz no preview", async () => {
      expect(preview).toMatch(/^https:\/\//)
      const { browser, page } = await comum.abrirPreview(preview)
      try {
        await page.goto(`${preview}/configuracoes/etiquetas`, { waitUntil: "networkidle" })
        await page.getByRole("button", { name: "Nova etiqueta" }).click()
        await page.locator("#novo-nome-etiqueta").fill(nome)
        await page.getByRole("dialog").getByRole("button", { name: /^Cor / }).first().click()
        await page.getByRole("dialog").getByRole("button", { name: "Salvar" }).click()
        await page.getByRole("dialog").waitFor({ state: "hidden", timeout: 30_000 })
      } finally {
        await browser.close()
      }

      const noTeste = await teste.from("labels").select("id").eq("workspace_id", WS_TESTE).eq("name", nome)
      expect(noTeste.data).toHaveLength(1)
      const naProducao = await producao.from("labels").select("id").eq("name", nome)
      expect(naProducao.data).toEqual([])
    }, 180_000)
  })

  it("CA-B46-11: should passar o roteiro dos menus no preview com o banco de teste", () => {
    expect(preview).toMatch(/^https:\/\//)
    expect(rodar("resetar-empresa-teste.cjs").status).toBe(0)
    const r = rodar("roteiro-menus.cjs", [preview])
    const verificacoes = r.saida.split("\n").filter((l) => /^(OK|FALHOU)\s/.test(l))
    expect(verificacoes.length).toBeGreaterThan(0)
    expect(verificacoes.filter((l) => l.startsWith("FALHOU"))).toEqual([])
    expect(r.status).toBe(0)
  }, 300_000)

  describe("criar a empresa de teste", () => {
    const pasta = mkdtempSync(join(tmpdir(), "b46-empresa-"))
    const arquivo = join(pasta, ".env.teste.local")
    let ws: string | undefined
    let admin: string | undefined

    afterAll(async () => {
      if (ws) {
        const { data: conversas } = await teste.from("conversations").select("id").eq("workspace_id", ws)
        await teste.from("conversation_labels").delete().in("conversation_id", (conversas ?? []).map((c) => c.id))
        for (const tabela of ["conversations", "pipeline_cards", "contacts", "labels"]) {
          await teste.from(tabela).delete().eq("workspace_id", ws)
        }
      }
      if (admin) await teste.auth.admin.deleteUser(admin)
      if (ws) {
        const { data: times } = await teste.from("teams").select("id").eq("workspace_id", ws)
        await teste.from("user_teams").delete().in("team_id", (times ?? []).map((t) => t.id))
        await teste.from("teams").delete().eq("workspace_id", ws)
        await teste.from("workspaces").delete().eq("id", ws)
      }
      rmSync(pasta, { recursive: true, force: true })
    }, 60_000)

    it("CA-B46-12: should criar a empresa de teste no banco de teste com os dados de partida e gravar o login", async () => {
      // O arquivo do banco de teste sem a empresa: só o Supabase dele.
      const original = readFileSync(join(RAIZ, ".env.teste.local"), "utf8")
      writeFileSync(arquivo, original.split(/\r?\n/).filter((l) => !l.startsWith("B11_TESTE_")).join("\n"))

      const r = rodar("criar-empresa-teste.cjs", [], { ARQUIVO_ENV_TESTE: arquivo })
      expect(r.status).toBe(0)
      const gravado = Object.fromEntries(
        readFileSync(arquivo, "utf8")
          .split(/\r?\n/)
          .filter((l) => l.startsWith("B11_TESTE_"))
          .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
      )
      ws = gravado.B11_TESTE_WORKSPACE_ID
      expect(ws).toBeTruthy()
      expect(gravado.B11_TESTE_EMAIL).toMatch(/@example\.com$/)
      expect(gravado.B11_TESTE_SENHA).toBeTruthy()

      // Nasceu no banco de teste, e não na produção
      const { data: empresa } = await teste.from("workspaces").select("name").eq("id", ws!).single()
      expect(empresa?.name).toBe("[TESTE] Automações B11")
      expect((await producao.from("workspaces").select("id").eq("id", ws!)).data).toEqual([])

      const { data: contatos } = await teste.from("contacts").select("id, name").eq("workspace_id", ws!)
      expect(contatos!.map((c) => c.name).sort()).toEqual(["Teste B11 Ana", "Teste B11 Bruno", "Teste B11 Carla"])
      const porNome = Object.fromEntries(contatos!.map((c) => [c.name.replace("Teste B11 ", ""), c.id]))

      const { data: cards } = await teste.from("pipeline_cards").select("funil, etapa").eq("workspace_id", ws!)
      expect(cards).toHaveLength(3)
      expect(cards!.every((c) => c.funil === "entrada" && c.etapa === "lead")).toBe(true)

      const { data: conversas } = await teste.from("conversations").select("id, contact_id").eq("workspace_id", ws!)
      expect(conversas!.map((c) => c.contact_id).sort()).toEqual([porNome.Ana, porNome.Bruno].sort())
      const doBruno = conversas!.find((c) => c.contact_id === porNome.Bruno)!.id
      const { data: etiquetas } = await teste.from("conversation_labels").select("labels(name)").eq("conversation_id", doBruno)
      expect(etiquetas!.map((e) => (e.labels as unknown as { name: string }).name)).toEqual(["Interessado"])

      const { data: lista } = await teste.auth.admin.listUsers({ perPage: 1000 })
      admin = lista.users.find((u) => u.email === gravado.B11_TESTE_EMAIL)?.id
      expect(admin).toBeTruthy()
      const { data: entrada } = await teste.from("teams").select("id").eq("workspace_id", ws!).eq("name", "Entrada").single()
      const { data: noTime } = await teste.from("user_teams").select("user_id").eq("team_id", entrada!.id)
      expect(noTime!.map((m) => m.user_id)).toContain(admin)
    }, 120_000)
  })

  it("CA-B46-13: should voltar a empresa de teste do banco de teste ao início sem mexer na da produção", async () => {
    const retrato = async () => {
      const etiquetas = await producao.from("labels").select("id, name").eq("workspace_id", WS_PRODUCAO).order("id")
      const cards = await producao.from("pipeline_cards").select("id, funil, etapa, atendente_id").eq("workspace_id", WS_PRODUCAO).order("id")
      return { etiquetas: etiquetas.data, cards: cards.data }
    }
    const antes = await retrato()

    const extra = `B46 reset ${Date.now()}`
    await teste.from("labels").insert({ workspace_id: WS_TESTE, name: extra, color: "#22c55e" })
    const { data: card } = await teste.from("pipeline_cards").select("id").eq("workspace_id", WS_TESTE).eq("funil", "entrada").limit(1).single()
    await teste.from("pipeline_cards").update({ etapa: "sondagem" }).eq("id", card!.id)

    expect(rodar("resetar-empresa-teste.cjs").status).toBe(0)

    const { data: etiquetas } = await teste.from("labels").select("name").eq("workspace_id", WS_TESTE)
    expect(etiquetas!.map((e) => e.name)).toEqual(["Interessado"])
    const { data: depois } = await teste.from("pipeline_cards").select("etapa").eq("id", card!.id).single()
    expect(depois!.etapa).toBe("lead")

    expect(await retrato()).toEqual(antes)
  }, 120_000)

  it("CA-B46-18: should recusar os roteiros de envio no preview e usar a empresa [TESTE] da produção", async () => {
    for (const roteiro of ["roteiro-b11-05.cjs", "roteiro-b11-07.cjs"]) {
      const r = rodar(roteiro, ["https://crm-exponencial-qualquer.vercel.app"], {}, 60_000)
      expect(r.status).not.toBe(0)
      expect(r.saida).toContain("este roteiro envia mensagem de verdade: rode contra a produção")
    }

    // O domínio próprio e o endereço antigo da Vercel são, os dois, a produção
    expect(comum.lerEnv("https://crm-exponencial.vercel.app").NEXT_PUBLIC_SUPABASE_URL).toBe(envProducao.NEXT_PUBLIC_SUPABASE_URL)
    const env = comum.lerEnv("https://crmatacadoexp.com")
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe(envProducao.NEXT_PUBLIC_SUPABASE_URL)
    const { data: empresa } = await producao.from("workspaces").select("name").eq("id", env.B11_TESTE_WORKSPACE_ID).single()
    expect(empresa?.name).toMatch(/^\[TESTE\]/)
  }, 120_000)
})
