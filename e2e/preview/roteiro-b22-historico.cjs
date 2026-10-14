/* eslint-disable @typescript-eslint/no-require-imports */
// Lote 3 das correções do QA das automações (B22-15 em diante) no preview, pela
// tela, com a empresa de teste no estado inicial (rode o resetar antes): a página
// de histórico e a lista de automações. As execuções são gravadas direto no banco,
// para o roteiro não depender de disparar regras.
// Uso: node e2e/preview/roteiro-b22-historico.cjs <endereço do preview>

const { randomUUID } = require("node:crypto")
const { abrirPreview, bancoDeServico, conferirEmpresaDeTeste, criarRelatorio } = require("./comum.cjs")

const URL_PREVIEW = process.argv[2]
const HISTORICO = "/configuracoes/automacoes/historico"

;(async () => {
  if (!URL_PREVIEW) throw new Error("passe o endereço do preview (veja endereco-preview.cjs)")
  const db = bancoDeServico()
  const { browser, page, erros, workspaceId: ws } = await abrirPreview(URL_PREVIEW)
  await conferirEmpresaDeTeste(db, ws)
  const r = criarRelatorio()

  // Execuções de uma regra que não existe mais, para a Ana
  const { data: ana } = await db.from("contacts").select("id").eq("workspace_id", ws).eq("name", "Teste B11 Ana").single()
  const regraExcluida = randomUUID()
  const { error } = await db.from("automation_runs").insert(
    ["concluida", "falhou"].map((resultado) => ({
      workspace_id: ws,
      regra_id: regraExcluida,
      regra_nome: "B22 Regra excluída",
      regra_origem: "fluxo",
      contact_id: ana.id,
      evento: { tipo: "conversa_criada" },
      resultado,
      motivo: resultado === "falhou" ? "Falha de teste do roteiro" : null,
      caminho: [],
    }))
  )
  if (error) throw new Error(error.message)

  // B22-15 (M12): o detalhe fecha pelo X
  await page.goto(`${URL_PREVIEW}${HISTORICO}`, { waitUntil: "networkidle" })
  await page.locator("tbody tr").first().click()
  const detalhe = page.getByRole("dialog")
  await detalhe.waitFor()
  await detalhe.getByRole("button", { name: "Fechar" }).click()
  await detalhe.waitFor({ state: "hidden" })
  r.confere("B22-15: o detalhe da execução fecha pelo botão 'Fechar'", true)

  // B22-16 (M13): no celular (390 px), o Resultado cabe na tela e o contato aparece
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${URL_PREVIEW}${HISTORICO}`, { waitUntil: "networkidle" })
  const primeira = page.locator("tbody tr").first()
  const selo = await primeira.locator("td").nth(4).boundingBox()
  r.confere("B22-16: no celular, o Resultado cabe na tela", selo !== null && selo.x + selo.width <= 390, JSON.stringify(selo))
  r.confere("B22-16: no celular, o contato aparece na linha", await primeira.getByText("Teste B11 Ana").first().isVisible())
  const largura = await page.evaluate(() => document.documentElement.scrollWidth)
  r.confere("B22-16: a página não rola para o lado", largura <= 390, String(largura))
  await page.setViewportSize({ width: 1280, height: 800 })

  // B22-17 (M14): o contato da linha leva ao perfil, sem abrir o detalhe
  await page.goto(`${URL_PREVIEW}${HISTORICO}`, { waitUntil: "networkidle" })
  // No computador, a coluna Contato (a linha de baixo do nome é só do celular)
  await page.locator("tbody tr").first().locator("td").nth(2).getByRole("link", { name: "Teste B11 Ana" }).click()
  await page.waitForURL(new RegExp(`/contatos/${ana.id}`), { timeout: 20000 })
  r.confere("B22-17: o contato da linha abre o perfil dele", true)

  // B22-18 (M15): duplicar uma regra de nome com 120 caracteres mantém o "(cópia)"
  const nomeLongo = `B22-18 ${"x".repeat(113)}`
  const { data: longa } = await db
    .from("automation_flows")
    .insert({
      workspace_id: ws,
      nome: nomeLongo,
      ativa: false,
      repeticao: { modo: "sempre" },
      fluxo: {
        blocos: [
          { id: "g", tipo: "gatilho", gatilho: "conversa_criada", parametros: {}, posicao: { x: 0, y: 0 } },
          { id: "a", tipo: "acao", acao: "resolver_conversa", parametros: {}, posicao: { x: 0, y: 150 } },
        ],
        ligacoes: [{ de: "g", saida: "proximo", para: "a" }],
      },
    })
    .select("id")
    .single()
  await page.goto(`${URL_PREVIEW}/configuracoes/automacoes`, { waitUntil: "networkidle" })
  await page.getByRole("button", { name: `Abrir menu de ${nomeLongo}` }).click()
  await page.getByRole("menuitem", { name: "Duplicar" }).click()
  let copia = null
  for (let i = 0; i < 20 && !copia; i++) {
    await page.waitForTimeout(500)
    const { data } = await db.from("automation_flows").select("id, nome").eq("workspace_id", ws).like("nome", "B22-18 %(cópia)")
    copia = data?.[0] ?? null
  }
  r.confere("B22-18: a cópia termina em '(cópia)' e cabe em 120", copia?.nome.endsWith(" (cópia)") && copia.nome.length <= 120, copia?.nome)
  await db.from("automation_flows").delete().eq("workspace_id", ws).in("id", [longa.id, copia?.id].filter(Boolean))

  // B22-19 (M16): filtro por regra excluída sem execução na lista mostra o nome, não o id
  await page.goto(`${URL_PREVIEW}${HISTORICO}?regra=${regraExcluida}&resultado=ignorada`, { waitUntil: "networkidle" })
  const filtroRegra = (await page.locator('[aria-label="Filtrar por automação"]').innerText()).trim()
  r.confere("B22-19: o filtro mostra o nome da regra excluída", filtroRegra.includes("B22 Regra excluída"), filtroRegra)
  r.confere("B22-19: e não o id", !filtroRegra.includes(regraExcluida))

  // ?regra= que não é de nenhuma automação: ignora e avisa
  await page.goto(`${URL_PREVIEW}${HISTORICO}?regra=nao-existe`, { waitUntil: "networkidle" })
  r.confere(
    "B22-19: ?regra= desconhecida avisa",
    await page.getByRole("alert").filter({ hasText: "A automação do endereço não foi encontrada" }).isVisible()
  )
  r.confere("B22-19: e mostra todas as execuções", (await page.locator("tbody tr").count()) === 2, String(await page.locator("tbody tr").count()))

  r.confere("sem erro no console", erros.length === 0, erros.join(" | "))
  await browser.close()
  process.exit(r.imprimir() ? 1 : 0)
})().catch((e) => {
  console.error("PAROU:", e.message.split("\n")[0])
  process.exit(1)
})
