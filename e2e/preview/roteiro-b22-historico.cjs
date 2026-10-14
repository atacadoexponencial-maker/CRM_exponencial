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

  r.confere("sem erro no console", erros.length === 0, erros.join(" | "))
  await browser.close()
  process.exit(r.imprimir() ? 1 : 0)
})().catch((e) => {
  console.error("PAROU:", e.message.split("\n")[0])
  process.exit(1)
})
