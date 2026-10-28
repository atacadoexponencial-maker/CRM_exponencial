// B46 — o que os comandos do banco de teste têm em comum: ler o .env.teste.local,
// recusar a produção e montar o endereço de conexão. Nunca imprime segredo.
import { spawnSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"

export const REF_PRODUCAO = "lvlypfvqnfgahihxdosn"
export const ARQUIVO_ENV = ".env.teste.local"

// O banco grátis não tem IPv4 na conexão direta: entra pelo pooler, em modo sessão.
const POOLER_PADRAO = "aws-0-us-east-1.pooler.supabase.com"

function lerArquivoEnv(caminho) {
  if (!existsSync(caminho)) throw new Error(`falta o arquivo ${caminho.split(/[\\/]/).pop()} na raiz do projeto`)
  const env = /** @type {Record<string, string>} */ ({})
  for (const linha of readFileSync(caminho, "utf8").split(/\r?\n/)) {
    const m = linha.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m) env[m[1]] = m[2].replace(/^"(.*)"$/, "$1")
  }
  return env
}

// Só para os testes que comparam com a produção (leitura): o .env.local aponta para ela.
export function lerEnvProducao(raiz = process.cwd()) {
  const env = lerArquivoEnv(resolve(raiz, ".env.local"))
  if (!(env.NEXT_PUBLIC_SUPABASE_URL ?? "").includes(REF_PRODUCAO)) {
    throw new Error("o .env.local não aponta para a produção")
  }
  return env
}

export function lerEnvTeste(raiz = process.cwd()) {
  const env = lerArquivoEnv(resolve(raiz, ARQUIVO_ENV))
  for (const nome of ["SUPABASE_TESTE_PROJECT_REF", "SUPABASE_TESTE_DB_PASSWORD"]) {
    if (!env[nome]) throw new Error(`falta ${nome} no ${ARQUIVO_ENV}`)
  }
  if (env.SUPABASE_TESTE_PROJECT_REF === REF_PRODUCAO || (env.NEXT_PUBLIC_SUPABASE_URL ?? "").includes(REF_PRODUCAO)) {
    throw new Error("o ref é o da produção: este comando só aplica no banco de teste")
  }
  return env
}

export function enderecoDoBanco(env) {
  const ref = env.SUPABASE_TESTE_PROJECT_REF
  const senha = encodeURIComponent(env.SUPABASE_TESTE_DB_PASSWORD)
  const host = env.SUPABASE_TESTE_POOLER_HOST || POOLER_PADRAO
  return `postgresql://postgres.${ref}:${senha}@${host}:5432/postgres`
}

// B46-02 — trava dos testes: recusa a produção e confere se o banco responde, antes
// de qualquer teste rodar. Lança erro com a mensagem que a pessoa vai ler.
export async function conferirBancoDosTestes(url, chaveAnon) {
  if (!url || url.includes(REF_PRODUCAO)) {
    throw new Error("os testes de integração só rodam no banco de teste")
  }
  try {
    const r = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: chaveAnon ?? "" },
      signal: AbortSignal.timeout(15_000),
    })
    if (!r.ok) throw new Error(`status ${r.status}`)
  } catch {
    throw new Error("o banco de teste não respondeu: confira se ele está pausado no painel do Supabase")
  }
}

// Roda o CLI do Supabase sem passar por shell: a senha vai no endereço, e o cmd do
// Windows poderia trocar trechos com "%" dela.
export function rodarSupabase(argumentos, opcoes = {}) {
  const npxDoWindows = join(dirname(process.execPath), "node_modules", "npm", "bin", "npx-cli.js")
  const [programa, inicio] =
    process.platform === "win32" ? [process.execPath, [npxDoWindows]] : ["npx", []]
  return spawnSync(programa, [...inicio, "supabase", ...argumentos], { encoding: "utf8", ...opcoes })
}
