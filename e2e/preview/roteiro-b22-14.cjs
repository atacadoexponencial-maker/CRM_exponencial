/* eslint-disable @typescript-eslint/no-require-imports */
// B22-14 no preview, pela tela, com a empresa de teste no estado inicial (rode o
// resetar antes): botões de variável no campo "Mensagem" da ação "Enviar mensagem".
//  - O botão insere a variável onde está o cursor, e o cursor fica depois dela.
//  - Com um trecho selecionado, a variável entra no lugar dele.
// Uso: node e2e/preview/roteiro-b22-14.cjs <endereço do preview>

const { abrirPreview, bancoDeServico, conferirEmpresaDeTeste, criarRelatorio } = require("./comum.cjs")
const { adicionarBloco, novaRegra } = require("./tela.cjs")

const URL_PREVIEW = process.argv[2]

;(async () => {
  if (!URL_PREVIEW) throw new Error("passe o endereço do preview (veja endereco-preview.cjs)")
  const db = bancoDeServico()
  const { browser, page, erros, workspaceId: ws } = await abrirPreview(URL_PREVIEW)
  await conferirEmpresaDeTeste(db, ws)
  const r = criarRelatorio()
  const mensagem = () => page.locator("#painel-campo-texto")
  const botao = (rotulo) => page.getByRole("button", { name: rotulo, exact: true })

  await novaRegra(page, URL_PREVIEW, "B22-14 Variáveis", "Sondagem")
  await adicionarBloco(page, "Enviar mensagem")
  r.confere("o campo tem os 3 botões de variável", (await page.getByText("Inserir:").count()) === 1 &&
    (await botao("Nome do contato").count()) === 1 &&
    (await botao("Primeiro nome").count()) === 1 &&
    (await botao("Nome do vendedor").count()) === 1)

  // Cursor depois de "Oi "
  await mensagem().fill("Oi , tudo bem?")
  await mensagem().evaluate((el) => el.setSelectionRange(3, 3))
  await botao("Primeiro nome").click()
  r.confere("insere no cursor", (await mensagem().inputValue()) === "Oi {{primeiro_nome}}, tudo bem?", await mensagem().inputValue())

  // O cursor ficou depois da variável: a próxima entra logo em seguida
  await page.waitForTimeout(100)
  await page.keyboard.type("!")
  r.confere("o cursor fica depois da variável", (await mensagem().inputValue()) === "Oi {{primeiro_nome}}!, tudo bem?", await mensagem().inputValue())

  // Trecho selecionado: "tudo bem"
  await mensagem().evaluate((el) => el.setSelectionRange(23, 31))
  await botao("Nome do vendedor").click()
  r.confere(
    "com seleção, a variável entra no lugar dela",
    (await mensagem().inputValue()) === "Oi {{primeiro_nome}}!, {{nome_vendedor}}?",
    await mensagem().inputValue()
  )
  r.confere(
    "o bloco mostra a mensagem com as variáveis",
    (await page.locator(".react-flow__node").filter({ hasText: "{{nome_vendedor}}" }).count()) === 1
  )

  r.confere("sem erro no console", erros.length === 0, erros.join(" | "))
  await browser.close()
  process.exit(r.imprimir() ? 1 : 0)
})().catch((e) => {
  console.error("PAROU:", e.message.split("\n")[0])
  process.exit(1)
})
