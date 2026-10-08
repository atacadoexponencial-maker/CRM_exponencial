/* eslint-disable @typescript-eslint/no-require-imports */
// "Pronto quando" da B11-04 no preview, com a empresa de teste no estado inicial
// (rode o resetar antes). Monta 2 regras pelo editor, as duas com repetição
// "sempre":
//  A. mensagem recebida → texto contém "catálogo" → sim: aplicar a etiqueta Interessado
//  B. mensagem recebida → tipo da mensagem é Imagem → sim: tag "foto-recebida"
// e manda ao webhook do gateway no preview mensagens simuladas da Ana, assinadas
// como o gateway assina (`enviarEventoDoGateway`).
//
// A mensagem real de um chip vai para a produção, e não para o preview. Por isso o
// roteiro cria uma conexão temporária na empresa de teste, só para o webhook achar
// a empresa pelo `instance_id`. Ela fica como "removed": não aparece na tela de
// números e nada consulta o gateway por ela. No fim, o roteiro apaga a conexão, as
// mensagens simuladas e os eventos registrados. Nenhuma mensagem é enviada.
//
// Também mede o tempo de resposta do webhook com as regras ativas e pausadas (a
// parte que faltava da B11-09).
// Uso: node e2e/preview/roteiro-b11-04.cjs <endereço do preview>

const {
  abrirPreview,
  bancoDeServico,
  conferirEmpresaDeTeste,
  criarRelatorio,
  enviarEventoDoGateway,
  esperarAutomacoes,
} = require("./comum.cjs")
const { adicionarBloco, escolher, salvarRegra } = require("./tela.cjs")

const URL_PREVIEW = process.argv[2]
const RODADA = Date.now()
const INSTANCIA = `b11-04-simulada-${RODADA}`
/** Prefixo do `wamid` das mensagens simuladas, para a limpeza achar só elas. */
const PREFIXO_MENSAGEM = "b11-04-sim-"
const TELEFONE_ANA = "5500000000101"
const MEDICOES = 5

let sequencia = 0
const proximoId = () => `${RODADA}-${++sequencia}`

/** `data` de um `message.received` da Ana, no formato do contrato do gateway. */
function mensagemDaAna(extra) {
  return { message_id: `${PREFIXO_MENSAGEM}${proximoId()}`, from: TELEFONE_ANA, from_is_lid: false, ...extra }
}

/** Regra nova com o gatilho "mensagem recebida", repetição "sempre" e uma condição com uma verificação. */
async function regraDeMensagem(page, nome, atributo, operador, preencherValor) {
  await page.goto(`${URL_PREVIEW}/configuracoes/automacoes/nova`, { waitUntil: "networkidle" })
  await page.waitForSelector(".react-flow__node")
  await page.getByRole("textbox", { name: "Nome da automação" }).fill(nome)
  await page.locator(".react-flow__node").first().click()
  await escolher(page, "#painel-gatilho", "Mensagem recebida do cliente")
  await escolher(page, '[aria-label="Proteção de repetição"]', "Sempre (a cada disparo)")
  await adicionarBloco(page, "Condição (sim / não)")
  await page.getByRole("button", { name: "Adicionar verificação" }).click()
  await escolher(page, '[aria-label="Atributo"]', atributo)
  await escolher(page, '[aria-label="Operador"]', operador)
  await preencherValor()
}

