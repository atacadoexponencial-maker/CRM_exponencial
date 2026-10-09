// @vitest-environment node
// B21-04 — nenhum registro aponta para algo de outra empresa (auditoria de 06/10/2026,
// rodada 3). Grava com a service role, que passa por cima das permissões: o que recusa
// aqui é a trigger garantir_mesma_empresa, a última barreira para todos os caminhos.

import { createClient } from "@supabase/supabase-js"
import { describe, it, expect, beforeAll, afterAll } from "vitest"

const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const ts = Date.now()

type Empresa = {
  id: string; usuario: string; time: string; contato: string; conversa: string; etiqueta: string
  card: string; sequencia: string; campanha: string; pedido: string; categoria: string; produto: string
}
const empresas: Empresa[] = []
const usuarios: string[] = []

async function montarEmpresa(sufixo: string): Promise<Empresa> {
  const id = (await service.from("workspaces").insert({ name: `Referências B21 ${sufixo} ${ts}` }).select("id").single()).data!.id
  const usuario = (await service.auth.admin.createUser({ email: `b21-04-${sufixo}-${ts}@teste.com`, password: "senha-segura-123", email_confirm: true })).data.user!.id
  usuarios.push(usuario)
  await service.from("profiles").insert({ id: usuario, workspace_id: id, name: sufixo, role: "admin" })
  const time = (await service.from("teams").insert({ workspace_id: id, name: "Entrada" }).select("id").single()).data!.id
  const contato = (await service.from("contacts").insert({ workspace_id: id, name: "Cliente", phone_number: `5521${sufixo === "A" ? "1" : "2"}${String(ts).slice(-8)}` }).select("id").single()).data!.id
  const conversa = (await service.from("conversations").insert({ workspace_id: id, contact_id: contato }).select("id").single()).data!.id
  const etiqueta = (await service.from("labels").insert({ workspace_id: id, name: "VIP", color: "#f00" }).select("id").single()).data!.id
  const card = (await service.from("pipeline_cards").insert({ workspace_id: id, contact_id: contato, etapa: "lead" }).select("id").single()).data!.id
  const sequencia = (await service.from("sequences").insert({ workspace_id: id, nome: "Seq" }).select("id").single()).data!.id
  const campanha = (await service.from("campaigns").insert({ workspace_id: id, nome: "Camp" }).select("id").single()).data!.id
  const pedido = (await service.from("catalog_orders").insert({ workspace_id: id, number: 1, customer_name: "C", customer_whatsapp: "5521999990000", pieces: 1, total: 10 }).select("id").single()).data!.id
  const categoria = (await service.from("catalog_categories").insert({ workspace_id: id, name: "Cat" }).select("id").single()).data!.id
  const produto = (await service.from("catalog_products").insert({ workspace_id: id, name: "Camisa", price: 10 }).select("id").single()).data!.id
  return { id, usuario, time, contato, conversa, etiqueta, card, sequencia, campanha, pedido, categoria, produto }
}

beforeAll(async () => {
  empresas.push(await montarEmpresa("A"), await montarEmpresa("B"))
}, 90_000)

afterAll(async () => {
  const ids = empresas.map((e) => e.id)
  const del = (t: string, col: string, vals: string[]) => service.from(t).delete().in(col, vals)
  await del("catalog_order_items", "order_id", empresas.map((e) => e.pedido))
  await del("catalog_orders", "workspace_id", ids)
  await del("catalog_products", "workspace_id", ids)
  await del("catalog_categories", "workspace_id", ids)
  await del("campaign_recipients", "workspace_id", ids)
  await del("campaigns", "workspace_id", ids)
  await del("reminders", "workspace_id", ids)
  await del("sequence_runs", "workspace_id", ids)
  await del("sequences", "workspace_id", ids)
  await del("pipeline_card_labels", "card_id", empresas.map((e) => e.card))
  await del("pipeline_card_notes", "workspace_id", ids)
  await del("pipeline_cards", "workspace_id", ids)
  await del("conversation_labels", "conversation_id", empresas.map((e) => e.conversa))
  await del("messages", "workspace_id", ids)
  await del("conversations", "workspace_id", ids)
  await del("contact_tags", "workspace_id", ids)
  await del("labels", "workspace_id", ids)
  await del("contacts", "workspace_id", ids)
  await del("user_teams", "user_id", usuarios)
  await del("teams", "workspace_id", ids)
  await del("profiles", "workspace_id", ids)
  for (const u of usuarios) await service.auth.admin.deleteUser(u)
  await del("workspaces", "id", ids)
}, 90_000)

