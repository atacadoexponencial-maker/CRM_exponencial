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

/**
 * Espera a fila de automações da empresa esvaziar (B11-09). Desde a fila, as
 * regras rodam depois da resposta da ação, e o roteiro só pode conferir o banco
 * quando elas terminarem. O evento entra na fila antes da resposta, então, logo
 * depois dela, a fila vazia quer dizer que as regras já rodaram. Devolve quanto
 * esperou, em milissegundos.
 */
async function esperarAutomacoes(db, workspaceId, limiteMs = 30000) {
  const inicio = Date.now()
  while (Date.now() - inicio < limiteMs) {
    const { count, error } = await db
      .from("automation_queue")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .in("status", ["pendente", "processando"])
    if (error) throw new Error(error.message)
    if (count === 0) return Date.now() - inicio
    await new Promise((resolver) => setTimeout(resolver, 300))
  }
  throw new Error(`a fila de automações não esvaziou em ${limiteMs / 1000} s`)
}

/**
 * Manda ao webhook do gateway no preview um evento assinado como o gateway
 * assina (B11-04). A mensagem real do chip vai para a produção, e não para o
 * preview: o evento simulado é o jeito de testar a "mensagem recebida" no
 * branch. O segredo é o `GATEWAY_WEBHOOK_SECRET` do .env, que na Vercel vale só
 * para o Preview do branch. Devolve o status, o corpo e o tempo de resposta.
 */
async function enviarEventoDoGateway(urlPreview, envelope, env = lerEnv()) {
  const { createHmac } = require("crypto")
  const corpo = JSON.stringify(envelope)
  const assinatura = "sha256=" + createHmac("sha256", env.GATEWAY_WEBHOOK_SECRET).update(corpo).digest("hex")
  const inicio = Date.now()
  const resposta = await fetch(`${urlPreview}/api/webhooks/gateway`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-gateway-signature-256": assinatura,
      "x-vercel-protection-bypass": env.VERCEL_AUTOMATION_BYPASS_SECRET,
    },
    body: corpo,
  })
  const texto = await resposta.text()
  return { status: resposta.status, corpo: texto, ms: Date.now() - inicio }
}

const NOME_DO_CONTATO_REAL = "Teste B11 Número real"

/**
 * Para os roteiros que enviam de verdade (B11-05 em diante): o chip conectado na
 * empresa de teste e o contato com o número que recebe (`B11_TESTE_TELEFONE_REAL`),
 * com card em Lead no Funil de Entrada, sem atendente, e conversa aberta no chip.
 * Cria o que faltar; o contato fica para os próximos roteiros. Para antes de
 * qualquer envio se faltar o chip ou o número.
 */
async function prepararNumeroReal(db, workspaceId, env = lerEnv()) {
  const telefone = (env.B11_TESTE_TELEFONE_REAL ?? "").replace(/\D/g, "")
  if (!telefone) throw new Error("defina B11_TESTE_TELEFONE_REAL no .env.local (o número que vai receber as mensagens)")
  const { data: chip } = await db
    .from("whatsapp_connections")
    .select("id, instance_id")
    .eq("workspace_id", workspaceId)
    .eq("canal", "gateway")
    .eq("status", "connected")
    .limit(1)
    .maybeSingle()
  if (!chip) throw new Error("a empresa de teste não tem chip conectado: nada foi enviado")

  let { data: contato } = await db
    .from("contacts")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("phone_number", telefone)
    .maybeSingle()
  if (!contato) {
    const criado = await db
      .from("contacts")
      .insert({ workspace_id: workspaceId, phone_number: telefone, name: NOME_DO_CONTATO_REAL })
      .select("id")
      .single()
    if (criado.error) throw new Error(`contato: ${criado.error.message}`)
    contato = criado.data
  } else {
    // O número pode ter escrito para o chip e virado contato sem nome; os roteiros contam com o nome
    await db.from("contacts").update({ name: NOME_DO_CONTATO_REAL }).eq("id", contato.id)
  }

  const { data: card } = await db.from("pipeline_cards").select("id").eq("contact_id", contato.id).eq("funil", "entrada").maybeSingle()
  if (card) await db.from("pipeline_cards").update({ etapa: "lead", atendente_id: null }).eq("id", card.id)
  else await db.from("pipeline_cards").insert({ workspace_id: workspaceId, contact_id: contato.id, funil: "entrada", etapa: "lead" })

  const { data: aberta } = await db
    .from("conversations")
    .select("id")
    .eq("contact_id", contato.id)
    .in("status", ["em_espera", "em_atendimento"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  let conversaId = aberta?.id
  if (conversaId) {
    await db.from("conversations").update({ whatsapp_connection_id: chip.id, assigned_to: null }).eq("id", conversaId)
  } else {
    const nova = await db
      .from("conversations")
      .insert({ workspace_id: workspaceId, contact_id: contato.id, status: "em_atendimento", whatsapp_connection_id: chip.id })
      .select("id")
      .single()
    if (nova.error) throw new Error(`conversa: ${nova.error.message}`)
    conversaId = nova.data.id
  }
  return { contatoId: contato.id, conversaId, chip, telefone }
}

module.exports = {
  PROJETO,
  lerEnv,
  bancoDeServico,
  conferirEmpresaDeTeste,
  abrirPreview,
  criarRelatorio,
  esperarAutomacoes,
  enviarEventoDoGateway,
  prepararNumeroReal,
}
