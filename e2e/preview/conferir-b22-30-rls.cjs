/* eslint-disable @typescript-eslint/no-require-imports */
// B22-30 depois da migration 20261014000003 aplicada: um atendente da empresa de
// teste não lê as regras de automação pela API do Supabase, e o admin lê. Cria um
// atendente temporário e o apaga no fim. Não precisa do preview: fala direto com o
// banco, com a chave pública, como o navegador de quem estivesse logado.
// Uso: node e2e/preview/conferir-b22-30-rls.cjs

const { createClient } = require("@supabase/supabase-js")
const { apagarAtendente, bancoDeServico, conferirEmpresaDeTeste, criarAtendente, criarRelatorio, lerEnv } = require("./comum.cjs")

;(async () => {
  const env = lerEnv()
  const db = bancoDeServico(env)
  const ws = env.B11_TESTE_WORKSPACE_ID
  await conferirEmpresaDeTeste(db, ws)
  const r = criarRelatorio()

  const { data: regra } = await db
    .from("automation_flows")
    .insert({
      workspace_id: ws,
      nome: "B22-30 RLS",
      ativa: false,
      repeticao: { modo: "sempre" },
      fluxo: { blocos: [{ id: "g", tipo: "gatilho", gatilho: "conversa_criada", parametros: {}, posicao: { x: 0, y: 0 } }], ligacoes: [] },
    })
    .select("id")
    .single()

  const atendente = await criarAtendente(db, ws, "Atendente B22-30")
  try {
    const lerComo = async (login, segredo) => {
      const cliente = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
      const { error: erroLogin } = await cliente.auth.signInWithPassword({ email: login, password: segredo })
      if (erroLogin) throw new Error(erroLogin.message)
      const { data } = await cliente.from("automation_flows").select("id").eq("id", regra.id)
      return data?.length ?? 0
    }
    r.confere("B22-30: atendente não lê as regras", (await lerComo(atendente.email, atendente.senha)) === 0)
    r.confere("B22-30: o admin continua lendo", (await lerComo(env.B11_TESTE_EMAIL, env.B11_TESTE_SENHA)) === 1)
  } finally {
    await db.from("automation_flows").delete().eq("id", regra.id)
    await apagarAtendente(db, ws, atendente.id)
  }
  process.exit(r.imprimir() ? 1 : 0)
})().catch((e) => {
  console.error("PAROU:", e.message.split("\n")[0])
  process.exit(1)
})
