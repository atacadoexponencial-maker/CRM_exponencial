/* eslint-disable @typescript-eslint/no-require-imports */
// B22-12 no preview, pela tela, com a empresa de teste no estado inicial (rode o
// resetar antes): o campo de horas de "no máximo a cada N horas".
//  - Dá para apagar o número e digitar outro (antes, apagar virava "1").
//  - Fração e mais de um ano ficam em vermelho no painel, e o Salvar recusa.
//  - Com um número válido, salva.
// Uso: node e2e/preview/roteiro-b22-12.cjs <endereço do preview>

const { abrirPreview, bancoDeServico, conferirEmpresaDeTeste, criarRelatorio } = require("./comum.cjs")
const { adicionarBloco, escolher, novaRegra, salvarRegra } = require("./tela.cjs")

const URL_PREVIEW = process.argv[2]
const ERRO = "Use um número inteiro de 1 a 8760 horas."

;(async () => {
  if (!URL_PREVIEW) throw new Error("passe o endereço do preview (veja endereco-preview.cjs)")
  const db = bancoDeServico()
  const { browser, page, erros, workspaceId: ws } = await abrirPreview(URL_PREVIEW)
  await conferirEmpresaDeTeste(db, ws)
  const r = criarRelatorio()
  const horas = () => page.getByRole("textbox", { name: "Horas entre execuções" })
  const erroVisivel = () => page.getByText(ERRO).isVisible()

  await novaRegra(page, URL_PREVIEW, "B22-12 Horas", "Sondagem")
  await escolher(page, "#painel-repeticao", "No máximo a cada N horas por contato")
  r.confere("começa em 24 horas", (await horas().inputValue()) === "24")

  await horas().fill("")
  r.confere("apagar deixa o campo vazio", (await horas().inputValue()) === "", await horas().inputValue())
  r.confere("vazio mostra o aviso", await erroVisivel())

  await horas().pressSequentially("48")
  r.confere("digitar 48 dá 48", (await horas().inputValue()) === "48", await horas().inputValue())
  r.confere("48 não mostra aviso", !(await erroVisivel()))
  r.confere("o bloco mostra 48 horas", (await page.locator(".react-flow__node").first().innerText()).includes("a cada 48 horas"))

  await horas().fill("1,5")
  r.confere("1,5 mostra o aviso", await erroVisivel())
  await horas().fill("99999")
  r.confere("99999 mostra o aviso", await erroVisivel())

  await adicionarBloco(page, "Resolver a conversa")
  await page.getByRole("button", { name: "Salvar", exact: true }).click()
  r.confere(
    "Salvar com horas inválidas recusa e diz onde corrigir",
    await page.getByRole("alert").filter({ hasText: "Corrija as horas da repetição, no gatilho" }).isVisible()
  )
  r.confere("e continua em 'nova'", page.url().endsWith("/configuracoes/automacoes/nova"))

  await page.locator(".react-flow__node").first().click()
  await horas().fill("48")
  const regraId = await salvarRegra(page)
  const { data: gravada } = await db.from("automation_flows").select("repeticao").eq("id", regraId).single()
  r.confere("com 48, salva com 48 horas", gravada?.repeticao?.modo === "a_cada_horas" && gravada.repeticao.horas === 48)

  await db.from("automation_flows").delete().eq("workspace_id", ws).eq("id", regraId)

  r.confere("sem erro no console", erros.length === 0, erros.join(" | "))
  await browser.close()
  process.exit(r.imprimir() ? 1 : 0)
})().catch((e) => {
  console.error("PAROU:", e.message.split("\n")[0])
  process.exit(1)
})
