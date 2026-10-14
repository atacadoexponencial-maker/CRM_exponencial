/* eslint-disable @typescript-eslint/no-require-imports */
// B22-13 no preview, pela tela, com a empresa de teste no estado inicial (rode o
// resetar antes): "Duplicar" no painel de uma ação e de uma condição.
//  - A cópia nasce solta (sem seta), selecionada e com a mesma configuração.
//  - Mudar a cópia não muda o original.
//  - O gatilho não tem "Duplicar".
// Uso: node e2e/preview/roteiro-b22-13.cjs <endereço do preview>

const { abrirPreview, bancoDeServico, conferirEmpresaDeTeste, criarRelatorio } = require("./comum.cjs")
const { adicionarBloco, escolher, novaRegra } = require("./tela.cjs")

const URL_PREVIEW = process.argv[2]

;(async () => {
  if (!URL_PREVIEW) throw new Error("passe o endereço do preview (veja endereco-preview.cjs)")
  const db = bancoDeServico()
  const { browser, page, erros, workspaceId: ws } = await abrirPreview(URL_PREVIEW)
  await conferirEmpresaDeTeste(db, ws)
  const r = criarRelatorio()
  const blocos = page.locator(".react-flow__node")
  const setas = page.locator(".react-flow__edge")
  const duplicar = () => page.getByRole("button", { name: "Duplicar", exact: true })
  // Segunda etiqueta, para mudar a cópia da condição; sai no fim
  const { data: outra } = await db
    .from("labels")
    .insert({ workspace_id: ws, name: "Cliente", color: "#3b82f6" })
    .select("id")
    .single()

  await novaRegra(page, URL_PREVIEW, "B22-13 Duplicar", "Sondagem")
  r.confere("o gatilho não tem 'Duplicar'", (await duplicar().count()) === 0)

  // Ação
  await adicionarBloco(page, "Atribuir atendente")
  await escolher(page, "#painel-campo-atendente_id", "Admin Teste B11")
  await duplicar().click()
  await page.waitForTimeout(300)
  r.confere("a ação duplicada vira um terceiro bloco", (await blocos.count()) === 3, String(await blocos.count()))
  r.confere("a cópia nasce sem seta", (await setas.count()) === 1, String(await setas.count()))
  r.confere(
    "a cópia tem o mesmo atendente",
    (await blocos.filter({ hasText: "Admin Teste B11" }).count()) === 2
  )
  r.confere("a cópia fica selecionada, com o painel aberto", (await page.locator(".react-flow__node.selected").count()) === 1)
  r.confere("o painel mostra o atendente da cópia", (await page.locator("#painel-campo-atendente_id").innerText()).includes("Admin Teste B11"))

  // Condição
  await adicionarBloco(page, "Condição (sim / não)", { bloco: "Admin Teste B11", indice: 0 })
  await page.getByRole("button", { name: "Adicionar verificação" }).click()
  await escolher(page, '[aria-label="Atributo"]', "Etiqueta da conversa")
  await escolher(page, '[aria-label="Valor"]', "Interessado")
  await duplicar().click()
  await page.waitForTimeout(300)
  const condicoes = blocos.filter({ hasText: "Interessado" })
  r.confere("a condição duplicada tem a mesma verificação", (await condicoes.count()) === 2, String(await condicoes.count()))

  // Mudar a cópia não mexe no original
  await escolher(page, '[aria-label="Valor"]', "Cliente")
  r.confere("mudar a verificação da cópia não muda o original", (await condicoes.count()) === 1 && (await blocos.filter({ hasText: "Cliente" }).count()) === 1)

  await db.from("labels").delete().eq("workspace_id", ws).eq("id", outra.id)

  r.confere("sem erro no console", erros.length === 0, erros.join(" | "))
  await browser.close()
  process.exit(r.imprimir() ? 1 : 0)
})().catch((e) => {
  console.error("PAROU:", e.message.split("\n")[0])
  process.exit(1)
})
