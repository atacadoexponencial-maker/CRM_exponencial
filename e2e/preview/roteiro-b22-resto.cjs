/* eslint-disable @typescript-eslint/no-require-imports */
// Lote 4 das correções do QA das automações (B22-22 em diante) no preview, pela
// tela, com a empresa de teste no estado inicial (rode o resetar antes). Cada
// trecho é de uma issue. O que pede outro papel cria um usuário temporário na
// empresa de teste e o apaga no fim.
// Uso: node e2e/preview/roteiro-b22-resto.cjs <endereço do preview>

const { randomUUID } = require("node:crypto")
const { abrirPreview, bancoDeServico, conferirEmpresaDeTeste, criarRelatorio, esperarAutomacoes } = require("./comum.cjs")
const { moverCard } = require("./tela.cjs")

const URL_PREVIEW = process.argv[2]

/** Atendente temporário da empresa de teste, com e-mail de domínio reservado. */
async function criarAtendente(db, ws) {
  const email = `b22-atendente-${Date.now()}@example.com`
  const senha = `B22-${randomUUID()}`
  const { data, error } = await db.auth.admin.createUser({ email, password: senha, email_confirm: true })
  if (error) throw new Error(error.message)
  const id = data.user.id
  const { error: erroPerfil } = await db
    .from("profiles")
    .insert({ id, workspace_id: ws, name: "Atendente B22", role: "atendente", status: "active" })
  if (erroPerfil) {
    await db.auth.admin.deleteUser(id)
    throw new Error(erroPerfil.message)
  }
  return { id, email, senha }
}

async function apagarAtendente(db, ws, id) {
  await db.from("pipeline_cards").update({ atendente_id: null }).eq("workspace_id", ws).eq("atendente_id", id)
  await db.from("profiles").delete().eq("workspace_id", ws).eq("id", id)
  await db.auth.admin.deleteUser(id)
}

