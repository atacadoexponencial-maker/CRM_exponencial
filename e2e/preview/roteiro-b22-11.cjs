/* eslint-disable @typescript-eslint/no-require-imports */
// B22-11 no preview, pela tela, com a empresa de teste no estado inicial (rode o
// resetar antes): "Testar com um contato" só roda com o fluxo completo.
//  - Condição sem verificação: o teste não abre, o bloco fica marcado e o aviso
//    diz o que falta.
//  - Completada a condição, o teste roda.
// Uso: node e2e/preview/roteiro-b22-11.cjs <endereço do preview>

const { abrirPreview, bancoDeServico, conferirEmpresaDeTeste, criarRelatorio } = require("./comum.cjs")
const { adicionarBloco, escolher, novaRegra } = require("./tela.cjs")

const URL_PREVIEW = process.argv[2]

;(async () => {
  if (!URL_PREVIEW) throw new Error("passe o endereço do preview (veja endereco-preview.cjs)")
  const db = bancoDeServico()
  const { browser, page, erros, workspaceId: ws } = await abrirPreview(URL_PREVIEW)
  await conferirEmpresaDeTeste(db, ws)
  const r = criarRelatorio()
  const blocoCondicao = () => page.locator(".react-flow__node").filter({ hasText: "Condição" })

  await novaRegra(page, URL_PREVIEW, "B22-11 Teste incompleto", "Sondagem")
  await adicionarBloco(page, "Condição (sim / não)")
  await adicionarBloco(page, "Resolver a conversa", { bloco: "Condição", indice: 0 })
  await page.getByRole("button", { name: "Fechar painel" }).click()

  await page.getByRole("button", { name: /Testar/ }).click()
  await page.waitForTimeout(500)
  r.confere("condição vazia: a busca de contato não abre", (await page.getByRole("textbox", { name: "Buscar contato" }).count()) === 0)
  r.confere("o aviso diz o que falta antes de testar", await page.getByRole("alert").filter({ hasText: "antes de testar" }).isVisible())
  r.confere(
    "o bloco da condição fica marcado",
    (await blocoCondicao().locator(".border-destructive").count()) === 1
  )

  // Completar a condição
  await blocoCondicao().click()
  await page.getByRole("button", { name: "Adicionar verificação" }).click()
  await escolher(page, '[aria-label="Atributo"]', "Etiqueta da conversa")
  await escolher(page, '[aria-label="Valor"]', "Interessado")
  await page.getByRole("button", { name: "Fechar painel" }).click()

  await page.getByRole("button", { name: /Testar/ }).click()
  await page.getByRole("textbox", { name: "Buscar contato" }).fill("Ana")
  await page.getByRole("button", { name: /Teste B11 Ana/ }).click()
  await page.getByText(/Simulação para Teste B11 Ana/).waitFor({ timeout: 20000 })
  r.confere("completo, o teste roda", (await page.getByText(/nenhuma ação seria feita/).count()) === 1)

  r.confere("sem erro no console", erros.length === 0, erros.join(" | "))
  await browser.close()
  process.exit(r.imprimir() ? 1 : 0)
})().catch((e) => {
  console.error("PAROU:", e.message.split("\n")[0])
  process.exit(1)
})
