/* eslint-disable @typescript-eslint/no-require-imports */
// B36: fotografa as telas do sistema no tema claro e no escuro, logado como o admin da
// empresa de teste, para conferir o visual sem abrir tela por tela.
//
//   node e2e/preview/fotos-das-telas.cjs <endereço> [pasta-de-saída] [rota1,rota2,...]
//
// O tema é trocado pelo próprio menu do usuário, como a pessoa faria.

const fs = require("fs")
const path = require("path")
const { abrirPreview } = require("./comum.cjs")

const ROTAS = [
  "/dashboard", "/dashboard/performance", "/relatorios", "/pipeline", "/pipeline/recompra", "/chat",
  "/contatos", "/contatos/lixeira", "/catalogo", "/catalogo/pedidos", "/catalogo/aparencia", "/catalogo/configuracoes", "/catalogo/importar",
  "/agenda", "/agenda/equipe", "/alertas", "/sequencias", "/campanhas", "/configuracoes/automacoes", "/configuracoes/automacoes/historico",
  "/configuracoes/usuarios", "/configuracoes/times", "/configuracoes/whatsapp", "/configuracoes/etiquetas", "/configuracoes/mensagens-rapidas",
  "/configuracoes/templates", "/perfil",
]

async function trocarTema(page, nome) {
  await page.getByLabel("Menu do usuário").locator("visible=true").first().click()
  await page.getByRole("menuitemradio", { name: nome }).click()
  await page.keyboard.press("Escape")
  await page.waitForTimeout(400)
}

async function main() {
  const [url, saida = "fotos-telas", lista] = process.argv.slice(2)
  if (!url) throw new Error("passe o endereço: node e2e/preview/fotos-das-telas.cjs <endereço>")
  const rotas = lista ? lista.split(",") : ROTAS
  fs.mkdirSync(saida, { recursive: true })
  const { browser, page, erros } = await abrirPreview(url)
  const larguras = (process.env.LARGURAS ?? "1400").split(",").map(Number)
  for (const tema of ["Claro", "Escuro"]) {
    await page.goto(`${url}/dashboard`, { waitUntil: "networkidle", timeout: 120000 })
    await trocarTema(page, tema)
    for (const largura of larguras) {
      await page.setViewportSize({ width: largura, height: largura < 700 ? 844 : 860 })
      for (const rota of rotas) {
        await page.goto(`${url}${rota}`, { waitUntil: "networkidle", timeout: 120000 }).catch(() => {})
        await page.waitForTimeout(800)
        const nome = `${tema.toLowerCase()}-${largura}${rota.replace(/\//g, "_")}.png`
        await page.screenshot({ path: path.join(saida, nome), fullPage: true })
        console.log("foto", nome)
      }
    }
  }
  await trocarTema(page, "Claro")
  if (erros.length) console.log("erros na página:\n" + erros.join("\n"))
  await browser.close()
}

main().catch((e) => { console.error(e); process.exit(1) })
