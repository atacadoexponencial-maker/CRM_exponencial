// B46-04 — mantém o banco de teste acordado: o plano grátis pausa o projeto depois
// de 7 dias sem uso. Entra com o usuário da rotina e lê uma tabela pela API.
// Roda todo dia pelo GitHub Actions (.github/workflows/banco-de-teste-acordado.yml),
// que passa as variáveis pelo ambiente; na máquina, lê o .env.teste.local.
// Uso: node supabase/banco-de-teste/manter-acordado.mjs [--preparar]
//   --preparar  cria o usuário da rotina e grava o login no .env.teste.local
import { randomBytes } from "node:crypto"
import { appendFileSync } from "node:fs"
import { resolve } from "node:path"
import { ARQUIVO_ENV, REF_PRODUCAO, lerEnvTeste } from "./comum.mjs"

const EMAIL_DA_ROTINA = "rotina-acordado@example.com"
const VARIAVEIS = ["BANCO_TESTE_URL", "BANCO_TESTE_ANON_KEY", "BANCO_TESTE_ROTINA_EMAIL", "BANCO_TESTE_ROTINA_SENHA"]

function lerAmbiente() {
  if (VARIAVEIS.every((v) => process.env[v])) {
    const [url, chave, email, senha] = VARIAVEIS.map((v) => process.env[v])
    return { url, chave, email, senha }
  }
  const env = lerEnvTeste()
  return {
    url: env.NEXT_PUBLIC_SUPABASE_URL,
    chave: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    servico: env.SUPABASE_SERVICE_ROLE_KEY,
    email: env.BANCO_TESTE_ROTINA_EMAIL,
    senha: env.BANCO_TESTE_ROTINA_SENHA,
  }
}

async function pedir(caminho, opcoes) {
  const r = await fetch(caminho, { ...opcoes, signal: AbortSignal.timeout(30_000) })
  if (!r.ok) throw new Error(`${new URL(caminho).pathname} respondeu ${r.status}`)
  return r.json()
}

async function preparar({ url, servico }) {
  const senha = randomBytes(18).toString("base64url")
  await pedir(`${url}/auth/v1/admin/users`, {
    method: "POST",
    headers: { apikey: servico, Authorization: `Bearer ${servico}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL_DA_ROTINA, password: senha, email_confirm: true }),
  })
  appendFileSync(
    resolve(process.cwd(), ARQUIVO_ENV),
    `\n# Usuário da rotina que mantém o banco de teste acordado (B46-04). Não versionar.\nBANCO_TESTE_ROTINA_EMAIL=${EMAIL_DA_ROTINA}\nBANCO_TESTE_ROTINA_SENHA=${senha}\n`,
  )
  console.log(`usuário da rotina criado: ${EMAIL_DA_ROTINA}`)
}

async function acordar({ url, chave, email, senha }) {
  const sessao = await pedir(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: chave, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: senha }),
  })
  // Uma leitura pela API também usa o banco; sem empresa, a RLS devolve vazio.
  await pedir(`${url}/rest/v1/workspaces?select=id&limit=1`, {
    headers: { apikey: chave, Authorization: `Bearer ${sessao.access_token}` },
  })
  console.log(`banco de teste acordado em ${new Date().toISOString()}`)
}

const ambiente = lerAmbiente()
if (!ambiente.url || ambiente.url.includes(REF_PRODUCAO)) {
  console.error("FALHOU: a rotina só roda no banco de teste")
  process.exit(1)
}
try {
  if (process.argv.includes("--preparar")) await preparar(ambiente)
  else await acordar(ambiente)
} catch (e) {
  console.error("FALHOU:", e.message)
  process.exit(1)
}
