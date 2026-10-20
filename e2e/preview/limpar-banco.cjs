/* eslint-disable @typescript-eslint/no-require-imports */
// Limpa os DADOS de uma empresa para testar de novo, sem desconectar o número.
//
// Apaga: contatos, conversas, mensagens, etiquetas das conversas, cards do funil,
// tags, lembretes, execuções de sequência e de automação, fila de automação,
// alertas e eventos do gateway.
// Fica: a empresa, os logins, os times, os números de WhatsApp conectados, as
// automações, as sequências, as etiquetas, as mensagens rápidas e o catálogo.
//
// Uso (na raiz do projeto, com .env.local):
//   node e2e/preview/limpar-banco.cjs                      # só mostra o que apagaria
//   node e2e/preview/limpar-banco.cjs --executar           # apaga de verdade
//   node e2e/preview/limpar-banco.cjs --empresa "Nome"     # outra empresa (padrão: Marcelle Midias)
//
// Nunca toca em whatsapp_connections. A chave de serviço vem do .env.local.

const path = require("path")
const PROJETO = path.resolve(__dirname, "..", "..")
process.loadEnvFile(path.join(PROJETO, ".env.local"))
const { createClient } = require(path.join(PROJETO, "node_modules/@supabase/supabase-js"))

const args = process.argv.slice(2)
const executar = args.includes("--executar")
const i = args.indexOf("--empresa")
const EMPRESA = i >= 0 ? args[i + 1] : "Marcelle Midias"

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function feito(consulta) {
  const r = await consulta
  if (r.error) throw new Error(r.error.message)
  return r
}

;(async () => {
  const { data: empresas } = await feito(sb.from("workspaces").select("id, name").eq("name", EMPRESA))
  if (!empresas || empresas.length !== 1) throw new Error(`esperava 1 empresa chamada "${EMPRESA}", achei ${empresas?.length ?? 0}`)
  const ws = empresas[0].id

  const { data: contatos } = await feito(sb.from("contacts").select("id").eq("workspace_id", ws))
  const cids = contatos.map((c) => c.id)
  const { data: convs } = await feito(sb.from("conversations").select("id").eq("workspace_id", ws))
  const vids = convs.map((c) => c.id)

  // Ordem: filhos antes dos pais.
  const passos = [
    ["messages", (q) => q.in("conversation_id", vids)],
    ["conversation_labels", (q) => q.in("conversation_id", vids)],
    ["automation_runs", (q) => q.eq("workspace_id", ws)],
    ["automation_queue", (q) => q.eq("workspace_id", ws)],
    ["operational_alerts", (q) => q.eq("workspace_id", ws)],
    ["gateway_events", (q) => q.eq("workspace_id", ws)],
    ["reminders", (q) => q.in("contact_id", cids)],
    ["sequence_runs", (q) => q.in("contact_id", cids)],
    ["pipeline_cards", (q) => q.eq("workspace_id", ws)],
    ["contact_tags", (q) => q.eq("workspace_id", ws)],
    ["conversations", (q) => q.eq("workspace_id", ws)],
    ["contacts", (q) => q.eq("workspace_id", ws)],
  ]

  console.log(`${executar ? "APAGANDO" : "Simulação (sem --executar)"} em "${EMPRESA}"`)
  for (const [tabela, filtro] of passos) {
    const base = executar ? sb.from(tabela).delete({ count: "exact" }) : sb.from(tabela).select("*", { count: "exact", head: true })
    const { count } = await feito(filtro(base))
    console.log(`  ${executar ? "apagado" : "apagaria"} ${tabela.padEnd(20)} ${count ?? 0}`)
  }

  const { data: numeros } = await feito(sb.from("whatsapp_connections").select("phone_number, status").eq("workspace_id", ws).eq("status", "connected"))
  console.log("números conectados (ficam):", numeros.map((n) => n.phone_number).join(", ") || "nenhum")
})().catch((e) => {
  console.error("ERRO:", e.message)
  process.exit(1)
})
