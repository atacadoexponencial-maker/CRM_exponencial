/* eslint-disable @typescript-eslint/no-require-imports */
// "Pronto quando" da B28-02 e da B28-03 no preview, com a empresa de teste no estado
// inicial (rode o resetar antes). Monta 2 regras pelo editor, as duas com o gatilho
// "mensagem recebida" e repetição "sempre":
//  A. tag "b28-antes" → esperar 1 minuto → tag "b28-depois"
//  B. esperar a resposta (sem o tempo, teto de 30 dias) → texto contém "sim" → tag "b28-sim"
// e manda ao webhook do gateway no preview mensagens simuladas da Ana, assinadas como
// o gateway assina (`enviarEventoDoGateway`). O relógio das esperas é chamado à mão,
// assinado do mesmo jeito: no preview, o gateway não chama (ele chama a produção).
//
// Como no roteiro da B11-04, uma conexão temporária ("removed") deixa o webhook achar
// a empresa pelo `instance_id`. Nenhuma mensagem é enviada. No fim, o roteiro apaga as
// regras, as execuções, as tags, as mensagens simuladas e a conexão.
// Uso: node e2e/preview/roteiro-b28-esperas.cjs <endereço do preview>

const { createHmac } = require("crypto")
const {
  abrirPreview,
  bancoDeServico,
  conferirEmpresaDeTeste,
  criarRelatorio,
  enviarEventoDoGateway,
  esperarAutomacoes,
  lerEnv,
} = require("./comum.cjs")
const { adicionarBloco, escolher, salvarRegra } = require("./tela.cjs")

const URL_PREVIEW = process.argv[2]
const RODADA = Date.now()
const INSTANCIA = `b28-simulada-${RODADA}`
const PREFIXO_MENSAGEM = "b28-sim-"
const TELEFONE_ANA = "5500000000101"
const TAGS = ["b28-antes", "b28-depois", "b28-sim"]

let sequencia = 0
const proximoId = () => `${RODADA}-${++sequencia}`

/** Chama o relógio das esperas no preview, assinado como o gateway assina (A11-01). */
async function chamarRelogio(env = lerEnv()) {
  const corpo = JSON.stringify({ em: new Date().toISOString() })
  const resposta = await fetch(`${URL_PREVIEW}/api/automacoes/relogio`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-gateway-signature-256": "sha256=" + createHmac("sha256", env.GATEWAY_WEBHOOK_SECRET).update(corpo).digest("hex"),
      "x-vercel-protection-bypass": env.VERCEL_AUTOMATION_BYPASS_SECRET,
    },
    body: corpo,
  })
  return { status: resposta.status, corpo: await resposta.json().catch(() => null) }
}

/** Regra nova com o gatilho "mensagem recebida" e repetição "sempre". */
async function regraDeMensagem(page, nome) {
  await page.goto(`${URL_PREVIEW}/configuracoes/automacoes/nova`, { waitUntil: "networkidle" })
  await page.waitForSelector(".react-flow__node")
  await page.getByRole("textbox", { name: "Nome da automação" }).fill(nome)
  await page.locator(".react-flow__node").first().click()
  await escolher(page, "#painel-gatilho", "Mensagem recebida do cliente")
  await escolher(page, "#painel-repeticao", "Sempre (a cada disparo)")
}

