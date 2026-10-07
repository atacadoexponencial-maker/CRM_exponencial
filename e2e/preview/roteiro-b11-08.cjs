/* eslint-disable @typescript-eslint/no-require-imports */
// B11-08 no preview, pela tela, com a empresa de teste no estado inicial (rode o
// resetar antes). O "Pronto quando" usa o gatilho "mensagem recebida", que só
// chega na B11-04; aqui o mesmo comportamento é conferido com "tag adicionada", e,
// em vez de esperar a noite, a faixa do horário muda para o momento do teste
// ficar dentro ou fora dela. Monta 2 regras pelo editor:
//  A. tag "fora-horario" → fora do horário comercial? → sim: atribuir ao time
//     Entrada → resolver a conversa
//  B. tag "reabrir" → reabrir a conversa → iniciar a sequência "B11-08 Boas-vindas"
// e dispara pelo perfil: Ana dentro do horário (A segue pelo "não"), Bruno fora
// (A atribui e resolve) e, depois, B no Bruno (reabre e inicia a sequência).
// Uso: node e2e/preview/roteiro-b11-08.cjs <endereço do preview>

const { abrirPreview, bancoDeServico, conferirEmpresaDeTeste, criarRelatorio } = require("./comum.cjs")
const { adicionarBloco, escolher, salvarRegra } = require("./tela.cjs")

const URL_PREVIEW = process.argv[2]
const SEQUENCIA = "B11-08 Boas-vindas"

/** Hora cheia de agora em Brasília, para montar uma faixa que certamente não inclui o momento do teste. */
const horaEmBrasilia = () =>
  Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", hour: "2-digit", hourCycle: "h23" }).format(new Date()))

