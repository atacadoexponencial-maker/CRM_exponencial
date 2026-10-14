/* eslint-disable @typescript-eslint/no-require-imports */
// B22-10 no preview, pela tela, com a empresa de teste no estado inicial (rode o
// resetar antes): o resultado de "Testar com um contato" deixa de valer quando o
// fluxo muda.
//  - Arrastar um bloco não muda nada: o caminho continua marcado.
//  - Acrescentar um bloco tira o caminho do canvas, e a faixa avisa que o fluxo
//    mudou; "Testar de novo" testa o mesmo contato com o fluxo de agora.
// Uso: node e2e/preview/roteiro-b22-10.cjs <endereço do preview>

const { abrirPreview, bancoDeServico, conferirEmpresaDeTeste, criarRelatorio } = require("./comum.cjs")
const { adicionarBloco, escolher, novaRegra } = require("./tela.cjs")

const URL_PREVIEW = process.argv[2]

;(async () => {
  if (!URL_PREVIEW) throw new Error("passe o endereço do preview (veja endereco-preview.cjs)")
  const db = bancoDeServico()
  const { browser, page, erros, workspaceId: ws } = await abrirPreview(URL_PREVIEW)
  await conferirEmpresaDeTeste(db, ws)
  const r = criarRelatorio()
  const caminhoMarcado = () => page.locator(".react-flow__node .ring-emerald-500").count()
  const faixaVelha = () => page.getByText("o fluxo mudou depois do teste")

  await novaRegra(page, URL_PREVIEW, "B22-10 Teste velho", "Sondagem")
  await adicionarBloco(page, "Atribuir atendente")
  await escolher(page, "#painel-campo-atendente_id", "Admin Teste B11")
  await page.getByRole("button", { name: "Fechar painel" }).click()

  await page.getByRole("button", { name: /Testar/ }).click()
  await page.getByRole("textbox", { name: "Buscar contato" }).fill("Ana")
  await page.getByRole("button", { name: /Teste B11 Ana/ }).click()
  await page.getByText(/Simulação para Teste B11 Ana/).waitFor({ timeout: 20000 })
  r.confere("o teste mostra 1 ação", (await page.getByText(/1 ação seria feita/).count()) === 1)
  r.confere("e marca os 2 blocos do caminho", (await caminhoMarcado()) === 2, String(await caminhoMarcado()))

  // Arrastar o bloco da ação, longe da borda do canvas
  const caixa = await page.locator(".react-flow__node").nth(1).boundingBox()
  await page.mouse.move(caixa.x + caixa.width / 2, caixa.y + 15)
  await page.mouse.down()
  await page.mouse.move(caixa.x + caixa.width / 2 + 60, caixa.y + 45, { steps: 8 })
  await page.mouse.move(caixa.x + caixa.width / 2 + 120, caixa.y + 75, { steps: 8 })
  await page.mouse.up()
  const depois = await page.locator(".react-flow__node").nth(1).boundingBox()
  r.confere("o bloco foi arrastado", Math.abs(depois.x - caixa.x) > 50, `${caixa.x} → ${depois.x}`)
  r.confere("arrastar não invalida o teste", (await faixaVelha().count()) === 0 && (await caminhoMarcado()) === 2)

  // Acrescentar um bloco: o resultado deixa de valer
  await adicionarBloco(page, "Resolver a conversa")
  await page.getByRole("button", { name: "Fechar painel" }).click()
  r.confere("com bloco novo, a faixa avisa que o fluxo mudou", await faixaVelha().isVisible())
  r.confere("e o caminho sai do canvas", (await caminhoMarcado()) === 0, String(await caminhoMarcado()))

  await page.getByRole("button", { name: "Testar de novo" }).click()
  await page.getByText(/2 ações seriam feitas/).waitFor({ timeout: 20000 })
  r.confere("'Testar de novo' testa a Ana com o fluxo de agora", (await page.getByText(/Simulação para Teste B11 Ana/).count()) === 1)
  r.confere("e marca os 3 blocos", (await caminhoMarcado()) === 3, String(await caminhoMarcado()))

  await page.getByRole("button", { name: "Limpar" }).click()
  r.confere("'Limpar' tira a faixa", (await page.getByText(/Simulação para/).count()) === 0)

  r.confere("sem erro no console", erros.length === 0, erros.join(" | "))
  await browser.close()
  process.exit(r.imprimir() ? 1 : 0)
})().catch((e) => {
  console.error("PAROU:", e.message.split("\n")[0])
  process.exit(1)
})
