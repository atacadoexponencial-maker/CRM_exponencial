/* eslint-disable @typescript-eslint/no-require-imports */
// Devolve a empresa de teste ao estado inicial dos roteiros: sem regras em fluxo
// nem histórico, regra antiga ativa, cards da Entrada em Lead sem atendente, sem
// cards na Recompra, conversas sem atendente, só a etiqueta "Interessado" (na
// conversa do Bruno), sem tags e sem tipo, nicho, cidade e observações.
// Só mexe na empresa cujo nome começa com "[TESTE]".
// Uso: node e2e/preview/resetar-empresa-teste.cjs

const { lerEnv, bancoDeServico, conferirEmpresaDeTeste } = require("./comum.cjs")

;(async () => {
  const env = lerEnv()
  const ws = env.B11_TESTE_WORKSPACE_ID
  const db = bancoDeServico(env)
  await conferirEmpresaDeTeste(db, ws)
  const feito = async (consulta) => {
    const { data, error } = await consulta
    if (error) throw new Error(error.message)
    return data
  }

  const contatos = await feito(db.from("contacts").select("id, name").eq("workspace_id", ws))
  const bruno = contatos.find((c) => c.name.endsWith("Bruno"))?.id
  const etiqueta = (await feito(db.from("labels").select("id").eq("workspace_id", ws).eq("name", "Interessado")))[0]?.id

  await feito(db.from("automation_flows").delete().eq("workspace_id", ws))
  // O histórico de execuções chega na B11-03; antes dela a tabela não existe
  const { error: erroHistorico } = await db.from("automation_runs").delete().eq("workspace_id", ws)
  if (erroHistorico && !/automation_runs/.test(erroHistorico.message)) throw new Error(erroHistorico.message)
  await feito(db.from("automations").update({ ativa: true }).eq("workspace_id", ws))
  await feito(db.from("pipeline_cards").delete().eq("workspace_id", ws).eq("funil", "recompra"))
  await feito(db.from("pipeline_cards").update({ etapa: "lead", atendente_id: null }).eq("workspace_id", ws).eq("funil", "entrada"))
  await feito(db.from("contact_tags").delete().eq("workspace_id", ws))
  await feito(
    db.from("contacts").update({ tipo: null, nicho: null, cidade: null, observacoes: null }).in("id", contatos.map((c) => c.id))
  )

  // Etiquetas criadas pelos roteiros (VIP, Temporária): fica só a "Interessado"
  await feito(db.from("labels").delete().eq("workspace_id", ws).neq("name", "Interessado"))

  const conversas = await feito(db.from("conversations").select("id, contact_id").eq("workspace_id", ws))
  await feito(db.from("conversations").update({ assigned_to: null }).eq("workspace_id", ws))
  await feito(db.from("conversation_labels").delete().in("conversation_id", conversas.map((c) => c.id)))
  const conversaBruno = conversas.find((c) => c.contact_id === bruno)
  if (conversaBruno && etiqueta) {
    await feito(db.from("conversation_labels").insert({ conversation_id: conversaBruno.id, label_id: etiqueta }))
  }

  console.log("empresa de teste no estado inicial")
})().catch((e) => {
  console.error("FALHOU:", e.message)
  process.exit(1)
})
