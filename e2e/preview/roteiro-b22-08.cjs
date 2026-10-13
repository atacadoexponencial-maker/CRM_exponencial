/* eslint-disable @typescript-eslint/no-require-imports */
// B22-08 no preview, pela tela, com a empresa de teste no estado inicial (rode o
// resetar antes): aviso ao sair do editor sem salvar e rascunho no navegador.
//  - Regra nova editada: "Alterações não salvas", "Automações" pede confirmação,
//    fechar a aba passa pelo aviso do navegador, e o rascunho fica guardado.
//  - Outra aba: o editor oferece o rascunho; recuperar e salvar apaga o rascunho.
//  - Depois de salvar, editar tira o "Automação salva"; "Sair sem salvar" sai,
//    apaga o rascunho e não grava nada.
//  - Rascunho de uma versão que mudou depois (outro admin salvou): a faixa avisa,
//    e "Descartar" fica com o que está salvo.
// Uso: node e2e/preview/roteiro-b22-08.cjs <endereço do preview>

const { abrirPreview, bancoDeServico, conferirEmpresaDeTeste, criarRelatorio } = require("./comum.cjs")
const { novaRegra, salvarRegra } = require("./tela.cjs")

const URL_PREVIEW = process.argv[2]
const NOME = "B22-08 Rascunho"

/** Chaves de rascunho de automação guardadas no navegador. */
const rascunhos = (page) =>
  page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("automacoes:rascunho:")))

/** O rascunho é guardado um instante depois da última edição. */
const esperarRascunho = (page) => page.waitForTimeout(1800)

