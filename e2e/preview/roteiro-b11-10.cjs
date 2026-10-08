/* eslint-disable @typescript-eslint/no-require-imports */
// "Pronto quando" da B11-10 no preview, pela tela, com a empresa de teste já no
// estado inicial (rode o resetar antes): monta pelo editor "card movido para
// Sondagem → conversa tem Interessado? sim: atribuir ao admin / não: aplicar
// Interessado", salva, simula, sai e volta, move os cards da Ana (sem etiqueta) e
// do Bruno (com) e confere no banco. Depois, a regra antiga: roda, é convertida
// no editor, a versão nova é pausada e a antiga para de rodar.
// Uso: node e2e/preview/roteiro-b11-10.cjs <endereço do preview>

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
  const card = async (contactId) =>
    (await db.from("pipeline_cards").select("etapa, atendente_id").eq("contact_id", contactId).eq("funil", "entrada").single()).data
  const conversa = async (contactId) =>
    (await db.from("conversations").select("id, assigned_to").eq("contact_id", contactId).single()).data

  // Lista com a regra antiga marcada
  await page.goto(`${URL_PREVIEW}/configuracoes/automacoes`, { waitUntil: "networkidle" })
  r.confere("lista mostra a regra antiga marcada", (await page.getByText("Versão antiga · continua rodando").count()) === 1)

  // Montar a regra pelo editor
  await novaRegra(page, URL_PREVIEW, "B11-10 Sondagem", "Sondagem")
  await adicionarBloco(page, "Condição (sim / não)", { bloco: "Gatilho" })
  await page.getByRole("button", { name: "Adicionar verificação" }).click()
  await page.getByRole("combobox", { name: "Atributo" }).click()
  await page.getByRole("option", { name: "Etiqueta da conversa" }).click()
  await page.getByRole("combobox", { name: "Valor" }).click()
  await page.getByRole("option", { name: "Interessado" }).click()
  await adicionarBloco(page, "Atribuir atendente", { bloco: "Condição", indice: 0 })
  await escolher(page, "#painel-campo-atendente_id", "Admin Teste B11")
  await adicionarBloco(page, "Aplicar etiqueta à conversa", { bloco: "Condição", indice: 0 })
  await escolher(page, "#painel-campo-label_id", "Interessado")
  const idSalvo = await salvarRegra(page)
  r.confere("salvar troca o endereço de 'nova' para o id", idSalvo !== "nova", idSalvo)
  r.confere("depois de remontar, o aviso 'Automação salva' continua na tela", (await page.getByText("Automação salva").count()) === 1)

  // Simular com a Ana (sem etiqueta: "não")
  await page.getByRole("button", { name: /Testar/ }).click()
  await page.getByRole("textbox", { name: "Buscar contato" }).fill("Ana")
  await page.getByRole("button", { name: /Teste B11 Ana/ }).click()
  await page.getByText(/Simulação para Teste B11 Ana/).waitFor({ timeout: 20000 })
  r.confere("simulação da Ana mostra 1 ação", (await page.getByText(/1 ação seria feita/).count()) === 1)

  // Sair e voltar
  await page.goto(`${URL_PREVIEW}/configuracoes/automacoes`, { waitUntil: "networkidle" })
  r.confere("lista mostra a regra nova", (await page.locator("tbody tr").filter({ hasText: "B11-10 Sondagem" }).count()) === 1)
  await page.goto(`${URL_PREVIEW}/configuracoes/automacoes/${idSalvo}`, { waitUntil: "networkidle" })
  await page.waitForSelector(".react-flow__node")
  r.confere("ao reabrir, os 4 blocos estão lá", (await page.locator(".react-flow__node").count()) === 4)

  // Mover os cards
  await moverCard(page, URL_PREVIEW, "Teste B11 Ana", "Sondagem")
  await moverCard(page, URL_PREVIEW, "Teste B11 Bruno", "Sondagem")
  const convAna = await conversa(ana)
  const { data: etiquetasAna } = await db.from("conversation_labels").select("label_id").eq("conversation_id", convAna.id)
  r.confere("Ana (sem etiqueta) ganhou a etiqueta pelo 'não' e não foi atribuída", etiquetasAna.length === 1 && convAna.assigned_to === null)
  r.confere("Bruno (com etiqueta) foi atribuído ao admin pelo 'sim'", (await conversa(bruno)).assigned_to === admin)
  r.confere("card do Bruno em Sondagem e com o admin", (await card(bruno)).etapa === "sondagem" && (await card(bruno)).atendente_id === admin)

  // Regra antiga: roda, é convertida, a versão nova pausada, a antiga para
  await moverCard(page, URL_PREVIEW, "Teste B11 Carla", "Follow do Catálogo")
  r.confere("regra antiga roda no branch (Carla atribuída ao admin)", (await card(carla)).atendente_id === admin)
  await db.from("pipeline_cards").update({ etapa: "lead", atendente_id: null }).eq("contact_id", carla).eq("funil", "entrada")

  await page.goto(`${URL_PREVIEW}/configuracoes/automacoes`, { waitUntil: "networkidle" })
  await page.getByRole("button", { name: /Regra antiga: follow do catálogo/ }).first().click()
  await page.waitForURL(/nova\?antiga=/)
  await page.waitForSelector(".react-flow__node")
  await salvarRegra(page)
  await page.goto(`${URL_PREVIEW}/configuracoes/automacoes`, { waitUntil: "networkidle" })
  r.confere("depois de salvar, a regra antiga sai da lista", (await page.getByText("Versão antiga · continua rodando").count()) === 0)
  await page.getByRole("switch", { name: "Pausar Regra antiga: follow do catálogo" }).click()
  await page.waitForTimeout(2500)
  const { data: versaoNova } = await db
    .from("automation_flows")
    .select("ativa, automation_id")
    .eq("workspace_id", ws)
    .eq("nome", "Regra antiga: follow do catálogo")
    .single()
  r.confere("versão nova guarda a antiga e foi pausada pela lista", versaoNova.automation_id !== null && !versaoNova.ativa)
  await moverCard(page, URL_PREVIEW, "Teste B11 Carla", "Follow do Catálogo")
  r.confere("com a versão nova pausada, a antiga não roda no branch", (await card(carla)).atendente_id === null)

  r.confere("sem erro no console", erros.length === 0, erros.join(" | "))
  await browser.close()
  process.exit(r.imprimir() ? 1 : 0)
})().catch((e) => {
  console.error("PAROU:", e.message.split("\n")[0])
  process.exit(1)
})