const r = criarRelatorio()
;(async () => {
  if (!URL_PREVIEW) throw new Error("passe o endereço do preview (veja endereco-preview.cjs)")
  const db = bancoDeServico()
  const { browser, page, erros, workspaceId: ws } = await abrirPreview(URL_PREVIEW)
  await conferirEmpresaDeTeste(db, ws)

  const contato = async (nome) =>
    (await db.from("contacts").select("id").eq("workspace_id", ws).eq("name", `Teste B11 ${nome}`).single()).data.id
  const [ana, bruno] = [await contato("Ana"), await contato("Bruno")]
  const conversa = async (id) =>
    (await db.from("conversations").select("id, status, assigned_to").eq("contact_id", id).single()).data
  const { data: admin } = await db.from("profiles").select("id").eq("workspace_id", ws).eq("role", "admin").single()

  // Sequência só com lembrete: não tenta mandar mensagem
  const { data: sequencia } = await db
    .from("sequences")
    .insert({ workspace_id: ws, nome: SEQUENCIA, gatilho: "manual", ativa: true })
    .select("id")
    .single()
  await db
    .from("sequence_steps")
    .insert({ sequence_id: sequencia.id, ordem: 0, tipo: "lembrete", prazo_dias: 1, instrucao: "Ligar para o contato" })

  /** Grava o horário pelo diálogo da lista. Todos os dias marcados. */
  async function definirHorario(inicio, fim) {
    await page.goto(`${URL_PREVIEW}/configuracoes/automacoes`, { waitUntil: "networkidle" })
    await page.getByRole("button", { name: "Horário comercial" }).click()
    const dialogo = page.getByRole("dialog")
    for (const dia of ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]) {
      const botao = dialogo.getByRole("button", { name: dia, exact: true })
      if ((await botao.getAttribute("aria-pressed")) !== "true") await botao.click()
    }
    await dialogo.locator("#horario-inicio").fill(inicio)
    await dialogo.locator("#horario-fim").fill(fim)
    await dialogo.getByRole("button", { name: "Salvar" }).click()
    await dialogo.waitFor({ state: "hidden", timeout: 20000 })
    return (await db.from("business_hours").select("dias, inicio, fim").eq("workspace_id", ws).maybeSingle()).data
  }

  async function adicionarTagPeloPerfil(contactId, tag) {
    await page.goto(`${URL_PREVIEW}/contatos/${contactId}`, { waitUntil: "networkidle" })
    await page.getByPlaceholder("Nova tag (sem espaços)").fill(tag)
    await Promise.all([
      page.waitForResponse((res) => res.request().method() === "POST" && (res.request().postData() ?? "").includes(`"${tag}"`), {
        timeout: 60000,
      }),
      page.getByRole("button", { name: "Adicionar", exact: true }).click(),
    ])
  }

  async function regraComTag(nome, tag) {
    await page.goto(`${URL_PREVIEW}/configuracoes/automacoes/nova`, { waitUntil: "networkidle" })
    await page.waitForSelector(".react-flow__node")
    await page.getByRole("textbox", { name: "Nome da automação" }).fill(nome)
    await page.locator(".react-flow__node").first().click()
    await escolher(page, "#painel-gatilho", "Tag adicionada ao contato")
    await page.locator("#painel-campo-tag").fill(tag)
  }

  // 1. Horário pelo diálogo: o dia todo, todos os dias
  const gravado = await definirHorario("00:00", "23:59")
  r.confere(
    "horário: o diálogo grava os 7 dias e a faixa",
    gravado?.dias?.join(",") === "0,1,2,3,4,5,6" && gravado.inicio === "00:00:00" && gravado.fim === "23:59:00",
    JSON.stringify(gravado)
  )

  // 2. Regras pelo editor
  await regraComTag("B11-08 A fora do horário", "fora-horario")
  await adicionarBloco(page, "Condição (sim / não)")
  await page.getByRole("button", { name: "Adicionar verificação" }).click()
  await page.getByRole("combobox", { name: "Atributo" }).click()
  await page.getByRole("option", { name: "Horário", exact: true }).click()
  await page.getByRole("combobox", { name: "Operador" }).click()
  await page.getByRole("option", { name: "fora do horário comercial" }).click()
  r.confere(
    "painel da condição mostra o horário em vigor",
    (await page.getByText("Horário comercial: Todos os dias, das 00:00 às 23:59", { exact: false }).count()) === 1
  )
  await adicionarBloco(page, "Atribuir a um time", { bloco: "Condição", indice: 0 })
  await escolher(page, "#painel-campo-time_id", "Entrada")
  await adicionarBloco(page, "Resolver a conversa", { bloco: "Atribuir ao time" })
  await salvarRegra(page)

  await regraComTag("B11-08 B reabrir", "reabrir")
  await adicionarBloco(page, "Reabrir a conversa")
  await adicionarBloco(page, "Iniciar sequência")
  await escolher(page, "#painel-campo-sequencia_id", SEQUENCIA)
  await salvarRegra(page)

  // 3. Ana, dentro do horário: a regra A segue pelo "não" e nada muda
  await adicionarTagPeloPerfil(ana, "fora-horario")
  const conversaAna = await conversa(ana)
  r.confere(
    "dentro do horário: a conversa da Ana continua aberta e sem atendente",
    conversaAna.status === "em_atendimento" && conversaAna.assigned_to === null,
    JSON.stringify(conversaAna)
  )

  // 4. Bruno, fora do horário: atribui ao time Entrada e resolve
  const hora = horaEmBrasilia()
  const fora = hora < 12 ? ["13:00", "14:00"] : ["01:00", "02:00"]
  await definirHorario(fora[0], fora[1])
  await adicionarTagPeloPerfil(bruno, "fora-horario")
  const conversaBruno = await conversa(bruno)
  r.confere(
    "fora do horário: a conversa do Bruno vai para o admin (único do time Entrada) e é resolvida",
    conversaBruno.status === "resolvida" && conversaBruno.assigned_to === admin.id,
    JSON.stringify(conversaBruno)
  )

  const { data: execucoesA } = await db
    .from("automation_runs")
    .select("contact_id, resultado, caminho")
    .eq("workspace_id", ws)
    .eq("regra_nome", "B11-08 A fora do horário")
  const saidaDaCondicao = (contactId) =>
    execucoesA.find((e) => e.contact_id === contactId)?.caminho.find((p) => p.bloco.tipo === "condicao")?.saida
  r.confere(
    "histórico: a condição tomou 'não' na Ana e 'sim' no Bruno",
    saidaDaCondicao(ana) === "nao" && saidaDaCondicao(bruno) === "sim",
    `${saidaDaCondicao(ana)} / ${saidaDaCondicao(bruno)}`
  )

  // 5. Regra B no Bruno: reabre (com atendente, em atendimento) e inicia a sequência
  await adicionarTagPeloPerfil(bruno, "reabrir")
  const reaberta = await conversa(bruno)
  r.confere("reabrir: a conversa do Bruno volta para em atendimento", reaberta.status === "em_atendimento", reaberta.status)
  const { data: execucaoSequencia } = await db
    .from("sequence_runs")
    .select("status, atendente_id")
    .eq("contact_id", bruno)
    .eq("sequence_id", sequencia.id)
    .maybeSingle()
  r.confere(
    "iniciar sequência: em andamento para o Bruno, com o atendente da conversa",
    execucaoSequencia?.status === "em_andamento" && execucaoSequencia.atendente_id === admin.id,
    JSON.stringify(execucaoSequencia)
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
