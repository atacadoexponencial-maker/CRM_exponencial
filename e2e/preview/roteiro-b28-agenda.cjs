/* eslint-disable @typescript-eslint/no-require-imports */
// B28-01 no preview, pela tela, com a empresa de teste no estado inicial (rode o
// resetar antes): a Agenda inteira, que é a "área de tarefas" do pedido de
// 20/10/2026, e o lembrete criado pela automação (CA-B28-37).
//  - Novo follow-up aparece na Minha Agenda, em "Amanhã"; Feito o tira da lista.
//  - Adiar 3 dias muda o vencimento.
//  - Lembrete vencido fica em "Atrasados" e acende o número no menu.
//  - Regra "card movido → criar lembrete" grava o lembrete para o responsável pela
//    conversa, e ele aparece como "Lembrete de automação" com o nome da regra.
//  - Agenda da equipe filtra por pessoa e reatribui o lembrete.
// Cria um atendente temporário (o responsável) e o apaga no fim.
// Uso: node e2e/preview/roteiro-b28-agenda.cjs <endereço do preview>

const {
  abrirPreview,
  apagarAtendente,
  bancoDeServico,
  conferirEmpresaDeTeste,
  criarAtendente,
  criarRelatorio,
} = require("./comum.cjs")
const { adicionarBloco, moverCard, novaRegra, salvarRegra } = require("./tela.cjs")

const URL_PREVIEW = process.argv[2]
const REGRA = "B28 Lembrete de automação"
const DIA = 86_400_000

/** Amanhã em Brasília, como o campo de data espera (aaaa-mm-dd). */
function amanhaEmBrasilia() {
  return new Date(Date.now() - 3 * 3_600_000 + DIA).toISOString().slice(0, 10)
}

