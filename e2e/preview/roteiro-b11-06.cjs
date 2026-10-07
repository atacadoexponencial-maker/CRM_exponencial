/* eslint-disable @typescript-eslint/no-require-imports */
// "Pronto quando" da B11-06 no preview, pela tela, com a empresa de teste no
// estado inicial (rode o resetar antes). Monta 4 regras pelo editor:
//  A. tag "vip" adicionada → tipo Lojista → aplicar VIP → enviar mensagem
//  B. etiqueta VIP aplicada → tag "etiqueta-vip"
//  C. tipo do contato mudou para Lojista → tag "tipo-lojista"
//  D. classificação mudou para Ativo → tag "virou-cliente"
// e dispara pela tela: tag no perfil da Ana (A roda; B e C não, porque quem mudou
// foi a automação), tipo no perfil do Bruno (C), card da Carla para Ganho (D) e
// etiqueta pelo chat na conversa do Bruno (B).
// Uso: node e2e/preview/roteiro-b11-06.cjs <endereço do preview>

const { abrirPreview, bancoDeServico, conferirEmpresaDeTeste, criarRelatorio } = require("./comum.cjs")
const { adicionarBloco, escolher, moverCard, salvarRegra } = require("./tela.cjs")

const URL_PREVIEW = process.argv[2]

/** Regra nova com o gatilho escolhido; `configurar` preenche os parâmetros dele. */
async function regraCom(page, nome, gatilho, configurar) {
  await page.goto(`${URL_PREVIEW}/configuracoes/automacoes/nova`, { waitUntil: "networkidle" })
  await page.waitForSelector(".react-flow__node")
  await page.getByRole("textbox", { name: "Nome da automação" }).fill(nome)
  await page.locator(".react-flow__node").first().click()
  await escolher(page, "#painel-gatilho", gatilho)
  await configurar()
}

async function adicionarTagNoContato(page, nome, tag) {
  await adicionarBloco(page, "Adicionar tag ao contato")
  await page.locator("#painel-campo-tag").fill(tag)
  void nome
}

