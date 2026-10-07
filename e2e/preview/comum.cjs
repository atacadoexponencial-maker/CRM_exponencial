/* eslint-disable @typescript-eslint/no-require-imports */
// Peças comuns dos roteiros de teste no preview (ver README.md desta pasta):
// ler o .env e o .env.local sem mostrar nada, o cliente do Supabase com a chave de
// serviço, e abrir o preview logado como o admin da empresa de teste.

const fs = require("fs")
const path = require("path")

const PROJETO = path.resolve(__dirname, "..", "..")

function lerArquivoEnv(arquivo) {
  if (!fs.existsSync(arquivo)) return {}
  return Object.fromEntries(
    fs
      .readFileSync(arquivo, "utf8")
      .split(/\r?\n/)
      .filter((linha) => /^[A-Z_0-9]+=/.test(linha))
      .map((linha) => [linha.slice(0, linha.indexOf("=")), linha.slice(linha.indexOf("=") + 1).trim()])
  )
}

/** `.env` e, por cima, `.env.local` (onde ficam as credenciais da empresa de teste). */
function lerEnv() {
  return { ...lerArquivoEnv(path.join(PROJETO, ".env")), ...lerArquivoEnv(path.join(PROJETO, ".env.local")) }
}

/** Cliente com a chave de serviço: passa por cima da RLS. Só para preparar e conferir a empresa de teste. */
function bancoDeServico(env = lerEnv()) {
  const { createClient } = require("@supabase/supabase-js")
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/** Para antes de mexer em qualquer coisa que não seja a empresa de teste. */
async function conferirEmpresaDeTeste(db, workspaceId) {
  if (!workspaceId) throw new Error("B11_TESTE_WORKSPACE_ID não está no .env.local")
  const { data } = await db.from("workspaces").select("name").eq("id", workspaceId).maybeSingle()
  if (!data?.name?.startsWith("[TESTE]")) throw new Error("o workspace configurado não é uma empresa de teste")
}

/**
 * Abre o preview e entra como o admin da empresa de teste. A primeira página
 * passa pela proteção da Vercel com o segredo de bypass e grava um cookie; as
 * seguintes já entram com ele. Chromium: PLAYWRIGHT_CHROMIUM, se definido.
 */
async function abrirPreview(urlPreview) {
  const env = lerEnv()
  const { chromium } = require("playwright")
  const browser = await chromium.launch(
    process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {}
  )
  const page = await browser.newPage({ viewport: { width: 1400, height: 860 } })
  const erros = []
  page.on("pageerror", (e) => erros.push(String(e)))

  const bypass = new URLSearchParams({
    "x-vercel-protection-bypass": env.VERCEL_AUTOMATION_BYPASS_SECRET,
    "x-vercel-set-bypass-cookie": "true",
  })
  await page.goto(`${urlPreview}/login?${bypass}`, { waitUntil: "networkidle", timeout: 120000 })
  await page.locator("#email").fill(env.B11_TESTE_EMAIL)
  await page.locator("#senha").fill(env.B11_TESTE_SENHA)
  await Promise.all([
    page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 60000 }),
    page.locator("#senha").press("Enter"),
  ])
  return { browser, page, erros, workspaceId: env.B11_TESTE_WORKSPACE_ID }
}

/** Lista de verificações de um roteiro: cada uma vira uma linha "OK" ou "FALHOU". */
function criarRelatorio() {
  const linhas = []
  let falhas = 0
  return {
    confere(nome, ok, detalhe = "") {
      if (!ok) falhas++
      linhas.push(`${ok ? "OK    " : "FALHOU"} ${nome}${detalhe ? " — " + detalhe : ""}`)
    },
    imprimir() {
      console.log(linhas.join("\n"))
      return falhas
    },
  }
}

module.exports = { PROJETO, lerEnv, bancoDeServico, conferirEmpresaDeTeste, abrirPreview, criarRelatorio }
