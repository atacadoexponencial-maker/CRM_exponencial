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

  r.confere("sem erro no console", erros.length === 0, erros.join(" | "))
  await browser.close()
  process.exit(r.imprimir() ? 1 : 0)
})().catch((e) => {
  console.error("PAROU:", e.message.split("\n")[0])
  process.exit(1)
})
