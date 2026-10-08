/* eslint-disable @typescript-eslint/no-require-imports */
// "Pronto quando" da B11-07 no preview, e as partes de mensagem que ficaram
// abertas na B11-02, na B11-08 e na B11-09. Rode o resetar antes.
// ⚠️ ENVIA 5 MENSAGENS DE VERDADE para o número em B11_TESTE_TELEFONE_REAL
// (.env.local), pelo chip conectado na empresa de teste. Só rode depois de
// combinar com quem vai receber.
//
// Regras montadas pelo editor:
//  B11-07, as três com o gatilho tag "b11-07-envio":
//   A. enviar "Oi {{primeiro_nome}}, aqui é {{nome_vendedor}}"
//   B. enviar a mensagem rápida "B11-07 tabela" (criada pelo roteiro)
//   C. enviar o PDF escolhido no editor
//  B11-02, tag "b11-02-canal": canal da conversa é canal direto?
//     sim: etiqueta Interessado e mensagem / não: outra mensagem
//  B11-08, mensagem recebida: fora do horário comercial?
//     sim: mensagem de ausência e atribuir ao time Entrada
// A mensagem do cliente é simulada no webhook do gateway, como no roteiro da
// B11-04, mas com o chip de verdade: a resposta da regra sai de verdade.
// Uso: node e2e/preview/roteiro-b11-07.cjs <endereço do preview>

const fs = require("fs")
const os = require("os")
const path = require("path")
const {
  abrirPreview,
  bancoDeServico,
  conferirEmpresaDeTeste,
  criarRelatorio,
  enviarEventoDoGateway,
  esperarAutomacoes,
  lerEnv,
  prepararNumeroReal,
} = require("./comum.cjs")
const { adicionarBloco, escolher, salvarRegra } = require("./tela.cjs")

const URL_PREVIEW = process.argv[2]
const RODADA = Date.now()
const PREFIXO_SIMULADA = "b11-07-sim-"
const AUSENCIA = "Oi! Estamos fora do horário agora. Respondemos assim que voltarmos."
const NOME_DO_PDF = "tabela-b11-07.pdf"

/** Um PDF de uma página, pequeno e válido, só para o teste. */
function pdfDeTeste() {
  const caminho = path.join(os.tmpdir(), NOME_DO_PDF)
  const objetos = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    "<< /Length 44 >>\nstream\nBT /F1 18 Tf 20 70 Td (Tabela B11-07) Tj ET\nendstream",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ]
  let corpo = "%PDF-1.4\n"
  const posicoes = []
  objetos.forEach((o, i) => {
    posicoes.push(corpo.length)
    corpo += `${i + 1} 0 obj\n${o}\nendobj\n`
  })
  const inicioXref = corpo.length
  corpo += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`
  for (const p of posicoes) corpo += `${String(p).padStart(10, "0")} 00000 n \n`
  corpo += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${inicioXref}\n%%EOF\n`
  fs.writeFileSync(caminho, corpo)
  return caminho
}

