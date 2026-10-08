/* eslint-disable @typescript-eslint/no-require-imports */
// Confere que os itens de menu fazem o que prometem (decisões da B11, seção 9.4:
// o menu do Base UI só chama `onClick`, e os itens com `onSelect` não faziam nada).
// No chat, etiqueta, resolver e reabrir, conferidos no banco; em Configurações,
// os diálogos de etiquetas e times. Rode o resetar antes.
// Uso: node e2e/preview/roteiro-menus.cjs <endereço do preview>

const { abrirPreview, bancoDeServico, conferirEmpresaDeTeste, criarRelatorio } = require("./comum.cjs")

const URL_PREVIEW = process.argv[2]

const r = criarRelatorio()
;(async () => {
  if (!URL_PREVIEW) throw new Error("passe o endereço do preview (veja endereco-preview.cjs)")
  const db = bancoDeServico()
  const { browser, page, erros, workspaceId: ws } = await abrirPreview(URL_PREVIEW)
  await conferirEmpresaDeTeste(db, ws)
  const { data: ana } = await db.from("contacts").select("id").eq("workspace_id", ws).eq("name", "Teste B11 Ana").single()
  const { data: conv } = await db.from("conversations").select("id").eq("contact_id", ana.id).single()
  const etiquetasDaAna = async () => (await db.from("conversation_labels").select("label_id").eq("conversation_id", conv.id)).data.length
  const statusDaAna = async () => (await db.from("conversations").select("status").eq("id", conv.id).single()).data.status

  const menuDaConversa = async () => {
    await page.goto(`${URL_PREVIEW}/chat?conversa=${conv.id}`, { waitUntil: "networkidle" })
    await page.waitForTimeout(1000)
    await page.locator("button:has(svg.lucide-ellipsis-vertical), button:has(svg.lucide-more-vertical)").first().click()
  }

  // Chat: aplicar e remover etiqueta
  for (const [nome, esperado] of [["aplicar", 1], ["remover", 0]]) {
    await menuDaConversa()
    await page.getByRole("menuitem", { name: "Etiquetas" }).hover()
    await page.getByRole("menuitem", { name: /Interessado/ }).click()
    await page.waitForTimeout(3000)
    r.confere(`chat: ${nome} etiqueta pelo menu`, (await etiquetasDaAna()) === esperado)
  }

  // Chat: resolver e reabrir ("Resolver" só aparece com a conversa em atendimento)
  await menuDaConversa()
  await page.getByRole("menuitem", { name: "Resolver" }).click()
  await page.waitForTimeout(3000)
  r.confere("chat: resolver pelo menu", (await statusDaAna()) === "resolvida", await statusDaAna())
  await menuDaConversa()
  await page.getByRole("menuitem", { name: /Reabrir/ }).click()
  await page.waitForTimeout(3000)
  r.confere("chat: reabrir pelo menu", (await statusDaAna()) !== "resolvida", await statusDaAna())

  // Configurações: os itens abrem os diálogos
  await page.goto(`${URL_PREVIEW}/configuracoes/etiquetas`, { waitUntil: "networkidle" })
  await page.locator("tr", { hasText: "Interessado" }).getByRole("button").last().click()
  await page.getByRole("menuitem", { name: "Editar" }).click()
  r.confere("etiquetas: 'Editar' abre o diálogo", await page.getByRole("dialog").isVisible())
  await page.keyboard.press("Escape")

  await page.goto(`${URL_PREVIEW}/configuracoes/times`, { waitUntil: "networkidle" })
  await page.locator("button:has(svg.lucide-ellipsis), button:has(svg.lucide-more-horizontal)").first().click()
  await page.getByRole("menuitem").first().click()
  r.confere("times: o primeiro item do menu abre um diálogo", await page.getByRole("dialog").isVisible())
  await page.keyboard.press("Escape")

  r.confere("sem erro no console", erros.length === 0, erros.join(" | "))
  await browser.close()
  process.exit(r.imprimir() ? 1 : 0)
})().catch((e) => {
  // Mostra o que já passou: sem isso, a parada esconde até as verificações que deram certo
  r.imprimir()
  console.error("PAROU:", e.message.split("\n")[0])
  process.exit(1)
})