;(async () => {
  if (!URL_PREVIEW) throw new Error("passe o endereço do preview (veja endereco-preview.cjs)")
  const db = bancoDeServico()
  const { browser, page, erros, workspaceId: ws } = await abrirPreview(URL_PREVIEW)
  await conferirEmpresaDeTeste(db, ws)
  const r = criarRelatorio()

  // B22-22 (A7): atendente marca Ganho e o card de Recompra nasce
  const atendente = await criarAtendente(db, ws)
  const sessaoAtendente = await abrirPreview(URL_PREVIEW, atendente)
  try {
    const { data: carla } = await db.from("contacts").select("id").eq("workspace_id", ws).eq("name", "Teste B11 Carla").single()
    await db.from("pipeline_cards").update({ atendente_id: atendente.id }).eq("workspace_id", ws).eq("contact_id", carla.id).eq("funil", "entrada")
    await moverCard(sessaoAtendente.page, URL_PREVIEW, "Teste B11 Carla", "Ganho")
    await esperarAutomacoes(db, ws)
    const { data: recompra } = await db
      .from("pipeline_cards")
      .select("etapa")
      .eq("workspace_id", ws)
      .eq("contact_id", carla.id)
      .eq("funil", "recompra")
    r.confere("B22-22: atendente marca Ganho e o card de Recompra nasce em Onboarding", recompra?.length === 1 && recompra[0].etapa === "onboarding", JSON.stringify(recompra))
    r.confere("B22-22: sem erro no console do atendente", sessaoAtendente.erros.length === 0, sessaoAtendente.erros.join(" | "))
  } finally {
    await sessaoAtendente.browser.close()
    await apagarAtendente(db, ws, atendente.id)
  }

  // B22-25 (M5): regra com fluxo fora do formato aparece na lista e dá para pausar
  const { data: quebrada } = await db
    .from("automation_flows")
    .insert({
      workspace_id: ws,
      nome: "B22-25 Quebrada",
      ativa: true,
      repeticao: { modo: "sempre" },
      fluxo: {
        blocos: [
          { id: "g", tipo: "gatilho", gatilho: "conversa_criada", parametros: {}, posicao: { x: 0, y: 0 } },
          { id: "sem-tipo", posicao: { x: 0, y: 150 } },
        ],
        ligacoes: [],
      },
    })
    .select("id")
    .single()
  await page.goto(`${URL_PREVIEW}/configuracoes/automacoes`, { waitUntil: "networkidle" })
  const linhaQuebrada = page.locator("tbody tr").filter({ hasText: "B22-25 Quebrada" })
  r.confere("B22-25: a regra quebrada aparece na lista", (await linhaQuebrada.count()) === 1)
  r.confere("B22-25: e diz que não roda", (await linhaQuebrada.innerText()).includes("Não roda"))
  await linhaQuebrada.getByRole("switch", { name: "Pausar B22-25 Quebrada" }).click()
  await page.getByText("Salvando…").waitFor({ state: "hidden", timeout: 20000 })
  const { data: pausada } = await db.from("automation_flows").select("ativa").eq("id", quebrada.id).single()
  r.confere("B22-25: dá para pausar pela tela", pausada?.ativa === false)
  await db.from("automation_flows").delete().eq("workspace_id", ws).eq("id", quebrada.id)

  // B22-26 (M6): "Novo lead" para quem já está no Funil de Entrada não cria outro card
  const { data: ana } = await db.from("contacts").select("id, phone_number").eq("workspace_id", ws).eq("name", "Teste B11 Ana").single()
  await page.goto(`${URL_PREVIEW}/pipeline`, { waitUntil: "networkidle" })
  await page.getByRole("button", { name: "Novo lead" }).click()
  await page.locator("#telefone").fill(ana.phone_number)
  await page.locator("#nome").fill("Teste B11 Ana")
  await page.getByRole("button", { name: "Criar lead" }).click()
  await page.getByText("Este contato já está no Funil de Entrada.").waitFor({ timeout: 20000 })
  r.confere("B22-26: 'Novo lead' de quem já está no funil avisa", true)
  const { data: cardsDaAna } = await db.from("pipeline_cards").select("id").eq("workspace_id", ws).eq("contact_id", ana.id).eq("funil", "entrada")
  r.confere("B22-26: e não cria o segundo card", cardsDaAna?.length === 1, String(cardsDaAna?.length))

  // B22-27 (M8): etiqueta apagada depois de a regra existir
  const { data: temporaria } = await db.from("labels").insert({ workspace_id: ws, name: "B22-27 Temporária", color: "#f97316" }).select("id").single()
  const { data: comEtiqueta } = await db
    .from("automation_flows")
    .insert({
      workspace_id: ws,
      nome: "B22-27 Etiqueta apagada",
      ativa: false,
      repeticao: { modo: "sempre" },
      fluxo: {
        blocos: [
          { id: "g", tipo: "gatilho", gatilho: "conversa_criada", parametros: {}, posicao: { x: 0, y: 0 } },
          { id: "a", tipo: "acao", acao: "aplicar_etiqueta", parametros: { label_id: temporaria.id }, posicao: { x: 0, y: 150 } },
        ],
        ligacoes: [{ de: "g", saida: "proximo", para: "a" }],
      },
    })
    .select("id")
    .single()
  await db.from("labels").delete().eq("id", temporaria.id)
  await page.goto(`${URL_PREVIEW}/configuracoes/automacoes`, { waitUntil: "networkidle" })
  const linhaApagada = page.locator("tbody tr").filter({ hasText: "B22-27 Etiqueta apagada" })
  r.confere("B22-27: a lista avisa da etiqueta apagada", (await linhaApagada.innerText()).includes("Atenção: Etiqueta"))
  r.confere("B22-27: o resumo não mostra o id", !(await linhaApagada.innerText()).includes(temporaria.id))
  await linhaApagada.getByRole("switch", { name: "Ativar B22-27 Etiqueta apagada" }).click()
  await page.getByRole("alert").filter({ hasText: "Não dá para ativar" }).waitFor({ timeout: 20000 })
  const { data: continuaPausada } = await db.from("automation_flows").select("ativa").eq("id", comEtiqueta.id).single()
  r.confere("B22-27: ativar com etiqueta apagada recusa", continuaPausada?.ativa === false)
  await page.goto(`${URL_PREVIEW}/configuracoes/automacoes/${comEtiqueta.id}`, { waitUntil: "networkidle" })
  await page.waitForSelector(".react-flow__node")
  const blocoEtiqueta = page.locator(".react-flow__node").nth(1)
  r.confere("B22-27: no editor, o bloco diz '(não existe mais)'", (await blocoEtiqueta.innerText()).includes("(não existe mais)"))
  r.confere("B22-27: e fica marcado com o problema", (await blocoEtiqueta.innerText()).includes("foi apagada ou desativada"))
  await db.from("automation_flows").delete().eq("workspace_id", ws).eq("id", comEtiqueta.id)

  r.confere("sem erro no console", erros.length === 0, erros.join(" | "))
  await browser.close()
  process.exit(r.imprimir() ? 1 : 0)
})().catch((e) => {
  console.error("PAROU:", e.message.split("\n")[0])
  process.exit(1)
})