;(async () => {
  if (!URL_PREVIEW) throw new Error("passe o endereço do preview (veja endereco-preview.cjs)")
  const env = lerEnv()
  const db = bancoDeServico(env)
  const ws = env.B11_TESTE_WORKSPACE_ID
  await conferirEmpresaDeTeste(db, ws)
  const { contatoId, conversaId, chip, telefone } = await prepararNumeroReal(db, ws, env)

  const { data: admin } = await db.from("profiles").select("id, name").eq("workspace_id", ws).eq("role", "admin").limit(1).single()
  await db.from("conversations").update({ assigned_to: admin.id }).eq("id", conversaId)
  const { data: rapida } = await db
    .from("quick_replies")
    .insert({ workspace_id: ws, title: "B11-07 tabela", content: "Segue nossa tabela, {{primeiro_nome}}" })
    .select("id")
    .single()
  const pdf = pdfDeTeste()

  const { browser, page, erros } = await abrirPreview(URL_PREVIEW)
  const r = criarRelatorio()

  const execucao = async (nome) =>
    (await db.from("automation_runs").select("resultado, motivo, caminho").eq("workspace_id", ws).eq("regra_nome", nome).order("created_at")).data ?? []
  const enviadas = async () =>
    (await db
      .from("messages")
      .select("type, content, media_filename, status, created_at")
      .eq("conversation_id", conversaId)
      .eq("direction", "enviada")
      .order("created_at")).data ?? []
  const atendenteDoCard = async () =>
    (await db.from("pipeline_cards").select("atendente_id").eq("contact_id", contatoId).eq("funil", "entrada").single()).data.atendente_id

  async function regraCom(nome, gatilho, configurar) {
    await page.goto(`${URL_PREVIEW}/configuracoes/automacoes/nova`, { waitUntil: "networkidle" })
    await page.waitForSelector(".react-flow__node")
    await page.getByRole("textbox", { name: "Nome da automação" }).fill(nome)
    await page.locator(".react-flow__node").first().click()
    await escolher(page, "#painel-gatilho", gatilho)
    await escolher(page, '[aria-label="Proteção de repetição"]', "Sempre (a cada disparo)")
    await configurar()
  }
  const comTag = (tag) => async () => {
    await page.locator("#painel-campo-tag").fill(tag)
  }
  async function condicao(atributo, operador, valor) {
    await adicionarBloco(page, "Condição (sim / não)")
    await page.getByRole("button", { name: "Adicionar verificação" }).click()
    await escolher(page, '[aria-label="Atributo"]', atributo)
    await escolher(page, '[aria-label="Operador"]', operador)
    if (valor) await escolher(page, '[aria-label="Valor"]', valor)
  }
  async function adicionarTagPeloPerfil(tag) {
    await page.goto(`${URL_PREVIEW}/contatos/${contatoId}`, { waitUntil: "networkidle" })
    await page.getByPlaceholder("Nova tag (sem espaços)").fill(tag)
    await Promise.all([
      page.waitForResponse((res) => res.request().method() === "POST" && (res.request().postData() ?? "").includes(`"${tag}"`), {
        timeout: 60000,
      }),
      page.getByRole("button", { name: "Adicionar", exact: true }).click(),
    ])
    await esperarAutomacoes(db, ws)
  }
  let sequencia = 0
  async function mensagemDoCliente(texto) {
    return enviarEventoDoGateway(URL_PREVIEW, {
      event_id: `b11-07-${RODADA}-${++sequencia}`,
      type: "message.received",
      instance_id: chip.instance_id,
      timestamp: new Date().toISOString(),
      data: { message_id: `${PREFIXO_SIMULADA}${RODADA}-${sequencia}`, from: telefone, from_is_lid: false, type: "text", text: texto },
    })
  }
  const horario = (inicio, fim) =>
    db.from("business_hours").upsert({ workspace_id: ws, dias: [0, 1, 2, 3, 4, 5, 6], inicio, fim }, { onConflict: "workspace_id" })

  try {
    // 1. Regras pelo editor
    await regraCom("B11-07 A variáveis", "Tag adicionada ao contato", comTag("b11-07-envio"))
    await adicionarBloco(page, "Enviar mensagem")
    await page.locator("#painel-campo-texto").fill("Oi {{primeiro_nome}}, aqui é {{nome_vendedor}}")
    await salvarRegra(page)

    await regraCom("B11-07 B mensagem rápida", "Tag adicionada ao contato", comTag("b11-07-envio"))
    await adicionarBloco(page, "Enviar mensagem rápida")
    await escolher(page, "#painel-campo-mensagem_rapida_id", "B11-07 tabela")
    await salvarRegra(page)

    await regraCom("B11-07 C PDF", "Tag adicionada ao contato", comTag("b11-07-envio"))
    await adicionarBloco(page, "Enviar imagem ou documento")
    await page.locator("#painel-campo-arquivo").setInputFiles(pdf)
    await page.getByText(`Documento: ${NOME_DO_PDF}`).waitFor({ timeout: 30000 })
    r.confere("o PDF sobe pelo editor", true)
    await salvarRegra(page)

    await regraCom("B11-02 canal", "Tag adicionada ao contato", comTag("b11-02-canal"))
    await condicao("Canal da conversa", "é", "Canal direto")
    await adicionarBloco(page, "Aplicar etiqueta à conversa", { bloco: "Condição", indice: 0 })
    await escolher(page, "#painel-campo-label_id", "Interessado")
    await adicionarBloco(page, "Enviar mensagem", { bloco: "Aplicar a etiqueta" })
    await page.locator("#painel-campo-texto").fill("Mensagem pelo canal direto")
    // Com o "sim" ligado, o "+" do "não" passa a ser o primeiro
    await adicionarBloco(page, "Enviar mensagem", { bloco: "Condição", indice: 0 })
    await page.locator("#painel-campo-texto").fill("Mensagem pela API Oficial")
    await salvarRegra(page)

    await regraCom("B11-08 ausência", "Mensagem recebida do cliente", async () => {})
    await condicao("Horário", "fora do horário comercial")
    await adicionarBloco(page, "Enviar mensagem", { bloco: "Condição", indice: 0 })
    await page.locator("#painel-campo-texto").fill(AUSENCIA)
    await adicionarBloco(page, "Atribuir a um time", { bloco: "Enviar:" })
    await escolher(page, "#painel-campo-time_id", "Entrada")
    await salvarRegra(page, { aceitarAviso: true })

    // 2. B11-07: uma tag, três envios de verdade
    await adicionarTagPeloPerfil("b11-07-envio")
    for (const nome of ["B11-07 A variáveis", "B11-07 B mensagem rápida", "B11-07 C PDF"]) {
      const [e] = await execucao(nome)
      r.confere(`${nome}: concluída`, e?.resultado === "concluida", `${e?.resultado} ${e?.motivo ?? ""}`)
    }
    const depoisDaTag = await enviadas()
    const conteudos = depoisDaTag.map((m) => m.content)
    r.confere("A: as variáveis saem com os nomes certos", conteudos.includes(`Oi Teste, aqui é ${admin.name}`), conteudos.join(" | "))
    r.confere("B: a mensagem rápida sai com a variável preenchida", conteudos.includes("Segue nossa tabela, Teste"))
    r.confere(
      "C: o PDF sai como documento, com o nome original",
      depoisDaTag.some((m) => m.type === "documento" && m.media_filename === NOME_DO_PDF)
    )

    // 3. B11-02: o chip é canal direto, o caminho vai pelo sim
    await adicionarTagPeloPerfil("b11-02-canal")
    const [canal] = await execucao("B11-02 canal")
    r.confere(
      "B11-02: canal direto segue pelo sim, com a etiqueta e a mensagem",
      canal?.resultado === "concluida" && canal.caminho.find((p) => p.bloco.tipo === "condicao")?.saida === "sim",
      `${canal?.resultado} ${canal?.motivo ?? ""}`
    )
    r.confere("B11-02: saiu a mensagem do sim, e não a do não", (await enviadas()).some((m) => m.content === "Mensagem pelo canal direto"))

    // 4. B11-08 dentro do horário: não responde (nada é enviado)
    await horario("00:00", "23:59")
    await mensagemDoCliente("Olá, bom dia")
    await esperarAutomacoes(db, ws)
    r.confere("B11-08: dentro do horário, não responde", !(await enviadas()).some((m) => m.content === AUSENCIA))
    r.confere("B11-08: dentro do horário, o card fica sem atendente", (await atendenteDoCard()) === null)

    // 5. B11-08 fora do horário: responde de verdade, e a B11-09 mede a chegada
    const hora = Number(new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", hour12: false, timeZone: "America/Sao_Paulo" }).format(new Date()))
    await (hora < 12 ? horario("13:00", "14:00") : horario("01:00", "02:00"))
    const inicio = Date.now()
    const resposta = await mensagemDoCliente("Boa noite, vocês estão aí?")
    await esperarAutomacoes(db, ws)
    const ausencia = (await enviadas()).find((m) => m.content === AUSENCIA)
    r.confere("B11-08: fora do horário, a mensagem de ausência sai", Boolean(ausencia), ausencia?.status)
    r.confere("B11-08: o card fica com um atendente do time Entrada", (await atendenteDoCard()) === admin.id)

    // O status volta pelo gateway para a produção, que grava no mesmo banco
    let entregue = null
    while (Date.now() - inicio < 30000) {
      const m = (await enviadas()).find((x) => x.content === AUSENCIA)
      if (m && ["entregue", "lido"].includes(m.status)) {
        entregue = Date.now() - inicio
        break
      }
      await new Promise((res) => setTimeout(res, 1000))
    }
    console.log(`B11-09: resposta do webhook em ${resposta.ms} ms; mensagem da regra entregue em ${entregue ?? "mais de 30000"} ms`)
    r.confere("B11-09: a mensagem da regra é entregue em até 30 segundos", entregue !== null, `${entregue ?? "?"} ms`)

    r.confere("sem erro no console", erros.length === 0, erros.join(" | "))
  } finally {
    // As mensagens do cliente eram simuladas; as enviadas saíram de verdade e ficam
    await db.from("messages").delete().eq("conversation_id", conversaId).like("wamid", `${PREFIXO_SIMULADA}%`)
    if (rapida) await db.from("quick_replies").delete().eq("id", rapida.id)
    await browser.close()
  }

  process.exit(r.imprimir() ? 1 : 0)
})().catch((e) => {
  console.error("PAROU:", e.message.split("\n")[0])
  process.exit(1)
})
