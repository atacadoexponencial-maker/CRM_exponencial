// Passos de tela que os roteiros repetem: montar regras no editor de automações e
// mover cards pelo funil. Recebem a página do Playwright e o endereço do preview.

/** Abre uma lista do painel (Select do Base UI) e escolhe a opção pelo texto. */
async function escolher(page, seletorCampo, opcao) {
  await page.locator(seletorCampo).click()
  await page.getByRole("option", { name: opcao, exact: true }).click()
}

/**
 * Adiciona um bloco pelo "+". Sem `bloco`, usa o único "+" livre do canvas (fluxo em
 * fila). O "+" só existe nas saídas livres: numa condição com o "sim" já ligado, o
 * "+" do "não" passa a ser o de índice 0.
 */
async function adicionarBloco(page, item, { bloco, indice = 0 } = {}) {
  const fechar = page.getByRole("button", { name: "Fechar painel" })
  if (await fechar.count()) await fechar.click()
  const escopo = bloco ? page.locator(".react-flow__node").filter({ hasText: bloco }) : page
  await escopo.getByRole("button", { name: "Adicionar o próximo bloco" }).nth(indice).click()
  await page.getByRole("dialog").getByRole("button", { name: item }).click()
  await page.waitForTimeout(300)
}

/** Regra nova com gatilho "card movido" para uma etapa do Funil de Entrada. */
async function novaRegra(page, url, nome, etapaDoGatilho) {
  await page.goto(`${url}/configuracoes/automacoes/nova`, { waitUntil: "networkidle" })
  await page.waitForSelector(".react-flow__node")
  await page.getByRole("textbox", { name: "Nome da automação" }).fill(nome)
  await page.locator(".react-flow__node").first().click()
  await escolher(page, "#painel-campo-funil", "Funil de Entrada")
  await escolher(page, "#painel-campo-etapa", etapaDoGatilho)
}

/** Salva e espera o editor remontar no endereço da regra (`?salva=1` no primeiro salvamento). */
async function salvarRegra(page) {
  const fechar = page.getByRole("button", { name: "Fechar painel" })
  if (await fechar.count()) await fechar.click()
  await page.getByRole("button", { name: "Salvar" }).click()
  await page.waitForURL(/\/configuracoes\/automacoes\/[0-9a-f-]{36}/, { timeout: 20000 })
  await page.waitForLoadState("networkidle")
  await page.waitForSelector(".react-flow__node")
  return new URL(page.url()).pathname.split("/").pop()
}

/** Move o card pelo painel do card no funil, como o time faz, e dá tempo para as automações rodarem. */
async function moverCard(page, url, nomeContato, etapa) {
  await page.goto(`${url}/pipeline`, { waitUntil: "networkidle" })
  await page.getByText(nomeContato, { exact: true }).first().click()
  await page.getByRole("button", { name: "Mover para etapa..." }).click()
  await page.getByRole("button", { name: etapa, exact: true }).last().click()
  await page.waitForTimeout(4000)
}

module.exports = { escolher, adicionarBloco, novaRegra, salvarRegra, moverCard }
