/* eslint-disable @typescript-eslint/no-require-imports */
// Cria a empresa "[TESTE] Automações B11" no Supabase (que é o de produção), pelo
// mesmo caminho do cadastro do site: usuário no Auth + `cadastrar_empresa`. Depois
// acrescenta o que os roteiros usam: 3 contatos com card no Funil de Entrada
// (telefones falsos), conversas da Ana e do Bruno sem número conectado, a
// etiqueta "Interessado" na conversa do Bruno, o admin no time Entrada e uma
// regra da primeira versão (tabela `automations`).
// Grava e-mail, senha e id no .env.local, sem mostrar a senha.
// Uso: node e2e/preview/criar-empresa-teste.cjs

const crypto = require("crypto")
const fs = require("fs")
const path = require("path")
const { PROJETO, lerEnv, bancoDeServico } = require("./comum.cjs")

;(async () => {
  const env = lerEnv()
  if (env.B11_TESTE_WORKSPACE_ID) throw new Error("o .env.local já aponta para uma empresa de teste; use o resetar")
  const db = bancoDeServico(env)
  const feito = async (consulta) => {
    const { data, error } = await consulta
    if (error) throw new Error(error.message)
    return data
  }

  const email = "teste-automacoes-b11@example.com"
  const senha = crypto.randomBytes(18).toString("base64url")
  const { data: usuario, error: erroUsuario } = await db.auth.admin.createUser({ email, password: senha, email_confirm: true })
  if (erroUsuario) throw new Error("usuário: " + erroUsuario.message)
  const admin = usuario.user.id

  const { data: ws, error: erroCadastro } = await db.rpc("cadastrar_empresa", {
    p_user_id: admin,
    p_nome_empresa: "[TESTE] Automações B11",
    p_nome_responsavel: "Admin Teste B11",
  })
  if (erroCadastro) {
    await db.auth.admin.deleteUser(admin)
    throw new Error("cadastro: " + erroCadastro.message)
  }

  const contatos = await feito(
    db
      .from("contacts")
      .insert(
        ["Ana", "Bruno", "Carla"].map((nome, i) => ({
          workspace_id: ws,
          name: `Teste B11 ${nome}`,
          phone_number: `55000000001${String(i + 1).padStart(2, "0")}`,
        }))
      )
      .select("id, name")
  )
  const porNome = Object.fromEntries(contatos.map((c) => [c.name.replace("Teste B11 ", ""), c.id]))
  await feito(
    db.from("pipeline_cards").insert(contatos.map((c) => ({ workspace_id: ws, contact_id: c.id, funil: "entrada", etapa: "lead" })))
  )

  const entrada = (await feito(db.from("teams").select("id").eq("workspace_id", ws).eq("name", "Entrada")))[0]
  await feito(db.from("user_teams").insert({ user_id: admin, team_id: entrada.id }))
  const etiqueta = (await feito(db.from("labels").insert({ workspace_id: ws, name: "Interessado", color: "#22c55e" }).select("id")))[0]

  const agora = new Date().toISOString()
  const conversas = await feito(
    db
      .from("conversations")
      .insert(
        ["Ana", "Bruno"].map((nome) => ({
          workspace_id: ws,
          contact_id: porNome[nome],
          status: "em_atendimento",
          assigned_to: null,
          unread_count: 0,
          last_message_text: "",
          last_message_at: agora,
        }))
      )
      .select("id, contact_id")
  )
  const conversaBruno = conversas.find((c) => c.contact_id === porNome.Bruno).id
  await feito(db.from("conversation_labels").insert({ conversation_id: conversaBruno, label_id: etiqueta.id }))

  await feito(
    db.from("automations").insert({
      workspace_id: ws,
      nome: "Regra antiga: follow do catálogo",
      gatilho_tipo: "card_movido",
      gatilho_config: { funil: "entrada", etapa: "follow_catalogo" },
      acao_tipo: "atribuir_atendente",
      acao_config: { atendente_id: admin },
    })
  )

  fs.appendFileSync(
    path.join(PROJETO, ".env.local"),
    [
      "# Empresa de teste da B11 (e2e/preview). Não versionar.",
      `B11_TESTE_EMAIL=${email}`,
      `B11_TESTE_SENHA=${senha}`,
      `B11_TESTE_WORKSPACE_ID=${ws}`,
      "",
    ].join("\n")
  )
  console.log(`empresa de teste criada: ${ws} (${email})`)
})().catch((e) => {
  console.error("FALHOU:", e.message)
  process.exit(1)
})
