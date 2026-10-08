/* eslint-disable @typescript-eslint/no-require-imports */
// B11-09 no preview, com a empresa de teste no estado inicial (rode o resetar
// antes). O "Pronto quando" mede o webhook e a mensagem da regra, que dependem da
// B11-04 e do chip; aqui fica o que dá para conferir sem eles:
//  1. A função do banco que entrega o próximo evento, chamada direto: dois
//     pedidos ao mesmo tempo levam um evento só, nada sai enquanto um evento do
//     contato roda, e evento interrompido ou esperando demais é descartado.
//  2. Pela tela: o card movido responde antes de as regras rodarem (o evento
//     ainda está na fila na resposta), a regra roda em até 30 segundos, e uma
//     ação com etiqueta apagada falha sem desfazer o movimento do card.
// Uso: node e2e/preview/roteiro-b11-09.cjs <endereço do preview>

const { randomUUID } = require("crypto")
const { abrirPreview, bancoDeServico, conferirEmpresaDeTeste, criarRelatorio, esperarAutomacoes } = require("./comum.cjs")
const { adicionarBloco, escolher, novaRegra, salvarRegra } = require("./tela.cjs")

const URL_PREVIEW = process.argv[2]
const MINUTO = 60_000

const r = criarRelatorio()
;(async () => {
  if (!URL_PREVIEW) throw new Error("passe o endereço do preview (veja endereco-preview.cjs)")
  const db = bancoDeServico()
  const { browser, page, erros, workspaceId: ws } = await abrirPreview(URL_PREVIEW)
  await conferirEmpresaDeTeste(db, ws)

  // 1. A função do banco, com uma chave só deste teste
  const chave = `roteiro-b11-09:${randomUUID()}`
  const atras = (ms) => new Date(Date.now() - ms).toISOString()
  const enfileirar = async (nome, criadoHa = 0) =>
    (
      await db
        .from("automation_queue")
        .insert({ workspace_id: ws, chave, evento: { nome }, created_at: atras(criadoHa) })
        .select("id")
        .single()
    ).data.id
  const pedir = async () => {
    const { data, error } = await db.rpc("reivindicar_evento_de_automacao", { p_chave: chave })
    if (error) throw new Error(error.message)
    return data?.[0]?.evento?.nome ?? null
  }
  const status = async (id) => (await db.from("automation_queue").select("status").eq("id", id).single()).data.status

  const a = await enfileirar("A", 2000)
  await enfileirar("B", 1000)
  const juntos = (await Promise.all([pedir(), pedir()])).sort()
  r.confere("fila: dois pedidos ao mesmo tempo levam um evento só, o mais antigo", juntos.join(",") === ",A", juntos.join(","))
  r.confere("fila: com A rodando, nada sai para o mesmo contato", (await pedir()) === null)
  await db.from("automation_queue").delete().eq("id", a)
  r.confere("fila: A terminou, sai o B", (await pedir()) === "B")

  const { data: b } = await db.from("automation_queue").select("id").eq("chave", chave).eq("status", "processando").single()
  await db.from("automation_queue").update({ iniciado_em: atras(6 * MINUTO) }).eq("id", b.id)
  await enfileirar("C")
  r.confere("fila: evento rodando há mais de 5 minutos não trava a fila", (await pedir()) === "C")
  r.confere("fila: e é descartado, não repetido", (await status(b.id)) === "descartado")

  await db.from("automation_queue").delete().eq("chave", chave).eq("status", "processando")
  const d = await enfileirar("D", 11 * MINUTO)
  r.confere("fila: evento esperando há mais de 10 minutos não roda", (await pedir()) === null)
  r.confere("fila: e é descartado", (await status(d)) === "descartado")
  await db.from("automation_queue").delete().eq("chave", chave)

  // 2. Pela tela: regra com uma etiqueta que vai ser apagada e várias ações depois dela
  const { data: temporaria } = await db
    .from("labels")
    .insert({ workspace_id: ws, name: "Temporária", color: "#64748b" })
    .select("id")
    .single()
  await novaRegra(page, URL_PREVIEW, "B11-09 Sondagem", "Sondagem")
  await adicionarBloco(page, "Aplicar etiqueta à conversa")
  await escolher(page, "#painel-campo-label_id", "Temporária")
  for (const tag of ["fila-1", "fila-2", "fila-3", "fila-4"]) {
    await adicionarBloco(page, "Adicionar tag ao contato")
    await page.locator("#painel-campo-tag").fill(tag)
  }
  await salvarRegra(page)
  await db.from("labels").delete().eq("id", temporaria.id)

  const { data: ana } = await db.from("contacts").select("id").eq("workspace_id", ws).eq("name", "Teste B11 Ana").single()
  await page.goto(`${URL_PREVIEW}/pipeline`, { waitUntil: "networkidle" })
  await page.getByText("Teste B11 Ana", { exact: true }).first().click()
  await page.getByRole("button", { name: "Mover para etapa..." }).click()
  const inicio = Date.now()
  await Promise.all([
    page.waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        new URL(res.url()).pathname === "/pipeline" &&
        (res.request().postData() ?? "").includes('"sondagem"'),
      { timeout: 60000 }
    ),
    page.getByRole("button", { name: "Sondagem", exact: true }).last().click(),
  ])
  const respostaEm = Date.now() - inicio
  const { count: naFila } = await db
    .from("automation_queue")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", ws)
    .in("status", ["pendente", "processando"])
  r.confere("tela: a ação responde com o evento ainda na fila (as regras rodam depois)", naFila > 0, `${naFila} na fila`)

  const esperou = await esperarAutomacoes(db, ws)
  r.confere(
    "tela: a regra roda em até 30 segundos depois da resposta",
    esperou <= 30000,
    `resposta em ${respostaEm} ms; fila vazia ${esperou} ms depois`
  )

  const { data: card } = await db.from("pipeline_cards").select("etapa").eq("contact_id", ana.id).eq("funil", "entrada").single()
  r.confere("tela: a etiqueta apagada não desfaz o movimento do card", card.etapa === "sondagem", card.etapa)
  const { data: execucao } = await db
    .from("automation_runs")
    .select("resultado, caminho")
    .eq("workspace_id", ws)
    .eq("regra_nome", "B11-09 Sondagem")
    .maybeSingle()
  const etiqueta = execucao?.caminho.find((p) => p.bloco.acao === "aplicar_etiqueta")
  const { data: tags } = await db.from("contact_tags").select("tag").eq("contact_id", ana.id)
  r.confere(
    "tela: o histórico mostra a falha da etiqueta, e as ações seguintes rodaram",
    execucao?.resultado === "falhou" &&
      etiqueta?.motivo === "A etiqueta não existe mais" &&
      ["fila-1", "fila-2", "fila-3", "fila-4"].every((t) => tags.some((x) => x.tag === t)),
    `${execucao?.resultado} / ${etiqueta?.motivo} / ${tags.map((t) => t.tag).join(",")}`
  )

  r.confere("sem erro no console", erros.length === 0, erros.join(" | "))
  await browser.close()
  process.exit(r.imprimir() ? 1 : 0)
})().catch((e) => {
  // Mostra o que já passou antes da parada
  r.imprimir()
  console.error("PAROU:", e.message.split("\n")[0])
  process.exit(1)
})