// Cada caso monta a gravação com a empresa "dona" (A) e o alvo vindo de "alvo":
// da própria A (tem de passar) ou da B (tem de ser recusado).
const casos: Array<{ nome: string; tabela: string; linha: (a: Empresa, alvo: Empresa) => Record<string, unknown> }> = [
  { nome: "usuário de outra empresa num time", tabela: "user_teams", linha: (a, alvo) => ({ team_id: a.time, user_id: alvo.usuario }) },
  { nome: "etiqueta de outra empresa numa conversa", tabela: "conversation_labels", linha: (a, alvo) => ({ conversation_id: a.conversa, label_id: alvo.etiqueta }) },
  { nome: "etiqueta de outra empresa num card", tabela: "pipeline_card_labels", linha: (a, alvo) => ({ card_id: a.card, label_id: alvo.etiqueta }) },
  { nome: "mensagem numa conversa de outra empresa", tabela: "messages", linha: (a, alvo) => ({ workspace_id: a.id, conversation_id: alvo.conversa, direction: "recebida", type: "texto", content: "x" }) },
  { nome: "conversa com contato de outra empresa", tabela: "conversations", linha: (a, alvo) => ({ workspace_id: a.id, contact_id: alvo.contato }) },
  { nome: "conversa com responsável de outra empresa", tabela: "conversations", linha: (a, alvo) => ({ workspace_id: a.id, contact_id: a.contato, assigned_to: alvo.usuario }) },
  { nome: "card com contato de outra empresa", tabela: "pipeline_cards", linha: (a, alvo) => ({ workspace_id: a.id, contact_id: alvo.contato, etapa: "lead", funil: "recompra" }) },
  { nome: "nota em card de outra empresa", tabela: "pipeline_card_notes", linha: (a, alvo) => ({ workspace_id: a.id, card_id: alvo.card, texto: "x", autor_id: a.usuario }) },
  { nome: "tag em contato de outra empresa", tabela: "contact_tags", linha: (a, alvo) => ({ workspace_id: a.id, contact_id: alvo.contato, tag: `t${ts}` }) },
  { nome: "sequência de outra empresa para o contato", tabela: "sequence_runs", linha: (a, alvo) => ({ workspace_id: a.id, sequence_id: alvo.sequencia, contact_id: a.contato }) },
  { nome: "lembrete para contato de outra empresa", tabela: "reminders", linha: (a, alvo) => ({ workspace_id: a.id, contact_id: alvo.contato, atendente_id: a.usuario, origem: "avulso", instrucao: "x", due_at: new Date().toISOString() }) },
  { nome: "destinatário de outra empresa numa campanha", tabela: "campaign_recipients", linha: (a, alvo) => ({ workspace_id: a.id, campaign_id: a.campanha, contact_id: alvo.contato, telefone_snapshot: "x" }) },
  { nome: "produto de outra empresa num pedido", tabela: "catalog_order_items", linha: (a, alvo) => ({ order_id: a.pedido, product_id: alvo.produto, product_name: "x", quantity: 1, unit_price: 1 }) },
  { nome: "categoria de outra empresa num produto", tabela: "catalog_products", linha: (a, alvo) => ({ workspace_id: a.id, name: "x", price: 1, category_id: alvo.categoria }) },
]

describe("B21-04 — Nenhum registro aponta para outra empresa", { timeout: 30_000 }, () => {
  for (const caso of casos) {
    it(`should not gravar ${caso.nome}`, async () => {
      const [a, b] = empresas
      const { error } = await service.from(caso.tabela).insert(caso.linha(a, b))
      expect(error?.message).toMatch(/outra empresa/)
    })

    it(`should gravar normalmente dentro da empresa (${caso.nome.replace(/ de outra empresa/, "")})`, async () => {
      const [a] = empresas
      const { error } = await service.from(caso.tabela).insert(caso.linha(a, a))
      expect(error).toBeNull()
    })
  }

  it("should not trocar o responsável de uma conversa por alguém de outra empresa", async () => {
    const [a, b] = empresas
    const { error } = await service.from("conversations").update({ assigned_to: b.usuario }).eq("id", a.conversa)
    expect(error?.message).toMatch(/outra empresa/)
  })
})
