/* eslint-disable @typescript-eslint/no-require-imports */
// B22-08 no preview, pela tela, com a empresa de teste no estado inicial (rode o
// resetar antes): aviso ao sair do editor sem salvar e rascunho no navegador.
//  - Regra nova editada: "Alterações não salvas", "Automações" pede confirmação,
//    recarregar passa pelo aviso do navegador, e o rascunho fica guardado.
//  - Recarregada, a página oferece o rascunho; recuperar e salvar apaga o rascunho.
//  - Depois de salvar, editar tira o "Automação salva"; "Sair sem salvar" sai,
//    apaga o rascunho e não grava nada.
//  - Rascunho de uma versão que mudou depois (outro admin salvou): a faixa avisa,
//    e "Descartar" fica com o que está salvo.
// Usa uma aba só: a página do `abrirPreview` não deixa abrir outra com o mesmo
// armazenamento. Recarregar faz o papel de fechar a aba e voltar.
// Uso: node e2e/preview/roteiro-b22-08.cjs <endereço do preview>

const { abrirPreview, bancoDeServico, conferirEmpresaDeTeste, criarRelatorio } = require("./comum.cjs")
const { adicionarBloco, escolher, novaRegra, salvarRegra } = require("./tela.cjs")

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
  const naoSalvas = () => page.getByText("Alterações não salvas", { exact: true })
  const campoNome = () => page.getByRole("textbox", { name: "Nome da automação" })
  const faixa = () => page.getByRole("status").filter({ hasText: "Há alterações não salvas" })
  const abrirEditor = async (caminho) => {
    await page.goto(`${URL_PREVIEW}/configuracoes/automacoes/${caminho}`, { waitUntil: "networkidle" })
    await page.waitForSelector(".react-flow__node")
  }

  // O aviso do navegador ao sair da página: conta e deixa sair
  let avisosDoNavegador = 0
  page.on("dialog", async (d) => {
    if (d.type() === "beforeunload") avisosDoNavegador++
    await d.accept()
  })

  // Regra nova, editada e não salva
  await novaRegra(page, URL_PREVIEW, NOME, "Sondagem")
  await adicionarBloco(page, "Atribuir atendente")
  await escolher(page, "#painel-campo-atendente_id", "Admin Teste B11")
  await page.getByRole("button", { name: "Fechar painel" }).click()
  r.confere("regra nova editada mostra 'Alterações não salvas'", await naoSalvas().isVisible())

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

  // Recarregar: o navegador pergunta antes, e a página volta oferecendo o rascunho
  await page.reload({ waitUntil: "networkidle" })
  await page.waitForSelector(".react-flow__node")
  r.confere("recarregar com alteração passa pelo aviso do navegador", avisosDoNavegador === 1, String(avisosDoNavegador))
  r.confere("editor oferece o rascunho ao abrir", await faixa().isVisible())
  r.confere("a faixa não fala em versão mais nova", !(await faixa().innerText()).includes("salva depois"))
  await faixa().getByRole("button", { name: "Recuperar" }).click()
  r.confere("'Recuperar' devolve o nome", (await campoNome().inputValue()) === NOME)
  r.confere("o gatilho volta configurado", (await page.locator(".react-flow__node").first().innerText()).includes("Sondagem"))
  r.confere("a ação volta configurada", (await page.locator(".react-flow__node").nth(1).innerText()).includes("Admin Teste B11"))

  const regraId = await salvarRegra(page)
  r.confere("salvar apaga o rascunho", (await rascunhos(page)).length === 0, (await rascunhos(page)).join(","))
  r.confere("logo depois de salvar não há 'Alterações não salvas'", !(await naoSalvas().isVisible()))
  r.confere("'Automação salva' aparece", await page.getByText("Automação salva").isVisible())

  // Editar depois de salvar
  await campoNome().fill(`${NOME} editado`)
  r.confere("editar tira o 'Automação salva'", !(await page.getByText("Automação salva").isVisible()))
  r.confere("e mostra 'Alterações não salvas'", await naoSalvas().isVisible())
  await campoNome().fill(NOME)
  r.confere("voltar ao que está salvo tira o 'Alterações não salvas'", !(await naoSalvas().isVisible()))

  await campoNome().fill(`${NOME} editado`)
  await esperarRascunho(page)
  r.confere("rascunho da regra salva guardado", (await rascunhos(page)).some((k) => k.endsWith(`:${regraId}`)))
  await page.getByRole("button", { name: "Automações", exact: true }).click()
  await page.getByRole("dialog").getByRole("button", { name: "Sair sem salvar" }).click()
  await page.waitForURL(/\/configuracoes\/automacoes$/, { timeout: 20000 })
  r.confere("'Sair sem salvar' vai para a lista", true)
  r.confere("e apaga o rascunho", (await rascunhos(page)).length === 0)
  const { data: gravada } = await db.from("automation_flows").select("nome").eq("id", regraId).single()
  r.confere("e não grava a edição", gravada?.nome === NOME, gravada?.nome)

  // Sem edição, abrir e sair não pergunta nada
  await abrirEditor(regraId)
  r.confere("regra salva abre sem 'Alterações não salvas'", !(await naoSalvas().isVisible()))
  r.confere("e sem faixa de rascunho", (await page.getByText("Há alterações não salvas").count()) === 0)
  await page.getByRole("button", { name: "Automações", exact: true }).click()
  await page.waitForURL(/\/configuracoes\/automacoes$/, { timeout: 20000 })
  r.confere("sem alteração, 'Automações' sai direto", true)

  // Rascunho de uma versão que mudou depois: outro admin salva enquanto o rascunho espera
  await abrirEditor(regraId)
  await campoNome().fill(`${NOME} do rascunho`)
  await esperarRascunho(page)
  await db.from("automation_flows").update({ nome: `${NOME} de outro admin` }).eq("id", regraId).eq("workspace_id", ws)
  await abrirEditor(regraId)
  r.confere("rascunho de versão antiga: a faixa avisa", (await faixa().innerText()).includes("salva depois disso"))
  await faixa().getByRole("button", { name: "Descartar" }).click()
  r.confere("'Descartar' tira a faixa", (await page.getByText("Há alterações não salvas").count()) === 0)
  r.confere("e fica com o que está salvo", (await campoNome().inputValue()) === `${NOME} de outro admin`)
  r.confere("e apaga o rascunho", (await rascunhos(page)).length === 0)

  r.confere("sem erro no console", erros.length === 0, erros.join(" | "))
  await browser.close()
  process.exit(r.imprimir() ? 1 : 0)
})().catch((e) => {
  console.error("PAROU:", e.message.split("\n")[0])
  process.exit(1)
})
