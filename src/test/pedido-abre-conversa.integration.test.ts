// @vitest-environment node
// B48-17 — o pedido de um contato que tem conversa traz o link dela, para o "Abrir
// conversa" ao lado de "Perfil do contato". Bate no banco de teste; só o cliente
// autenticado do servidor é mockado.

import { createClient } from "@supabase/supabase-js"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

vi.mock("@/integrations/supabase/server", () => ({ createClient: vi.fn() }))

import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { carregarPedido } from "@/app/(auth)/catalogo/pedidos/actions"
import { registrarPedido } from "@/lib/catalogo/pedidos"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
const SENHA = "senha-test-123!"
const ts = Date.now()
const slug = `b48-17-${ts}`
const email = `b48-17-admin-${ts}@teste.com`
let ws = "", userId = "", conexaoId = ""

/** Registra um pedido pela loja e devolve o id dele e o do contato que nasceu. */
async function pedidoDe(whatsapp: string) {
  const produto = (await service.from("catalog_products").insert({ workspace_id: ws, name: `Camisa ${whatsapp}`, price: 25 }).select("id").single()).data!.id
  await service.from("catalog_stock").insert({ workspace_id: ws, product_id: produto, combination: "", quantity: 5 })
  const r = await registrarPedido(slug, { nome: `Cliente ${whatsapp}`, whatsapp }, [{ produtoId: produto, combinacao: "", quantidade: 1 }])
  if (!r.ok) throw new Error(r.erro)
  const { data } = await service.from("catalog_orders").select("id, contact_id").eq("workspace_id", ws).order("created_at", { ascending: false }).limit(1).single()
  return { pedidoId: data!.id as string, contatoId: data!.contact_id as string }
}

beforeAll(async () => {
  ws = (await service.from("workspaces").insert({ name: `B48-17 ${ts}` }).select().single()).data!.id
  const { data } = await service.auth.admin.createUser({ email, password: SENHA, email_confirm: true })
  userId = data.user!.id
  await service.from("profiles").insert({ id: userId, workspace_id: ws, name: "Admin", role: "admin", status: "active" })
  conexaoId = (await service.from("whatsapp_connections").insert({ workspace_id: ws, canal: "gateway", status: "connected", phone_number: "5511900000017", instance_id: `inst_b4817_${ts}`, instance_token: "t" }).select("id").single()).data!.id
  await service.from("catalog_settings").insert({ workspace_id: ws, slug, orders_whatsapp: "5511900000017", published: true })
  const c = createClient(URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } })
  const { error } = await c.auth.signInWithPassword({ email, password: SENHA })
  if (error) throw new Error(error.message)
  vi.mocked(createSsrClient).mockResolvedValue(c as never)
}, 60_000)

afterAll(async () => {
  await service.from("conversations").delete().eq("workspace_id", ws)
  await service.from("catalog_orders").delete().eq("workspace_id", ws)
  await service.from("catalog_settings").delete().eq("workspace_id", ws)
  await service.from("catalog_products").delete().eq("workspace_id", ws)
  await service.from("whatsapp_connections").delete().eq("id", conexaoId)
  await service.from("pipeline_cards").delete().eq("workspace_id", ws)
  await service.from("contacts").delete().eq("workspace_id", ws)
  await service.from("profiles").delete().eq("id", userId)
  await service.auth.admin.deleteUser(userId)
  await service.from("workspaces").delete().eq("id", ws)
})

describe("B48-17 — Do pedido para a conversa", { timeout: 30_000 }, () => {
  it("CA-B48-44: should trazer o link da conversa do contato do pedido, e nenhum link sem conversa", async () => {
    const comConversa = await pedidoDe("21988881701")
    const conversa = (await service.from("conversations").insert({ workspace_id: ws, contact_id: comConversa.contatoId }).select("id").single()).data!.id
    const detalhe = await carregarPedido(comConversa.pedidoId)
    expect(detalhe?.hrefContato).toBe(`/contatos/${comConversa.contatoId}`)
    expect(detalhe?.hrefConversa).toBe(`/chat?conversa=${conversa}`)

    const semConversa = await pedidoDe("21988881702")
    expect((await carregarPedido(semConversa.pedidoId))?.hrefConversa).toBeNull()
  })
})