;(async () => {
  if (!URL_PREVIEW) throw new Error("passe o endereço do preview (veja endereco-preview.cjs)")
  const db = bancoDeServico()
  const { browser, page, erros, workspaceId: ws } = await abrirPreview(URL_PREVIEW)
  await conferirEmpresaDeTeste(db, ws)
  const r = criarRelatorio()
  const regras = []

  const { data: ana } = await db.from("contacts").select("id").eq("workspace_id", ws).eq("name", "Teste B11 Ana").single()
  const { data: conversaAna } = await db
    .from("conversations")
    .select("id, last_message_text, last_message_at, unread_count, whatsapp_connection_id")
    .eq("contact_id", ana.id)
    .single()
  const temTag = async (tag) =>
    ((await db.from("contact_tags").select("tag").eq("contact_id", ana.id)).data ?? []).some((t) => t.tag === tag)
  const execucoesDa = async (regraId) =>
    (await db.from("automation_runs").select("id, resultado, motivo, caminho, retomar_em").eq("regra_id", regraId).order("created_at")).data ?? []

  const { error: erroConexao } = await db.from("whatsapp_connections").insert({
    workspace_id: ws,
    canal: "gateway",
    status: "removed",
    instance_id: INSTANCIA,
    instance_token: "simulado-sem-uso",
    display_name: "[TESTE] simulada B28",
  })
  if (erroConexao) throw new Error(`conexão temporária: ${erroConexao.message}`)

  /** Manda a mensagem de texto da Ana e espera as regras rodarem. */
  async function mensagem(texto) {
    const resposta = await enviarEventoDoGateway(URL_PREVIEW, {
      event_id: `b28-${proximoId()}`,
      type: "message.received",
      instance_id: INSTANCIA,
      timestamp: new Date().toISOString(),
      data: { message_id: `${PREFIXO_MENSAGEM}${proximoId()}`, from: TELEFONE_ANA, from_is_lid: false, type: "text", text: texto },
    })
    await esperarAutomacoes(db, ws)
    return resposta
  }

  try {
    // ── B28-02: esperar 1 minuto ──────────────────────────────────────────────
    await regraDeMensagem(page, "B28 A esperar 1 minuto")
    await adicionarBloco(page, "Adicionar tag ao contato")
    await page.locator("#painel-campo-tag").fill("b28-antes")
    await adicionarBloco(page, "Esperar")
    r.confere(
      "o bloco 'Esperar' nasce com o tempo ligado em 1 dia",
      (await page.getByRole("checkbox", { name: /Passar um tempo/ }).isChecked()) &&
        (await page.getByLabel("Quanto tempo").inputValue()) === "1"
    )
    await page.getByLabel("Quanto tempo").fill("1")
    await escolher(page, '[aria-label="Unidade do tempo"]', "minutos")
    r.confere("a saída do bloco diz 'Depois de 1 minuto'", (await page.getByText("Depois de 1 minuto").count()) >= 1)
    await adicionarBloco(page, "Adicionar tag ao contato", { bloco: "Esperar" })
    await page.locator("#painel-campo-tag").fill("b28-depois")
    const regraA = await salvarRegra(page)
    regras.push(regraA)

    const oi = await mensagem("oi")
    r.confere("o webhook do preview aceita a mensagem assinada", oi.status === 200, `${oi.status} ${oi.corpo}`)
    const [esperandoA] = await execucoesDa(regraA)
    r.confere("a ação antes do bloco roda na hora", await temTag("b28-antes"))
    r.confere("a ação depois do bloco espera", !(await temTag("b28-depois")))
    r.confere("a execução fica 'esperando'", esperandoA?.resultado === "esperando", esperandoA?.resultado)
    const espera = new Date(esperandoA.retomar_em).getTime() - new Date(esperandoA.caminho.at(-1).desde).getTime()
    r.confere("o relógio vai seguir 1 minuto depois de o contato entrar no bloco", espera === 60_000, `${espera} ms`)

    await page.goto(`${URL_PREVIEW}/configuracoes/automacoes/historico`, { waitUntil: "networkidle" })
    r.confere("o histórico mostra o selo 'Esperando'", (await page.getByText("Esperando", { exact: true }).count()) >= 1)

    await mensagem("oi de novo")
    const [, segunda] = await execucoesDa(regraA)
    r.confere(
      "o contato esperando não recomeça a regra (repetição 'sempre')",
      segunda?.resultado === "ignorada" && segunda?.motivo === "O contato já está esperando nesta regra",
      `${segunda?.resultado}: ${segunda?.motivo}`
    )

    const cedo = await chamarRelogio()
    r.confere("o relógio assinado responde 200", cedo.status === 200, JSON.stringify(cedo.corpo))
    r.confere("antes do minuto, a espera não segue", !(await temTag("b28-depois")))

    const falta = new Date(esperandoA.retomar_em).getTime() - Date.now()
    if (falta > 0) await page.waitForTimeout(falta + 2_000)
    const naHora = await chamarRelogio()
    const [seguida] = await execucoesDa(regraA)
    r.confere("passado o minuto, o relógio segue a espera", (naHora.corpo?.seguidas ?? 0) >= 1, JSON.stringify(naHora.corpo))
    r.confere("a ação depois do bloco roda", await temTag("b28-depois"))
    r.confere(
      "a mesma execução fica concluída, com a saída do tempo",
      seguida.id === esperandoA.id && seguida.resultado === "concluida" && seguida.caminho.find((p) => p.bloco.tipo === "espera")?.saida === "tempo",
      `${seguida.resultado}`
    )

    // ── B28-03: esperar a resposta ────────────────────────────────────────────
    await db.from("automation_flows").update({ ativa: false }).eq("id", regraA)
    await regraDeMensagem(page, "B28 B esperar a resposta")
    await adicionarBloco(page, "Esperar")
    await page.getByRole("checkbox", { name: /O contato mandar mensagem/ }).check()
    await page.getByRole("checkbox", { name: /Passar um tempo/ }).uncheck()
    r.confere(
      "sem o tempo, o painel oferece o teto de 30 dias, marcado",
      ((await page.getByRole("combobox", { name: "Sem o tempo, esperar" }).textContent()) ?? "").includes("No máximo 30 dias")
    )
    await adicionarBloco(page, "Condição (sim / não)", { bloco: "Esperar" })
    await page.getByRole("button", { name: "Adicionar verificação" }).click()
    await escolher(page, '[aria-label="Atributo"]', "Texto da mensagem")
    await escolher(page, '[aria-label="Operador"]', "contém")
    await page.getByRole("textbox", { name: "Valor" }).fill("sim")
    r.confere(
      "o editor aceita 'texto da mensagem' depois da saída de mensagem, num bloco sem pendência",
      (await page.getByText("Verificação de mensagem não vale para este gatilho").count()) === 0
    )
    await adicionarBloco(page, "Adicionar tag ao contato", { bloco: "Condição", indice: 0 })
    await page.locator("#painel-campo-tag").fill("b28-sim")
    const regraB = await salvarRegra(page)
    regras.push(regraB)

    await mensagem("quero saber o preço")
    const [esperandoB] = await execucoesDa(regraB)
    r.confere("a mensagem que dispara a regra deixa o contato esperando", esperandoB?.resultado === "esperando", esperandoB?.resultado)
    r.confere("sem o tempo, a hora do relógio é o teto de 30 dias", !!esperandoB?.retomar_em)

    await mensagem("sim, pode mandar")
    const [respondida] = await execucoesDa(regraB)
    r.confere("a resposta segue pela saída 'Recebeu mensagem'", respondida.caminho.find((p) => p.bloco.tipo === "espera")?.saida === "recebeu_mensagem")
    r.confere("a condição depois da espera olha a resposta: 'sim'", respondida.caminho.find((p) => p.bloco.tipo === "condicao")?.saida === "sim")
    r.confere("a tag da saída 'sim' entra", await temTag("b28-sim"))
    r.confere("a mesma execução fica concluída", respondida.id === esperandoB.id && respondida.resultado === "concluida", respondida.resultado)

    r.confere("sem erro no console", erros.length === 0, erros.join(" | "))
  } finally {
    // Limpeza: as regras, as execuções e as tags saem; a conversa da Ana volta como estava
    for (const id of regras) {
      await db.from("automation_runs").delete().eq("regra_id", id)
      await db.from("automation_flows").delete().eq("id", id)
    }
    await db.from("contact_tags").delete().eq("contact_id", ana.id).in("tag", TAGS)
    const { data: conexao } = await db.from("whatsapp_connections").select("id").eq("instance_id", INSTANCIA).maybeSingle()
    if (conexao) {
      const { last_message_text, last_message_at, unread_count, whatsapp_connection_id } = conversaAna
      await db
        .from("conversations")
        .update({ last_message_text, last_message_at, unread_count, whatsapp_connection_id })
        .eq("id", conversaAna.id)
      await db.from("conversations").update({ whatsapp_connection_id: null }).eq("whatsapp_connection_id", conexao.id)
      await db.from("messages").delete().eq("conversation_id", conversaAna.id).like("wamid", `${PREFIXO_MENSAGEM}%`)
      await db.from("gateway_events").delete().eq("instance_id", INSTANCIA)
      const { error } = await db.from("whatsapp_connections").delete().eq("id", conexao.id)
      r.confere("limpeza: a conexão temporária foi apagada", !error, error?.message)
    }
    await browser.close()
  }

  process.exit(r.imprimir() ? 1 : 0)
})().catch((e) => {
  console.error("PAROU:", e.message.split("\n")[0])
  process.exit(1)
})