;(async () => {
  if (!URL_PREVIEW) throw new Error("passe o endereço do preview (veja endereco-preview.cjs)")
  const db = bancoDeServico()
  const { browser, page, erros, workspaceId: ws } = await abrirPreview(URL_PREVIEW)
  await conferirEmpresaDeTeste(db, ws)
  const r = criarRelatorio()
  const naoSalvas = (p) => p.getByText("Alterações não salvas", { exact: true })

  // Regra nova, editada e não salva
  await novaRegra(page, URL_PREVIEW, NOME, "Sondagem")
  r.confere("regra nova editada mostra 'Alterações não salvas'", await naoSalvas(page).isVisible())

  await page.getByRole("button", { name: "Automações", exact: true }).click()
  const dialogo = page.getByRole("dialog").filter({ hasText: "Sair sem salvar?" })
  await dialogo.waitFor({ timeout: 10000 })
  r.confere("'Automações' com alteração pede confirmação", true)
  await dialogo.getByRole("button", { name: "Continuar editando" }).click()
  await dialogo.waitFor({ state: "hidden" })
  r.confere("'Continuar editando' fica no editor", page.url().endsWith("/configuracoes/automacoes/nova"))

  await esperarRascunho(page)
  const guardados = await rascunhos(page)
  r.confere("rascunho da regra nova guardado", guardados.length === 1 && guardados[0].endsWith(":nova"), guardados.join(","))

  // Fechar a aba: o navegador pergunta antes
  const contexto = page.context()
  let avisoDoNavegador = false
  page.on("dialog", async (d) => {
    if (d.type() === "beforeunload") avisoDoNavegador = true
    await d.accept()
  })
  await page.close({ runBeforeUnload: true })
  await page.waitForEvent("close", { timeout: 10000 }).catch(() => {})
  r.confere("fechar a aba com alteração passa pelo aviso do navegador", avisoDoNavegador)

  // Outra aba: o rascunho volta
  const aba = await contexto.newPage()
  aba.on("pageerror", (e) => erros.push(String(e)))
  await aba.goto(`${URL_PREVIEW}/configuracoes/automacoes/nova`, { waitUntil: "networkidle" })
  await aba.waitForSelector(".react-flow__node")
  const faixa = aba.getByRole("status").filter({ hasText: "Há alterações não salvas" })
  r.confere("editor oferece o rascunho ao abrir", await faixa.isVisible())
  r.confere("a faixa não fala em versão mais nova", !(await faixa.innerText()).includes("salva depois"))
  await faixa.getByRole("button", { name: "Recuperar" }).click()
  r.confere(
    "'Recuperar' devolve o nome",
    (await aba.getByRole("textbox", { name: "Nome da automação" }).inputValue()) === NOME
  )
  r.confere("o gatilho volta configurado", (await aba.locator(".react-flow__node").first().innerText()).includes("Sondagem"))

  const regraId = await salvarRegra(aba)
  r.confere("salvar apaga o rascunho", (await rascunhos(aba)).length === 0, (await rascunhos(aba)).join(","))
  r.confere("logo depois de salvar não há 'Alterações não salvas'", !(await naoSalvas(aba).isVisible()))
  r.confere("'Automação salva' aparece", await aba.getByText("Automação salva").isVisible())

  // Editar depois de salvar
  const campoNome = aba.getByRole("textbox", { name: "Nome da automação" })
  await campoNome.fill(`${NOME} editado`)
  r.confere("editar tira o 'Automação salva'", !(await aba.getByText("Automação salva").isVisible()))
  r.confere("e mostra 'Alterações não salvas'", await naoSalvas(aba).isVisible())
  await campoNome.fill(NOME)
  r.confere("voltar ao que está salvo tira o 'Alterações não salvas'", !(await naoSalvas(aba).isVisible()))

  await campoNome.fill(`${NOME} editado`)
  await esperarRascunho(aba)
  r.confere("rascunho da regra salva guardado", (await rascunhos(aba)).some((k) => k.endsWith(`:${regraId}`)))
  await aba.getByRole("button", { name: "Automações", exact: true }).click()
  await aba.getByRole("dialog").getByRole("button", { name: "Sair sem salvar" }).click()
  await aba.waitForURL(/\/configuracoes\/automacoes$/, { timeout: 20000 })
  r.confere("'Sair sem salvar' vai para a lista", true)
  r.confere("e apaga o rascunho", (await rascunhos(aba)).length === 0)
  const { data: gravada } = await db.from("automation_flows").select("nome").eq("id", regraId).single()
  r.confere("e não grava a edição", gravada?.nome === NOME, gravada?.nome)

  // Sem edição, abrir e sair não pergunta nada
  await aba.goto(`${URL_PREVIEW}/configuracoes/automacoes/${regraId}`, { waitUntil: "networkidle" })
  await aba.waitForSelector(".react-flow__node")
  r.confere("regra salva abre sem 'Alterações não salvas'", !(await naoSalvas(aba).isVisible()))
  r.confere("e sem faixa de rascunho", (await aba.getByText("Há alterações não salvas").count()) === 0)
  await aba.getByRole("button", { name: "Automações", exact: true }).click()
  await aba.waitForURL(/\/configuracoes\/automacoes$/, { timeout: 20000 })
  r.confere("sem alteração, 'Automações' sai direto", true)

  // Rascunho de uma versão que mudou depois
  await aba.goto(`${URL_PREVIEW}/configuracoes/automacoes/${regraId}`, { waitUntil: "networkidle" })
  await aba.waitForSelector(".react-flow__node")
  await aba.getByRole("textbox", { name: "Nome da automação" }).fill(`${NOME} do rascunho`)
  await esperarRascunho(aba)
  await db.from("automation_flows").update({ nome: `${NOME} de outro admin` }).eq("id", regraId).eq("workspace_id", ws)

  const outra = await contexto.newPage()
  outra.on("pageerror", (e) => erros.push(String(e)))
  await outra.goto(`${URL_PREVIEW}/configuracoes/automacoes/${regraId}`, { waitUntil: "networkidle" })
  await outra.waitForSelector(".react-flow__node")
  const faixaVelha = outra.getByRole("status").filter({ hasText: "Há alterações não salvas" })
  r.confere("rascunho de versão antiga: a faixa avisa", (await faixaVelha.innerText()).includes("salva depois disso"))
  await faixaVelha.getByRole("button", { name: "Descartar" }).click()
  r.confere("'Descartar' tira a faixa", (await outra.getByText("Há alterações não salvas").count()) === 0)
  r.confere(
    "e fica com o que está salvo",
    (await outra.getByRole("textbox", { name: "Nome da automação" }).inputValue()) === `${NOME} de outro admin`
  )
  r.confere("e apaga o rascunho", (await rascunhos(outra)).length === 0)

  r.confere("sem erro no console", erros.length === 0, erros.join(" | "))
  await browser.close()
  process.exit(r.imprimir() ? 1 : 0)
})().catch((e) => {
  console.error("PAROU:", e.message.split("\n")[0])
  process.exit(1)
})
