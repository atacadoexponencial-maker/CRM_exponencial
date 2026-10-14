/* eslint-disable @typescript-eslint/no-require-imports */
// B22-09 no preview, pela tela, com a empresa de teste no estado inicial (rode o
// resetar antes): a proteção de repetição no painel do gatilho e o padrão por gatilho.
//  - O seletor saiu da barra do topo; o bloco do gatilho mostra a repetição.
//  - Regra nova: "uma vez por contato" com "card movido", "sempre" com gatilho de
//    mensagem, e a repetição acompanha o gatilho até a pessoa escolher uma.
//  - Regra salva: trocar o gatilho não mexe na repetição.
// Uso: node e2e/preview/roteiro-b22-09.cjs <endereço do preview>

const { abrirPreview, bancoDeServico, conferirEmpresaDeTeste, criarRelatorio } = require("./comum.cjs")
const { adicionarBloco, escolher, novaRegra, salvarRegra } = require("./tela.cjs")

const URL_PREVIEW = process.argv[2]
const PREFIXO = "B22-09"

;(async () => {
  if (!URL_PREVIEW) throw new Error("passe o endereço do preview (veja endereco-preview.cjs)")
  const db = bancoDeServico()
  const { browser, page, erros, workspaceId: ws } = await abrirPreview(URL_PREVIEW)
  await conferirEmpresaDeTeste(db, ws)
  const r = criarRelatorio()
  const blocoGatilho = () => page.locator(".react-flow__node").first()
  const repeticao = async () => (await page.locator("#painel-repeticao").innerText()).trim()
  const fecharPainel = () => page.getByRole("button", { name: "Fechar painel" }).click()
  const repeticaoGravada = async (id) =>
    (await db.from("automation_flows").select("repeticao").eq("id", id).single()).data?.repeticao

  // Regra 1: "card movido", com o padrão de regra nova
  await novaRegra(page, URL_PREVIEW, `${PREFIXO} Card`, "Sondagem")
  r.confere("painel do gatilho tem 'Repetição para o mesmo contato'", await page.getByText("Repetição para o mesmo contato").isVisible())
  r.confere("'card movido' nasce com 'Uma vez por contato'", (await repeticao()).includes("Uma vez por contato"), await repeticao())
  await fecharPainel()
  r.confere("sem painel, não há seletor de repetição na tela", (await page.locator("#painel-repeticao").count()) === 0)
  r.confere("o bloco do gatilho mostra a repetição", (await blocoGatilho().innerText()).includes("Repetição: uma vez por contato"))
  await adicionarBloco(page, "Atribuir atendente")
  await escolher(page, "#painel-campo-atendente_id", "Admin Teste B11")
  const regraCard = await salvarRegra(page)
  r.confere("gravada com 'uma vez por contato'", (await repeticaoGravada(regraCard))?.modo === "uma_vez_por_contato")

  // Regra salva: trocar o gatilho não mexe na repetição
  await blocoGatilho().click()
  await escolher(page, "#painel-gatilho", "Mensagem recebida do cliente")
  r.confere("regra salva: trocar para gatilho de mensagem mantém a repetição", (await repeticao()).includes("Uma vez por contato"), await repeticao())
  await page.getByRole("button", { name: "Automações", exact: true }).click()
  await page.getByRole("dialog").getByRole("button", { name: "Sair sem salvar" }).click()
  await page.waitForURL(/\/configuracoes\/automacoes$/, { timeout: 20000 })

  // Regra 2: nova, a repetição acompanha o gatilho
  await novaRegra(page, URL_PREVIEW, `${PREFIXO} Mensagem`, "Sondagem")
  await escolher(page, "#painel-gatilho", "Mensagem recebida do cliente")
  r.confere("regra nova com 'mensagem recebida': 'Sempre'", (await repeticao()).includes("Sempre"), await repeticao())
  r.confere("o bloco mostra 'Repetição: sempre'", (await blocoGatilho().innerText()).includes("Repetição: sempre"))
  await escolher(page, "#painel-gatilho", "Conversa criada")
  r.confere("volta a 'Uma vez por contato' com 'conversa criada'", (await repeticao()).includes("Uma vez por contato"), await repeticao())
  await escolher(page, "#painel-gatilho", "Mensagem enviada pelo time")
  r.confere("'mensagem enviada pelo time': 'Sempre'", (await repeticao()).includes("Sempre"), await repeticao())

  // Escolhida à mão, a repetição fica quando o gatilho muda
  await escolher(page, "#painel-repeticao", "No máximo a cada N horas por contato")
  r.confere("'a cada N horas' mostra o campo de horas", (await page.getByRole("textbox", { name: "Horas entre execuções" }).inputValue()) === "24")
  r.confere("o bloco mostra as horas", (await blocoGatilho().innerText()).includes("Repetição: no máximo a cada 24 horas"))
  await escolher(page, "#painel-gatilho", "Conversa criada")
  r.confere("escolhida à mão, a repetição fica ao trocar o gatilho", (await repeticao()).includes("No máximo a cada N horas"), await repeticao())

  // Volta ao "sempre" e grava uma regra de mensagem sem envio (não pede confirmação)
  await escolher(page, "#painel-gatilho", "Mensagem recebida do cliente")
  await escolher(page, "#painel-repeticao", "Sempre (a cada disparo)")
  await adicionarBloco(page, "Atribuir atendente")
  await escolher(page, "#painel-campo-atendente_id", "Admin Teste B11")
  const regraMensagem = await salvarRegra(page)
  r.confere("gravada com 'sempre'", (await repeticaoGravada(regraMensagem))?.modo === "sempre")
  r.confere("aberta de novo, o bloco mostra 'Repetição: sempre'", (await blocoGatilho().innerText()).includes("Repetição: sempre"))

  // As regras deste roteiro não ficam ativas para os outros
  await db.from("automation_flows").delete().eq("workspace_id", ws).in("id", [regraCard, regraMensagem])

  r.confere("sem erro no console", erros.length === 0, erros.join(" | "))
  await browser.close()
  process.exit(r.imprimir() ? 1 : 0)
})().catch((e) => {
  console.error("PAROU:", e.message.split("\n")[0])
  process.exit(1)
})
