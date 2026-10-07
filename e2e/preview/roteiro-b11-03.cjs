/* eslint-disable @typescript-eslint/no-require-imports */
// "Pronto quando" da B11-03 no preview, pela tela, com a empresa de teste no
// estado inicial (rode o resetar antes):
//  - "card movido para Sondagem → atribuir ao admin", com a proteção padrão de
//    regra nova ("uma vez por contato"), disparada duas vezes para a Ana: concluída
//    e depois ignorada, com o motivo.
//  - "card movido para Negociação → aplicar 'Temporária' → atribuir ao admin", em
//    "sempre", com a etiqueta apagada depois de salvar: falhou, com o motivo na
//    ação da etiqueta, e a atribuição seguinte feita.
//  - Página de histórico: as três execuções, o detalhe com o motivo, o filtro por
//    resultado, e o "Ver histórico" da lista.
// Uso: node e2e/preview/roteiro-b11-03.cjs <endereço do preview>

const { abrirPreview, bancoDeServico, conferirEmpresaDeTeste, criarRelatorio } = require("./comum.cjs")
const { adicionarBloco, escolher, moverCard, novaRegra, salvarRegra } = require("./tela.cjs")

const URL_PREVIEW = process.argv[2]

;(async () => {
  if (!URL_PREVIEW) throw new Error("passe o endereço do preview (veja endereco-preview.cjs)")
  const db = bancoDeServico()
  const { browser, page, erros, workspaceId: ws } = await abrirPreview(URL_PREVIEW)
  await conferirEmpresaDeTeste(db, ws)
  const r = criarRelatorio()

  // Etiqueta que vai ser apagada depois de a regra estar salva
  const { data: temporaria } = await db
    .from("labels")
    .insert({ workspace_id: ws, name: "Temporária", color: "#f97316" })
    .select("id")
    .single()

  // Regra 1: proteção padrão de regra nova
  await novaRegra(page, URL_PREVIEW, "B11-03 Uma vez", "Sondagem")
  r.confere(
    "regra nova nasce com 'Uma vez por contato'",
    (await page.getByRole("combobox", { name: "Proteção de repetição" }).innerText()).includes("Uma vez por contato")
  )
  await adicionarBloco(page, "Atribuir atendente")
  await escolher(page, "#painel-campo-atendente_id", "Admin Teste B11")
  const regraUmaVez = await salvarRegra(page)

  // Regra 2: "sempre", etiqueta que será apagada e uma ação depois dela
  await novaRegra(page, URL_PREVIEW, "B11-03 Etiqueta apagada", "Negociação")
  await escolher(page, '[aria-label="Proteção de repetição"]', "Sempre (a cada disparo)")
  await adicionarBloco(page, "Aplicar etiqueta à conversa")
  await escolher(page, "#painel-campo-label_id", "Temporária")
  await adicionarBloco(page, "Atribuir atendente")
  await escolher(page, "#painel-campo-atendente_id", "Admin Teste B11")
  await salvarRegra(page)
  await db.from("labels").delete().eq("id", temporaria.id)

  // Disparos
  await moverCard(page, URL_PREVIEW, "Teste B11 Ana", "Sondagem")
  await moverCard(page, URL_PREVIEW, "Teste B11 Ana", "Lead")
  await moverCard(page, URL_PREVIEW, "Teste B11 Ana", "Sondagem")
  await moverCard(page, URL_PREVIEW, "Teste B11 Ana", "Negociação")

  const { data: execucoes } = await db
    .from("automation_runs")
    .select("regra_nome, resultado, motivo, caminho")
    .eq("workspace_id", ws)
    .order("created_at")
  const daRegra = (nome) => execucoes.filter((e) => e.regra_nome === nome)
  const umaVez = daRegra("B11-03 Uma vez")
  r.confere(
    "'uma vez por contato' duas vezes: concluída e depois ignorada",
    umaVez.map((e) => e.resultado).join(",") === "concluida,ignorada",
    umaVez.map((e) => e.resultado).join(",")
  )
  r.confere("a ignorada traz o motivo", (umaVez[1]?.motivo ?? "").includes("uma vez por contato"), umaVez[1]?.motivo)

  const [apagada] = daRegra("B11-03 Etiqueta apagada")
  r.confere("etiqueta apagada: a execução falhou", apagada?.resultado === "falhou")
  const passos = apagada?.caminho ?? []
  r.confere("a ação da etiqueta falhou com o motivo", passos[1]?.ok === false && passos[1]?.motivo === "A etiqueta não existe mais", passos[1]?.motivo)
  r.confere("a ação seguinte (atribuir) foi feita", passos[2]?.ok === true)

  // Página de histórico
  await page.goto(`${URL_PREVIEW}/configuracoes/automacoes/historico`, { waitUntil: "networkidle" })
  r.confere("histórico lista as 3 execuções", (await page.locator("tbody tr").count()) === 3)
  await page.locator("tbody tr").filter({ hasText: "B11-03 Etiqueta apagada" }).click()
  await page.getByRole("dialog").getByText("A etiqueta não existe mais").waitFor({ timeout: 10000 })
  r.confere("detalhe mostra o motivo da ação que falhou", true)
  await page.keyboard.press("Escape")

  await escolher(page, '[aria-label="Filtrar por resultado"]', "Ignorada")
  await page.waitForURL(/resultado=ignorada/)
  await page.waitForLoadState("networkidle")
  r.confere("filtro por resultado: só a ignorada", (await page.locator("tbody tr").count()) === 1)

  // Lista: contagem e "Ver histórico"
  await page.goto(`${URL_PREVIEW}/configuracoes/automacoes`, { waitUntil: "networkidle" })
  const linha = page.locator("tbody tr").filter({ hasText: "B11-03 Uma vez" })
  r.confere("lista conta 1 execução em 7 dias (a ignorada não conta)", (await linha.locator("td").nth(1).innerText()).trim() === "1")
  await page.getByRole("button", { name: "Abrir menu de B11-03 Uma vez" }).click()
  await page.getByRole("menuitem", { name: "Ver histórico" }).click()
  await page.waitForURL(new RegExp(`regra=${regraUmaVez}`))
  await page.waitForLoadState("networkidle")
  r.confere("'Ver histórico' abre filtrado pela regra", (await page.locator("tbody tr").count()) === 2)

  r.confere("sem erro no console", erros.length === 0, erros.join(" | "))
  await browser.close()
  process.exit(r.imprimir() ? 1 : 0)
})().catch((e) => {
  console.error("PAROU:", e.message.split("\n")[0])
  process.exit(1)
})