;(async () => {
  if (!URL_PREVIEW) throw new Error("passe o endereço do preview (veja endereco-preview.cjs)")
  const db = bancoDeServico()
  const { browser, page, erros, workspaceId: ws } = await abrirPreview(URL_PREVIEW)
  await conferirEmpresaDeTeste(db, ws)
  const r = criarRelatorio()

  const { data: ana } = await db.from("contacts").select("id").eq("workspace_id", ws).eq("name", "Teste B11 Ana").single()
  // O que a mensagem recebida muda na conversa, para a limpeza devolver como estava
  const { data: conversaAna } = await db
    .from("conversations")
    .select("id, last_message_text, last_message_at, unread_count, whatsapp_connection_id")
    .eq("contact_id", ana.id)
    .single()
  const { data: interessado } = await db.from("labels").select("id").eq("workspace_id", ws).eq("name", "Interessado").single()
  const temEtiqueta = async () =>
    ((await db.from("conversation_labels").select("label_id").eq("conversation_id", conversaAna.id)).data ?? []).some(
      (e) => e.label_id === interessado.id
    )
  const tirarEtiqueta = () =>
    db.from("conversation_labels").delete().eq("conversation_id", conversaAna.id).eq("label_id", interessado.id)
  const temTag = async (tag) =>
    ((await db.from("contact_tags").select("tag").eq("contact_id", ana.id)).data ?? []).some((t) => t.tag === tag)
  const execucoes = async () =>
    (await db.from("automation_runs").select("regra_nome, evento, caminho").eq("workspace_id", ws).order("created_at")).data ?? []

  const { error: erroConexao } = await db.from("whatsapp_connections").insert({
    workspace_id: ws,
    canal: "gateway",
    status: "removed",
    instance_id: INSTANCIA,
    instance_token: "simulado-sem-uso",
    display_name: "[TESTE] simulada B11-04",
  })
  if (erroConexao) throw new Error(`conexão temporária: ${erroConexao.message}`)

  /** Manda a mensagem da Ana e espera as regras rodarem. */
  async function mensagem(data) {
    const resposta = await enviarEventoDoGateway(URL_PREVIEW, {
      event_id: `b11-04-${proximoId()}`,
      type: "message.received",
      instance_id: INSTANCIA,
      timestamp: new Date().toISOString(),
      data: mensagemDaAna(data),
    })
    await esperarAutomacoes(db, ws)
    return resposta
  }

  try {
    // 1. Regras pelo editor
    await regraDeMensagem(page, "B11-04 A catálogo", "Texto da mensagem", "contém", async () => {
      await page.getByRole("textbox", { name: "Valor" }).fill("catálogo")
    })
    await adicionarBloco(page, "Aplicar etiqueta à conversa", { bloco: "Condição", indice: 0 })
    await escolher(page, "#painel-campo-label_id", "Interessado")
    await salvarRegra(page)

    await regraDeMensagem(page, "B11-04 B foto", "Tipo da mensagem", "é", async () => {
      await escolher(page, '[aria-label="Valor"]', "Imagem")
    })
    await adicionarBloco(page, "Adicionar tag ao contato", { bloco: "Condição", indice: 0 })
    await page.locator("#painel-campo-tag").fill("foto-recebida")
    await salvarRegra(page)

    // 2. "oi": as duas regras seguem pelo "não"
    const oi = await mensagem({ type: "text", text: "oi" })
    r.confere("o webhook do preview aceita a mensagem assinada", oi.status === 200, `${oi.status} ${oi.corpo}`)
    r.confere("'oi' não aplica a etiqueta", !(await temEtiqueta()))
    r.confere("'oi' não é foto: sem a tag", !(await temTag("foto-recebida")))

    // 3. "Quero o CATÁLOGO": a etiqueta entra na conversa onde a mensagem chegou
    await mensagem({ type: "text", text: "Quero o CATÁLOGO" })
    r.confere("'Quero o CATÁLOGO' aplica a etiqueta Interessado", await temEtiqueta())

    // 4. Sem acento e em minúsculas também casa
    await tirarEtiqueta()
    await mensagem({ type: "text", text: "me manda o catalogo" })
    r.confere("'me manda o catalogo' (sem acento) também aplica", await temEtiqueta())

    // 5. Foto com legenda: tipo imagem e a legenda como texto (sem arquivo: o roteiro não baixa nada)
    await tirarEtiqueta()
    await mensagem({ type: "image", text: "segue o catálogo" })
    r.confere("foto: a regra de tipo põe a tag", await temTag("foto-recebida"))
    r.confere("foto: a legenda conta como texto da mensagem", await temEtiqueta())

    // 6. Reação não dispara
    const antesDaReacao = (await execucoes()).length
    const { data: ultima } = await db
      .from("messages")
      .select("wamid")
      .eq("conversation_id", conversaAna.id)
      .like("wamid", `${PREFIXO_MENSAGEM}%`)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()
    await mensagem({ type: "reaction", reaction: { emoji: "👍", target_message_id: ultima.wamid } })
    r.confere("reação não dispara regra nenhuma", (await execucoes()).length === antesDaReacao)

    // 7. Histórico: execuções e a frase do evento na tela
    const todas = await execucoes()
    const saidas = todas
      .filter((e) => e.regra_nome === "B11-04 A catálogo")
      .map((e) => e.caminho.find((p) => p.bloco.tipo === "condicao")?.saida)
    r.confere(
      "histórico da regra A: não, sim, sim, sim",
      saidas.join(",") === "nao,sim,sim,sim",
      saidas.join(",")
    )
    r.confere(
      "histórico guarda o tipo e o texto da mensagem",
      todas.some((e) => e.evento.tipoMensagem === "imagem" && e.evento.texto === "segue o catálogo")
    )
    await page.goto(`${URL_PREVIEW}/configuracoes/automacoes/historico`, { waitUntil: "networkidle" })
    r.confere(
      "a página do histórico mostra a mensagem que disparou",
      (await page.getByText('Mensagem recebida: "Quero o CATÁLOGO"').count()) >= 1
    )

    // 8. B11-09: tempo de resposta do webhook com as regras pausadas e ativas
    const tempos = { pausadas: [], ativas: [] }
    for (const situacao of ["pausadas", "ativas"]) {
      await db.from("automation_flows").update({ ativa: situacao === "ativas" }).eq("workspace_id", ws)
      for (let i = 0; i < MEDICOES; i++) {
        const { ms } = await mensagem({ type: "text", text: `catálogo, medição ${i + 1}` })
        tempos[situacao].push(ms)
      }
    }
    const mediana = (lista) => [...lista].sort((a, b) => a - b)[Math.floor(lista.length / 2)]
    const [pausadas, ativas] = [mediana(tempos.pausadas), mediana(tempos.ativas)]
    console.log(`Tempo de resposta do webhook (mediana de ${MEDICOES}): regras pausadas ${pausadas} ms, ativas ${ativas} ms`)
    console.log(`  pausadas: ${tempos.pausadas.join(", ")} ms | ativas: ${tempos.ativas.join(", ")} ms`)
    r.confere(
      "B11-09: com as regras ativas, a resposta do webhook não espera por elas (menos de 250 ms a mais)",
      ativas - pausadas < 250,
      `${pausadas} ms → ${ativas} ms`
    )

    r.confere("sem erro no console", erros.length === 0, erros.join(" | "))
  } finally {
    // Limpeza: a conversa da Ana volta como estava, e o que o roteiro criou sai
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
