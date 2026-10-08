/* eslint-disable @typescript-eslint/no-require-imports */
// "Pronto quando" da B11-11 e da B11-12 no preview, pela tela, com a empresa de
// teste no estado inicial (rode o resetar antes):
//  B11-11: ações de tag, tipo, observações e time; condição de tag com mover para
//          Ganho (cria o card na Recompra) e Perdido; remover tag e etiqueta.
//  B11-12: adicionar e remover tag pelo painel do card.
// Uso: node e2e/preview/roteiro-b11-11-e-12.cjs <endereço do preview>

const { abrirPreview, bancoDeServico, conferirEmpresaDeTeste, criarRelatorio } = require("./comum.cjs")
const { adicionarBloco, escolher, moverCard, novaRegra, salvarRegra } = require("./tela.cjs")

const URL_PREVIEW = process.argv[2]

;(async () => {
  if (!URL_PREVIEW) throw new Error("passe o endereço do preview (veja endereco-preview.cjs)")
  const db = bancoDeServico()
  const { browser, page, erros, workspaceId: ws } = await abrirPreview(URL_PREVIEW)
  await conferirEmpresaDeTeste(db, ws)
  const r = criarRelatorio()

  const contato = async (nome) =>
    (await db.from("contacts").select("id").eq("workspace_id", ws).eq("name", `Teste B11 ${nome}`).single()).data.id
  const [ana, bruno, carla] = [await contato("Ana"), await contato("Bruno"), await contato("Carla")]
  const admin = (await db.from("profiles").select("id").eq("workspace_id", ws).single()).data.id
  const card = async (contactId, funil = "entrada") =>
    (await db.from("pipeline_cards").select("etapa, atendente_id").eq("contact_id", contactId).eq("funil", funil).maybeSingle()).data
  const tags = async (contactId) => ((await db.from("contact_tags").select("tag").eq("contact_id", contactId)).data ?? []).map((t) => t.tag)

  // Ações de contato e time
  await novaRegra(page, URL_PREVIEW, "B11-11 Catálogo", "Catálogo Enviado")
  await adicionarBloco(page, "Adicionar tag ao contato")
  await page.locator("#painel-campo-tag").fill("interessado")
  await adicionarBloco(page, "Alterar dado do contato")
  await escolher(page, "#painel-campo-campo", "Tipo")
  await escolher(page, "#painel-campo-valor", "Lojista")
  await adicionarBloco(page, "Alterar dado do contato")
  await escolher(page, "#painel-campo-campo", "Observações (acrescentar linha)")
  await page.locator("#painel-campo-valor").fill("entrou em catálogo")
  await adicionarBloco(page, "Atribuir a um time")
  await escolher(page, "#painel-campo-time_id", "Entrada")
  await salvarRegra(page)

  await moverCard(page, URL_PREVIEW, "Teste B11 Ana", "Catálogo Enviado")
  const { data: dadosAna } = await db.from("contacts").select("tipo, observacoes").eq("id", ana).single()
  const { data: convAna } = await db.from("conversations").select("id, assigned_to").eq("contact_id", ana).single()
  r.confere("B11-11 tag 'interessado' adicionada", (await tags(ana)).includes("interessado"))
  r.confere("B11-11 tipo = lojista", dadosAna.tipo === "lojista")
  r.confere("B11-11 linha nas observações", (dadosAna.observacoes ?? "").includes("entrou em catálogo"))
  r.confere("B11-11 time Entrada: conversa e card com o único membro", convAna.assigned_to === admin && (await card(ana)).atendente_id === admin)

  // Condição de tag + mover para Ganho / Perdido
  await novaRegra(page, URL_PREVIEW, "B11-11 Nutrição", "Nutrição")
  await adicionarBloco(page, "Condição (sim / não)")
  await page.getByRole("button", { name: "Adicionar verificação" }).click()
  await page.getByRole("textbox", { name: "Valor" }).fill("interessado")
  await adicionarBloco(page, "Mover card para etapa", { bloco: "Condição", indice: 0 })
  await escolher(page, "#painel-campo-funil", "Funil de Entrada")
  await escolher(page, "#painel-campo-etapa", "Ganho")
  await adicionarBloco(page, "Mover card para etapa", { bloco: "Condição", indice: 0 })
  await escolher(page, "#painel-campo-funil", "Funil de Entrada")
  await escolher(page, "#painel-campo-etapa", "Perdido")
  await salvarRegra(page)

  await moverCard(page, URL_PREVIEW, "Teste B11 Ana", "Nutrição")
  await moverCard(page, URL_PREVIEW, "Teste B11 Bruno", "Nutrição")
  r.confere("B11-11 Ana (com a tag) foi para Ganho", (await card(ana)).etapa === "ganho")
  r.confere("B11-11 Ganho criou o card da Ana na Recompra, em Onboarding", (await card(ana, "recompra"))?.etapa === "onboarding")
  r.confere("B11-11 Bruno (sem a tag) foi para Perdido", (await card(bruno)).etapa === "perdido")

  // Remover tag e etiqueta
  await novaRegra(page, URL_PREVIEW, "B11-11 Negociação", "Negociação")
  await adicionarBloco(page, "Remover tag do contato")
  await escolher(page, "#painel-campo-tag", "interessado")
  await adicionarBloco(page, "Remover etiqueta da conversa")
  await escolher(page, "#painel-campo-label_id", "Interessado")
  await salvarRegra(page)
  await moverCard(page, URL_PREVIEW, "Teste B11 Ana", "Negociação")
  const { data: etiquetasAna } = await db.from("conversation_labels").select("label_id").eq("conversation_id", convAna.id)
  r.confere("B11-11 tag removida", !(await tags(ana)).includes("interessado"))
  r.confere("B11-11 etiqueta removida", etiquetasAna.length === 0)

  // B11-12: tags no painel do card
  await page.goto(`${URL_PREVIEW}/pipeline`, { waitUntil: "networkidle" })
  await page.getByText("Teste B11 Carla", { exact: true }).first().click()
  await page.getByRole("textbox", { name: "Nova tag" }).fill("vip")
  await page.getByRole("button", { name: "Adicionar", exact: true }).click()
  await page.waitForTimeout(2500)
  r.confere("B11-12 tag adicionada pelo painel do card", (await tags(carla)).includes("vip"))
  await page.goto(`${URL_PREVIEW}/contatos/${carla}`, { waitUntil: "networkidle" })
  r.confere("B11-12 a tag aparece no perfil do contato", (await page.getByText("vip", { exact: true }).count()) >= 1)
  await page.goto(`${URL_PREVIEW}/pipeline`, { waitUntil: "networkidle" })
  await page.getByText("Teste B11 Carla", { exact: true }).first().click()
  await page.getByRole("button", { name: "Remover tag vip" }).click()
  await page.waitForTimeout(2500)
  r.confere("B11-12 tag removida pelo painel do card", !(await tags(carla)).includes("vip"))

  r.confere("sem erro no console", erros.length === 0, erros.join(" | "))
  await browser.close()
  process.exit(r.imprimir() ? 1 : 0)
})().catch((e) => {
  console.error("PAROU:", e.message.split("\n")[0])
  process.exit(1)
})
