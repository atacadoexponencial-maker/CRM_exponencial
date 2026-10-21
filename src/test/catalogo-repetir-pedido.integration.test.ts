// @vitest-environment node
// B31-05 — repetir o último pedido: o servidor confere as peças guardadas no aparelho com o
// catálogo de hoje. Bate no Supabase real; nada mockado.

import { createClient } from "@supabase/supabase-js"
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { prepararRepeticao, textoDoQueFicouFora } from "@/lib/catalogo/repetir-pedido"

const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const ts = Date.now()
const slug = `repetir-${ts}`
let ws = "", camiseta = "", regata = "", bermuda = "", jaqueta = ""

beforeAll(async () => {
  ws = (await service.from("workspaces").insert({ name: `Repetir ${ts}` }).select().single()).data!.id
  await service.from("catalog_settings").insert({ workspace_id: ws, slug, orders_whatsapp: "5511900000000", published: true })
  camiseta = (await service.from("catalog_products").insert({ workspace_id: ws, name: "Camiseta", price: 29.9, variant_types: [{ id: "t", nome: "Tamanho", opcoes: ["P", "M"] }], price_tiers: [{ min: 12, price: 24.9 }] }).select("id").single()).data!.id
  regata = (await service.from("catalog_products").insert({ workspace_id: ws, name: "Regata canelada", price: 19.9 }).select("id").single()).data!.id
  bermuda = (await service.from("catalog_products").insert({ workspace_id: ws, name: "Bermuda", price: 59.9, min_quantity: 3 }).select("id").single()).data!.id
  jaqueta = (await service.from("catalog_products").insert({ workspace_id: ws, name: "Jaqueta", price: 100, variant_types: [{ id: "t", nome: "Tamanho", opcoes: ["P", "M"] }], pack_quantities: { P: 1, M: 1 } }).select("id").single()).data!.id
  await service.from("catalog_stock").insert([
    { workspace_id: ws, product_id: camiseta, combination: "P", quantity: 3 },
    { workspace_id: ws, product_id: camiseta, combination: "M", quantity: 0 },
    { workspace_id: ws, product_id: regata, combination: "", quantity: 10 },
    { workspace_id: ws, product_id: bermuda, combination: "", quantity: 10 },
    { workspace_id: ws, product_id: jaqueta, combination: "P", quantity: 1 },
    { workspace_id: ws, product_id: jaqueta, combination: "M", quantity: 5 },
  ])
}, 60_000)

afterAll(async () => {
  await service.from("catalog_settings").delete().eq("workspace_id", ws)
  await service.from("catalog_products").delete().eq("workspace_id", ws)
  await service.from("workspaces").delete().eq("id", ws)
})

describe("B31-05 — Repetir o último pedido", { timeout: 30_000 }, () => {
  it("CA-B31-08: dos 3 produtos do pedido anterior, voltam os 2 que existem (limitados ao estoque de hoje) e o oculto fica de fora com o motivo", async () => {
    // A regata saiu da loja depois do pedido.
    await service.from("catalog_products").update({ visible: false }).eq("id", regata)
    const r = await prepararRepeticao(slug, [
      { produtoId: camiseta, combinacao: "P", quantidade: 5 },
      { produtoId: camiseta, combinacao: "M", quantidade: 2 },
      { produtoId: regata, combinacao: "", quantidade: 4 },
      { produtoId: bermuda, combinacao: "", quantidade: 3 },
    ])
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.itens.map((i) => ({ nome: i.nome, combinacao: i.combinacao, quantidade: i.quantidade, maximo: i.maximo }))).toEqual([
      { nome: "Camiseta", combinacao: "P", quantidade: 3, maximo: 3 }, // pediu 5, hoje só há 3
      { nome: "Bermuda", combinacao: "", quantidade: 3, maximo: 10 },
    ])
    // As regras de hoje vêm junto, para o carrinho calcular como sempre.
    expect(r.itens[0].faixas).toEqual([{ min: 12, preco: 24.9 }])
    expect(r.itens[1].minimo).toBe(3)
    expect(r.fora).toEqual([
      { produtoId: camiseta, combinacao: "M", nome: "Camiseta", motivo: "esgotou" },
      { produtoId: regata, combinacao: "", nome: "Um produto", motivo: "saiu da loja" },
    ])
    expect(textoDoQueFicouFora(r.fora)).toBe("Camiseta (M) ficou de fora: esgotou · Um produto ficou de fora: saiu da loja")
  })

  it("grade fechada volta em pacotes inteiros que cabem no estoque de hoje; opção que não existe mais fica de fora", async () => {
    const r = await prepararRepeticao(slug, [
      { produtoId: jaqueta, combinacao: "P", quantidade: 3 },
      { produtoId: jaqueta, combinacao: "M", quantidade: 3 },
      { produtoId: camiseta, combinacao: "G", quantidade: 1 },
    ])
    expect(r.ok).toBe(true)
    if (!r.ok) return
    // Pediu 3 grades; hoje P tem 1: volta 1 grade (P 1, M 1).
    expect(r.itens.map((i) => [i.combinacao, i.quantidade])).toEqual([["P", 1], ["M", 1]])
    expect(r.itens[0].grade).toEqual({ quantidades: { P: 1, M: 1 }, preco: null })
    expect(r.fora).toEqual([{ produtoId: camiseta, combinacao: "G", nome: "Camiseta", motivo: "essa opção não existe mais" }])
  })

  it("loja despublicada ou lista vazia não devolvem nada", async () => {
    expect(await prepararRepeticao(slug, [])).toMatchObject({ ok: false })
    await service.from("catalog_settings").update({ published: false }).eq("workspace_id", ws)
    expect(await prepararRepeticao(slug, [{ produtoId: bermuda, combinacao: "", quantidade: 1 }])).toMatchObject({ ok: false, erro: expect.stringMatching(/não está recebendo/) })
  })
})