;(async () => {
  if (!URL_PREVIEW) throw new Error("passe o endereço do preview (veja endereco-preview.cjs)")
  const db = bancoDeServico()
  const { browser, page, erros, workspaceId: ws } = await abrirPreview(URL_PREVIEW)
  await conferirEmpresaDeTeste(db, ws)
  const r = criarRelatorio()

  const contato = async (nome) =>
    (await db.from("contacts").select("id").eq("workspace_id", ws).eq("name", `Teste B11 ${nome}`).single()).data.id
  const [ana, bruno, carla] = [await contato("Ana"), await contato("Bruno"), await contato("Carla")]
  const tags = async (id) => ((await db.from("contact_tags").select("tag").eq("contact_id", id)).data ?? []).map((t) => t.tag)
  const { data: vip } = await db.from("labels").insert({ workspace_id: ws, name: "VIP", color: "#eab308" }).select("id").single()

  // Regras
  await regraCom(page, "B11-06 A tag vip", "Tag adicionada ao contato", async () => {
    await page.locator("#painel-campo-tag").fill("vip")
  })
  await adicionarBloco(page, "Alterar dado do contato")
  await escolher(page, "#painel-campo-campo", "Tipo")
  await escolher(page, "#painel-campo-valor", "Lojista")
  await adicionarBloco(page, "Aplicar etiqueta à conversa")
  await escolher(page, "#painel-campo-label_id", "VIP")
  await adicionarBloco(page, "Enviar mensagem")
  await page.locator("#painel-campo-texto").fill("Oi, bem-vindo ao atendimento VIP")
  await salvarRegra(page)

  await regraCom(page, "B11-06 B etiqueta VIP", "Etiqueta aplicada à conversa", async () => {
    await escolher(page, "#painel-campo-label_id", "VIP")
  })
  await adicionarTagNoContato(page, "B", "etiqueta-vip")
  await salvarRegra(page)

  await regraCom(page, "B11-06 C tipo lojista", "Dado do contato alterado", async () => {
    await escolher(page, "#painel-campo-campo", "Tipo")
    await escolher(page, "#painel-campo-valor", "Lojista")
  })
  await adicionarTagNoContato(page, "C", "tipo-lojista")
  await salvarRegra(page)

  await regraCom(page, "B11-06 D virou cliente", "Dado do contato alterado", async () => {
    await escolher(page, "#painel-campo-campo", "Classificação")
    await escolher(page, "#painel-campo-valor", "Ativo")
  })
  await adicionarTagNoContato(page, "D", "virou-cliente")
  await salvarRegra(page)

  // 1. Tag "vip" pelo perfil da Ana
  await page.goto(`${URL_PREVIEW}/contatos/${ana}`, { waitUntil: "networkidle" })
  await page.getByPlaceholder("Nova tag (sem espaços)").fill("vip")
  await Promise.all([
    page.waitForResponse((res) => res.request().method() === "POST" && (res.request().postData() ?? "").includes('"vip"'), {
      timeout: 60000,
    }),
    page.getByRole("button", { name: "Adicionar", exact: true }).click(),
  ])
  const { data: dadosAna } = await db.from("contacts").select("tipo").eq("id", ana).single()
  const { data: convAna } = await db.from("conversations").select("id").eq("contact_id", ana).single()
  const { data: etiquetasAna } = await db.from("conversation_labels").select("label_id").eq("conversation_id", convAna.id)
  r.confere("A: tag vip pelo perfil → tipo Lojista", dadosAna.tipo === "lojista")
  r.confere("A: etiqueta VIP na conversa da Ana", etiquetasAna.some((e) => e.label_id === vip.id))
  const { data: execucaoA } = await db.from("automation_runs").select("resultado, caminho").eq("workspace_id", ws).eq("regra_nome", "B11-06 A tag vip").single()
  const envio = (execucaoA?.caminho ?? []).find((p) => p.bloco.acao === "enviar_mensagem")
  r.confere("A: o envio chegou a ser tentado e falhou só por falta de número", envio?.motivo === "Nenhum número de WhatsApp conectado", envio?.motivo)
  const tagsAna = await tags(ana)
  r.confere("automação não dispara automação: a etiqueta da regra A não disparou a B", !tagsAna.includes("etiqueta-vip"))
  r.confere("automação não dispara automação: o tipo mudado pela regra A não disparou a C", !tagsAna.includes("tipo-lojista"))

  // 2. Tipo pelo perfil do Bruno
  await page.goto(`${URL_PREVIEW}/contatos/${bruno}`, { waitUntil: "networkidle" })
  await page.getByRole("button", { name: "Editar" }).first().click()
  await page.locator("#edit-tipo").selectOption("lojista")
  await Promise.all([
    page.waitForResponse((res) => res.request().method() === "POST" && (res.request().postData() ?? "").includes('"lojista"'), {
      timeout: 60000,
    }),
    page.getByRole("button", { name: "Salvar" }).first().click(),
  ])
  r.confere("C: tipo editado no perfil do Bruno dispara 'dado alterado'", (await tags(bruno)).includes("tipo-lojista"))

  // 3. Card da Carla para Ganho: classificação vira Ativo
  await moverCard(page, URL_PREVIEW, "Teste B11 Carla", "Ganho")
  r.confere("D: card para Ganho muda a classificação para Ativo e dispara", (await tags(carla)).includes("virou-cliente"))

  // 4. Etiqueta pelo chat na conversa do Bruno (depende dos menus do chat, ver decisões 9.4)
  const { data: convBruno } = await db.from("conversations").select("id").eq("contact_id", bruno).single()
  await page.goto(`${URL_PREVIEW}/chat?conversa=${convBruno.id}`, { waitUntil: "networkidle" })
  await page.locator("button:has(svg.lucide-ellipsis-vertical), button:has(svg.lucide-more-vertical)").first().click()
  await page.getByRole("menuitem", { name: "Etiquetas" }).hover()
  await page.getByRole("menuitem", { name: /VIP/ }).click()
  await page.waitForTimeout(4000)
  r.confere(
    "B: etiqueta aplicada pelo chat dispara a regra (depende do conserto dos menus com onSelect)",
    (await tags(bruno)).includes("etiqueta-vip")
  )

  r.confere("sem erro no console", erros.length === 0, erros.join(" | "))
  await browser.close()
  process.exit(r.imprimir() ? 1 : 0)
})().catch((e) => {
  console.error("PAROU:", e.message.split("\n")[0])
  process.exit(1)
})