;(async () => {
  if (!URL_PREVIEW) throw new Error("passe o endereço do preview (veja endereco-preview.cjs)")
  const db = bancoDeServico()
  const { browser, page, erros, workspaceId: ws } = await abrirPreview(URL_PREVIEW)
  await conferirEmpresaDeTeste(db, ws)
  const r = criarRelatorio()

  const { data: admin } = await db.from("profiles").select("id, name").eq("workspace_id", ws).eq("role", "admin").single()
  const { data: ana } = await db.from("contacts").select("id").eq("workspace_id", ws).eq("name", "Teste B11 Ana").single()
  const atendente = await criarAtendente(db, ws, "Atendente B28")
  const lembretesDoAdmin = async () =>
    (await db.from("reminders").select("id, instrucao, status, due_at, origem").eq("atendente_id", admin.id)).data ?? []
  const item = (texto) => page.locator("div.rounded-lg.border").filter({ hasText: texto })

  try {
    // 1. Novo follow-up pela tela
    await page.goto(`${URL_PREVIEW}/agenda`, { waitUntil: "networkidle" })
    await page.getByRole("button", { name: "Novo follow-up" }).click()
    await page.locator("#fu-contato").fill("Ana")
    await page.getByRole("button", { name: "Teste B11 Ana" }).click()
    await page.locator("#fu-data").fill(amanhaEmBrasilia())
    await page.locator("#fu-nota").fill("B28 ligar amanhã")
    await page.getByRole("button", { name: "Agendar" }).click()
    await page.getByText("B28 ligar amanhã").waitFor({ timeout: 20000 })
    r.confere("follow-up novo aparece na Minha Agenda, em Amanhã", (await page.getByRole("heading", { name: /Amanhã/ }).count()) === 1)
    const [criado] = (await lembretesDoAdmin()).filter((l) => l.instrucao === "B28 ligar amanhã")
    r.confere("e fica gravado como follow-up avulso", criado?.origem === "avulso" && criado.status === "pendente")

    // 2. Feito
    await item("B28 ligar amanhã").getByRole("button", { name: "Feito" }).click()
    await page.getByText("B28 ligar amanhã").waitFor({ state: "detached", timeout: 20000 })
    const feito = (await lembretesDoAdmin()).find((l) => l.id === criado.id)
    r.confere("Feito tira o item da lista e grava como feito", feito?.status === "feito")

    // 3. Adiar 3 dias
    await db.from("reminders").insert({
      workspace_id: ws,
      contact_id: ana.id,
      atendente_id: admin.id,
      origem: "avulso",
      instrucao: "B28 adiar",
      due_at: new Date(Date.now() + 3_600_000).toISOString(),
    })
    await page.reload({ waitUntil: "networkidle" })
    await item("B28 adiar").getByRole("button", { name: "Adiar" }).click()
    await page.getByRole("menuitem", { name: "3 dias" }).click()
    await page.waitForTimeout(1500)
    const adiado = (await lembretesDoAdmin()).find((l) => l.instrucao === "B28 adiar")
    const diasAdiado = (new Date(adiado.due_at).getTime() - Date.now()) / DIA
    r.confere("Adiar 3 dias leva o vencimento para daqui a 3 dias", diasAdiado > 2.9 && diasAdiado < 3.1, diasAdiado.toFixed(2))

    // 4. Atrasado e o número no menu
    await db.from("reminders").insert({
      workspace_id: ws,
      contact_id: ana.id,
      atendente_id: admin.id,
      origem: "avulso",
      instrucao: "B28 atrasado",
      due_at: new Date(Date.now() - 3_600_000).toISOString(),
    })
    await page.reload({ waitUntil: "networkidle" })
    r.confere("lembrete vencido aparece em Atrasados", (await page.getByRole("heading", { name: "Atrasados (1)" }).count()) === 1)
    const menuAgenda = await page.locator('a[href="/agenda"]').first().innerText()
    r.confere("o menu mostra 1 atrasado ao lado da Agenda", /\b1\b/.test(menuAgenda), menuAgenda.replace(/\s+/g, " "))

    // 5. Lembrete pela automação, para o responsável pela conversa da Ana
    await db.from("conversations").update({ assigned_to: atendente.id }).eq("workspace_id", ws).eq("contact_id", ana.id)
    await novaRegra(page, URL_PREVIEW, REGRA, "Sondagem")
    await adicionarBloco(page, "Criar lembrete na Agenda")
    await page.locator("#painel-campo-texto").fill("Ligar para {{nome_contato}}")
    await page.locator("#painel-campo-vence_em").fill("2")
    r.confere(
      "o bloco diz para quem e quando vence",
      (await page.locator(".react-flow__node").filter({ hasText: "Lembrete para o responsável" }).innerText()).includes("vence em 2 dias")
    )
    const regraId = await salvarRegra(page)
    await moverCard(page, URL_PREVIEW, "Teste B11 Ana", "Sondagem")
    const { data: daRegra } = await db
      .from("reminders")
      .select("id, atendente_id, instrucao, due_at, automacao_nome")
      .eq("workspace_id", ws)
      .eq("origem", "automacao")
    const lembrete = daRegra?.[0]
    const diasAteVencer = lembrete ? (new Date(lembrete.due_at).getTime() - Date.now()) / DIA : 0
    r.confere(
      "a automação grava o lembrete para o responsável, com o nome e o texto",
      daRegra?.length === 1 &&
        lembrete.atendente_id === atendente.id &&
        lembrete.instrucao === "Ligar para Teste B11 Ana" &&
        lembrete.automacao_nome === REGRA,
      JSON.stringify(daRegra)
    )
    r.confere("e vence em 2 dias", diasAteVencer > 1.9 && diasAteVencer < 2.1, diasAteVencer.toFixed(2))

    // 6. Agenda da equipe: filtro por pessoa e reatribuir
    await page.goto(`${URL_PREVIEW}/agenda/equipe`, { waitUntil: "networkidle" })
    await page.getByRole("combobox", { name: "Filtrar por atendente" }).selectOption(atendente.id)
    await page.waitForTimeout(2000)
    const textos = await page.locator("section").first().innerText()
    r.confere(
      "o filtro mostra só os itens do atendente, com o de automação",
      textos.includes("Ligar para Teste B11 Ana") && !textos.includes("B28 adiar") && textos.includes(`Lembrete de automação: ${REGRA}`)
    )
    await item("Ligar para Teste B11 Ana").getByText("Reatribuir").click()
    await page.getByRole("menuitem", { name: admin.name }).click()
    await page.waitForTimeout(1500)
    const { data: reatribuido } = await db.from("reminders").select("atendente_id").eq("id", lembrete.id).single()
    r.confere("Reatribuir passa o lembrete para o admin", reatribuido?.atendente_id === admin.id)

    await page.goto(`${URL_PREVIEW}/agenda`, { waitUntil: "networkidle" })
    r.confere(
      "na Minha Agenda do admin, aparece como lembrete de automação",
      (await item("Ligar para Teste B11 Ana").getByText(`Lembrete de automação: ${REGRA}`).count()) === 1
    )

    await db.from("automation_flows").delete().eq("workspace_id", ws).eq("id", regraId)
    r.confere("sem erro no console", erros.length === 0, erros.join(" | "))
  } finally {
    await db.from("reminders").delete().eq("workspace_id", ws)
    await apagarAtendente(db, ws, atendente.id)
    await browser.close()
  }
  process.exit(r.imprimir() ? 1 : 0)
})().catch((e) => {
  console.error("PAROU:", e.message.split("\n")[0])
  process.exit(1)
})
