/* eslint-disable @typescript-eslint/no-require-imports */
// "Pronto quando" da B11-05 no preview, com a empresa de teste no estado inicial
// (rode o resetar antes). ⚠️ ENVIA MENSAGENS DE VERDADE: duas, para o número em
// B11_TESTE_TELEFONE_REAL (.env.local), pelo chip conectado na empresa de teste.
// Só rode depois de combinar com quem vai receber.
//
// Monta 2 regras pelo editor:
//  A. mensagem enviada pelo time → texto contém "segue o catálogo" → sim: mover o
//     card para Catálogo Enviado e adicionar a tag "catalogo-enviado"
//  B. tag "manda-catalogo" adicionada → enviar a mensagem "Segue o catálogo (automação)"
// e confere que a resposta escrita no chat dispara a A, e que a mesma frase
// mandada pela automação B não dispara. A sequência usa o mesmo envio da
// automação (`enviarTextoWhatsApp`); o teste automatizado cobre os dois.
//
// O contato "Teste B11 Número real" é criado na primeira vez, com o número real,
// um card em Lead e uma conversa no chip, e fica para os próximos roteiros.
// Uso: node e2e/preview/roteiro-b11-05.cjs <endereço do preview>

const {
  abrirPreview,
  bancoDeServico,
  conferirEmpresaDeTeste,
  criarRelatorio,
  esperarAutomacoes,
  lerEnv,
} = require("./comum.cjs")
const { adicionarBloco, escolher, salvarRegra } = require("./tela.cjs")

const URL_PREVIEW = process.argv[2]
const NOME_CONTATO = "Teste B11 Número real"
const TEXTO_DO_TIME = "Segue o catálogo 👇"

/**
 * O contato com o número real, com card em Lead no Funil de Entrada e conversa
 * aberta no chip. Cria o que faltar.
 */
async function contatoComNumeroReal(db, ws, telefone, conexaoId) {
  let { data: contato } = await db.from("contacts").select("id").eq("workspace_id", ws).eq("phone_number", telefone).maybeSingle()
  if (!contato) {
    const criado = await db.from("contacts").insert({ workspace_id: ws, phone_number: telefone, name: NOME_CONTATO }).select("id").single()
    if (criado.error) throw new Error(`contato: ${criado.error.message}`)
    contato = criado.data
  }
  const { data: card } = await db.from("pipeline_cards").select("id").eq("contact_id", contato.id).eq("funil", "entrada").maybeSingle()
  if (card) await db.from("pipeline_cards").update({ etapa: "lead" }).eq("id", card.id)
  else await db.from("pipeline_cards").insert({ workspace_id: ws, contact_id: contato.id, funil: "entrada", etapa: "lead" })

  const { data: conversa } = await db
    .from("conversations")
    .select("id")
    .eq("contact_id", contato.id)
    .in("status", ["em_espera", "em_atendimento"])
    .maybeSingle()
  if (conversa) {
    await db.from("conversations").update({ whatsapp_connection_id: conexaoId }).eq("id", conversa.id)
    return { contatoId: contato.id, conversaId: conversa.id }
  }
  const nova = await db
    .from("conversations")
    .insert({ workspace_id: ws, contact_id: contato.id, status: "em_atendimento", whatsapp_connection_id: conexaoId })
    .select("id")
    .single()
  if (nova.error) throw new Error(`conversa: ${nova.error.message}`)
  return { contatoId: contato.id, conversaId: nova.data.id }
}

