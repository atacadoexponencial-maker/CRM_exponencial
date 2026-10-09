// @vitest-environment node
// B21-07 — pedido da loja não mexe no contato e tem limite por endereço de internet
// (auditoria de 06/10/2026, rodada 3). Bate no Supabase real pela ação pública da vitrine.

import { createClient } from "@supabase/supabase-js"
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest"

const IP_DO_TESTE = `teste-pedido-${Date.now()}-${Math.random()}`
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": IP_DO_TESTE }) }))

import { fazerPedido } from "@/app/loja/[endereco]/actions"
import { chaveDoPedidoNaLoja } from "@/lib/limite-de-tentativas"

const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const ts = Date.now()
const slug = `pedido-b21-${ts}`
const chave = chaveDoPedidoNaLoja(IP_DO_TESTE, slug)
let ws = "", camisa = "", contatoAntigo = ""

beforeAll(async () => {
  ws = (await service.from("workspaces").insert({ name: `Pedido B21 ${ts}` }).select("id").single()).data!.id
  await service.from("catalog_settings").insert({ workspace_id: ws, slug, orders_whatsapp: "5511900000000", published: true })
  camisa = (await service.from("catalog_products").insert({ workspace_id: ws, name: "Camisa", price: 20 }).select("id").single()).data!.id
  await service.from("catalog_stock").insert({ workspace_id: ws, product_id: camisa, combination: "", quantity: 100 })
  contatoAntigo = (await service.from("contacts")
    .insert({ workspace_id: ws, phone_number: "5521977771111", name: "Nome Original", excluido_em: new Date().toISOString() })
    .select("id").single()).data!.id
}, 60_000)

afterAll(async () => {
  await service.from("tentativas_de_acesso").delete().eq("chave", chave)
  await service.from("catalog_orders").delete().eq("workspace_id", ws)
  await service.from("catalog_stock").delete().eq("workspace_id", ws)
  await service.from("catalog_products").delete().eq("workspace_id", ws)
  await service.from("catalog_settings").delete().eq("workspace_id", ws)
  await service.from("contacts").delete().eq("workspace_id", ws)
  await service.from("workspaces").delete().eq("id", ws)
}, 60_000)

const pedir = (nome: string, whatsapp: string) =>
  fazerPedido(slug, { nome, whatsapp }, [{ produtoId: camisa, combinacao: "", quantidade: 1 }])

describe("B21-07 — Pedido da loja não mexe no contato e tem limite", { timeout: 30_000 }, () => {
  it("should ligar o pedido ao contato existente sem trocar o nome nem tirar da lixeira", async () => {
    const r = await pedir("Golpista", "(21) 97777-1111")
    expect(r.ok).toBe(true)

    const { data: pedido } = await service.from("catalog_orders").select("contact_id, customer_name").eq("workspace_id", ws).single()
    expect(pedido).toEqual({ contact_id: contatoAntigo, customer_name: "Golpista" })
    const { data: contato } = await service.from("contacts").select("name, excluido_em").eq("id", contatoAntigo).single()
    expect(contato!.name).toBe("Nome Original")
    expect(contato!.excluido_em).not.toBeNull()
  })

  it("should contar o pedido que entrou no limite do endereço de internet", async () => {
    const { count } = await service.from("tentativas_de_acesso").select("id", { count: "exact", head: true }).eq("chave", chave).eq("tipo", "pedido_loja")
    expect(count).toBe(1)
  })

  it("should recusar o pedido depois de 10 na hora, sem criar pedido nem contato", async () => {
    // Já há 1 pedido contado; completa 10.
    await service.from("tentativas_de_acesso").insert(Array.from({ length: 9 }, () => ({ tipo: "pedido_loja", chave })))

    const r = await pedir("Robô", "(31) 96666-2222")
    expect(r).toEqual({ ok: false, erro: "Muitos pedidos em pouco tempo. Aguarde alguns minutos e tente de novo." })

    const { data: pedidos } = await service.from("catalog_orders").select("id").eq("workspace_id", ws)
    expect(pedidos).toHaveLength(1)
    const { data: contatos } = await service.from("contacts").select("id").eq("workspace_id", ws).eq("phone_number", "5531966662222")
    expect(contatos).toHaveLength(0)
  })
})