;(async () => {
  if (!URL_PREVIEW) throw new Error("passe o endereço do preview (veja endereco-preview.cjs)")
  const env = lerEnv()
  const telefone = (env.B11_TESTE_TELEFONE_REAL ?? "").replace(/\D/g, "")
  if (!telefone) throw new Error("defina B11_TESTE_TELEFONE_REAL no .env.local (o número que vai receber as mensagens)")

  const db = bancoDeServico(env)
  const ws = env.B11_TESTE_WORKSPACE_ID
  await conferirEmpresaDeTeste(db, ws)
  const { data: chip } = await db
    .from("whatsapp_connections")
    .select("id")
    .eq("workspace_id", ws)
    .eq("canal", "gateway")
    .eq("status", "connected")
    .limit(1)
    .maybeSingle()
  if (!chip) throw new Error("a empresa de teste não tem chip conectado: nada foi enviado")

  const { contatoId, conversaId } = await contatoComNumeroReal(db, ws, telefone, chip.id)
  const { browser, page, erros } = await abrirPreview(URL_PREVIEW)
  const r = criarRelatorio()

  const etapaDoCard = async () =>
    (await db.from("pipeline_cards").select("etapa").eq("contact_id", contatoId).eq("funil", "entrada").single()).data.etapa
  const tags = async () => ((await db.from("contact_tags").select("tag").eq("contact_id", contatoId)).data ?? []).map((t) => t.tag)
  const execucoes = async (nome) =>
    (await db.from("automation_runs").select("resultado, motivo, evento").eq("workspace_id", ws).eq("regra_nome", nome)).data ?? []

  try {
    // 1. Regras pelo editor
    await page.goto(`${URL_PREVIEW}/configuracoes/automacoes/nova`, { waitUntil: "networkidle" })
    await page.waitForSelector(".react-flow__node")
    await page.getByRole("textbox", { name: "Nome da automação" }).fill("B11-05 A catálogo do time")
    await page.locator(".react-flow__node").first().click()
    await escolher(page, "#painel-gatilho", "Mensagem enviada pelo time")
    await escolher(page, '[aria-label="Proteção de repetição"]', "Sempre (a cada disparo)")
    await adicionarBloco(page, "Condição (sim / não)")
    await page.getByRole("button", { name: "Adicionar verificação" }).click()
    await escolher(page, '[aria-label="Atributo"]', "Texto da mensagem")
    await escolher(page, '[aria-label="Operador"]', "contém")
    await page.getByRole("textbox", { name: "Valor" }).fill("segue o catálogo")
    await adicionarBloco(page, "Mover card para etapa", { bloco: "Condição", indice: 0 })
    await escolher(page, "#painel-campo-funil", "Funil de Entrada")
    await escolher(page, "#painel-campo-etapa", "Catálogo Enviado")
    await adicionarBloco(page, "Adicionar tag ao contato", { bloco: "Mover card" })
    await page.locator("#painel-campo-tag").fill("catalogo-enviado")
    await salvarRegra(page)

    await page.goto(`${URL_PREVIEW}/configuracoes/automacoes/nova`, { waitUntil: "networkidle" })
    await page.waitForSelector(".react-flow__node")
    await page.getByRole("textbox", { name: "Nome da automação" }).fill("B11-05 B automação manda o catálogo")
    await page.locator(".react-flow__node").first().click()
    await escolher(page, "#painel-gatilho", "Tag adicionada ao contato")
    await page.locator("#painel-campo-tag").fill("manda-catalogo")
    await adicionarBloco(page, "Enviar mensagem")
    await page.locator("#painel-campo-texto").fill("Segue o catálogo (automação)")
    await salvarRegra(page)

    // 2. O atendente responde pelo chat (envio de verdade nº 1)
    await page.goto(`${URL_PREVIEW}/chat?conversa=${conversaId}`, { waitUntil: "networkidle" })
    const caixa = page.getByPlaceholder("Digite uma mensagem...")
    await caixa.fill(TEXTO_DO_TIME)
    await Promise.all([
      page.waitForResponse(
        (res) => res.request().method() === "POST" && (res.request().postData() ?? "").includes("Segue o cat"),
        { timeout: 60000 }
      ),
      caixa.press("Enter"),
    ])
    await esperarAutomacoes(db, ws)
    const { data: enviada } = await db
      .from("messages")
      .select("status")
      .eq("conversation_id", conversaId)
      .eq("content", TEXTO_DO_TIME)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    r.confere("a mensagem do chat saiu pelo chip", enviada?.status && enviada.status !== "falhou", enviada?.status)
    r.confere("a resposta do time move o card para Catálogo Enviado", (await etapaDoCard()) === "catalogo_enviado")
    r.confere("a resposta do time põe a tag catalogo-enviado", (await tags()).includes("catalogo-enviado"))

    // 3. A automação manda a mesma frase (envio de verdade nº 2): a regra do time não roda
    await db.from("pipeline_cards").update({ etapa: "lead" }).eq("contact_id", contatoId).eq("funil", "entrada")
    await db.from("contact_tags").delete().eq("contact_id", contatoId).eq("tag", "catalogo-enviado")
    await page.goto(`${URL_PREVIEW}/contatos/${contatoId}`, { waitUntil: "networkidle" })
    await page.getByPlaceholder("Nova tag (sem espaços)").fill("manda-catalogo")
    await Promise.all([
      page.waitForResponse(
        (res) => res.request().method() === "POST" && (res.request().postData() ?? "").includes('"manda-catalogo"'),
        { timeout: 60000 }
      ),
      page.getByRole("button", { name: "Adicionar", exact: true }).click(),
    ])
    await esperarAutomacoes(db, ws)
    const [envioDaAutomacao] = await execucoes("B11-05 B automação manda o catálogo")
    r.confere(
      "a automação B mandou a mensagem",
      envioDaAutomacao?.resultado === "concluida",
      `${envioDaAutomacao?.resultado} ${envioDaAutomacao?.motivo ?? ""}`
    )
    const doTime = await execucoes("B11-05 A catálogo do time")
    r.confere("a mensagem da automação não dispara a regra do time", doTime.length === 1, `${doTime.length} execuções`)
    r.confere("o card continua em Lead", (await etapaDoCard()) === "lead")

    // 4. Histórico
    r.confere("o histórico guarda a mensagem do time", doTime[0]?.evento?.texto === TEXTO_DO_TIME)
    await page.goto(`${URL_PREVIEW}/configuracoes/automacoes/historico`, { waitUntil: "networkidle" })
    r.confere(
      "a página do histórico mostra a mensagem do time",
      (await page.getByText(`Mensagem do time: "${TEXTO_DO_TIME}"`).count()) >= 1
    )

    r.confere("sem erro no console", erros.length === 0, erros.join(" | "))
  } finally {
    await browser.close()
  }

  process.exit(r.imprimir() ? 1 : 0)
})().catch((e) => {
  console.error("PAROU:", e.message.split("\n")[0])
  process.exit(1)
})
