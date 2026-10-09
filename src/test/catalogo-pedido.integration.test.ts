// @vitest-environment node
// B16-09 — pedido pela vitrine. Bate no Supabase real; nada mockado (a cliente não tem
// login: o servidor usa a chave de serviço).

import { createClient } from "@supabase/supabase-js"
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { formasDoNumero, registrarPedido } from "@/lib/catalogo/pedidos"

const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const ts = Date.now()
const slug = `pedido-${ts}`
let ws = "", conexao = "", vestido = "", camisa = "", oculto = ""

beforeAll(async () => {
  ws = (await service.from("workspaces").insert({ name: `Pedidos ${ts}` }).select().single()).data!.id
  conexao = (await service.from("whatsapp_connections").insert({ workspace_id: ws, canal: "gateway", status: "connected", phone_number: "5511900000000", instance_id: `inst_ped_${ts}`, instance_token: "t" }).select("id").single()).data!.id
  await service.from("catalog_settings").insert({ workspace_id: ws, slug, orders_whatsapp: "5511900000000", published: true, min_type: "pecas", min_value: 3, closing_message: "Pix" })
  vestido = (await service.from("catalog_products").insert({ workspace_id: ws, name: "Vestido", price: 50, variant_types: [{ id: "t", nome: "Tamanho", opcoes: ["P", "M"] }] }).select("id").single()).data!.id
  camisa = (await service.from("catalog_products").insert({ workspace_id: ws, name: "Camisa", price: 20 }).select("id").single()).data!.id
  oculto = (await service.from("catalog_products").insert({ workspace_id: ws, name: "Oculto", price: 10, visible: false }).select("id").single()).data!.id
  await service.from("catalog_stock").insert([
    { workspace_id: ws, product_id: vestido, combination: "P", quantity: 2 },
    { workspace_id: ws, product_id: vestido, combination: "M", quantity: 10 },
    { workspace_id: ws, product_id: camisa, combination: "", quantity: 50 },
    { workspace_id: ws, product_id: oculto, combination: "", quantity: 50 },
  ])
}, 60_000)

afterAll(async () => {
  await service.from("catalog_orders").delete().eq("workspace_id", ws)
  await service.from("catalog_settings").delete().eq("workspace_id", ws)
  await service.from("catalog_products").delete().eq("workspace_id", ws)
  await service.from("whatsapp_connections").delete().eq("id", conexao)
  await service.from("contacts").delete().eq("workspace_id", ws)
  await service.from("workspaces").delete().eq("id", ws)
})

describe("B16-09 — Carrinho e pedido pelo WhatsApp", { timeout: 30_000 }, () => {
  it("as duas formas do celular: com e sem o nono dígito", () => {
    expect(formasDoNumero("5521988887777")).toEqual(["5521988887777", "552188887777"])
    expect(formasDoNumero("552188887777")).toEqual(["5521988887777", "552188887777"])
  })

  it("registra o pedido com preço do banco, cria o contato e devolve a mensagem", async () => {
    const r = await registrarPedido(slug, { nome: "Ana Souza", whatsapp: "(21) 98888-7777" }, [
      { produtoId: vestido, combinacao: "M", quantidade: 2 },
      { produtoId: camisa, combinacao: "", quantidade: 1 },
    ])
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.numero).toBe(1001)
    expect(r.mensagem).toContain("*Pedido #1001*")
    expect(r.mensagem).toContain("2x Vestido (M)")
    expect(r.mensagem).toContain("Pix")
    expect(r.link.startsWith("https://wa.me/5511900000000?text=")).toBe(true)

    const { data: pedido } = await service.from("catalog_orders").select("number, status, pieces, total, contact_id, customer_whatsapp, catalog_order_items(product_name, combination, quantity, unit_price), catalog_order_events(to_status)").eq("workspace_id", ws).single()
    expect(pedido).toMatchObject({ number: 1001, status: "novo", pieces: 3, total: 120, customer_whatsapp: "5521988887777" })
    expect(pedido!.catalog_order_events).toEqual([{ to_status: "novo" }])
    const { data: contato } = await service.from("contacts").select("name, phone_number").eq("id", pedido!.contact_id).single()
    expect(contato).toMatchObject({ name: "Ana Souza", phone_number: "5521988887777" })
    // Sem automação embutida: nenhum card no funil.
    const { data: cards } = await service.from("pipeline_cards").select("id").eq("contact_id", pedido!.contact_id)
    expect(cards).toEqual([])
  })

  it("bloqueia outro pedido do mesmo WhatsApp por 2 minutos (com ou sem o nono dígito)", async () => {
    const r = await registrarPedido(slug, { nome: "Ana", whatsapp: "552188887777" }, [{ produtoId: camisa, combinacao: "", quantidade: 3 }])
    expect(r).toMatchObject({ ok: false, erro: expect.stringMatching(/2 minutos/) })
  })

  // B21-07: o pedido só é ligado ao contato — não tira da lixeira nem escreve o nome.
  it("acha o contato que chegou sem o nono dígito, sem tirar da lixeira nem mudar o nome", async () => {
    const { data: antigo } = await service.from("contacts").insert({ workspace_id: ws, phone_number: "551177776666", name: null, excluido_em: new Date().toISOString() }).select("id").single()
    const r = await registrarPedido(slug, { nome: "Bia", whatsapp: "11 97777-6666" }, [{ produtoId: camisa, combinacao: "", quantidade: 3 }])
    expect(r.ok).toBe(true)
    const { data: pedido } = await service.from("catalog_orders").select("contact_id").eq("workspace_id", ws).eq("customer_name", "Bia").single()
    expect(pedido!.contact_id).toBe(antigo!.id)
    const { data: contato } = await service.from("contacts").select("name, excluido_em").eq("id", antigo!.id).single()
    expect(contato!.name).toBeNull()
    expect(contato!.excluido_em).not.toBeNull()
  })

  it("recusa estoque insuficiente dizendo qual item", async () => {
    const r = await registrarPedido(slug, { nome: "Cris", whatsapp: "31966665555" }, [{ produtoId: vestido, combinacao: "P", quantidade: 3 }])
    expect(r).toMatchObject({ ok: false, semEstoque: [{ produtoId: vestido, combinacao: "P", disponivel: 2 }] })
  })

  it("recusa produto oculto, opção que não existe e pedido abaixo do mínimo", async () => {
    expect(await registrarPedido(slug, { nome: "Dani", whatsapp: "41955554444" }, [{ produtoId: oculto, combinacao: "", quantidade: 5 }])).toMatchObject({ ok: false, erro: expect.stringMatching(/saiu da loja/) })
    expect(await registrarPedido(slug, { nome: "Dani", whatsapp: "41955554444" }, [{ produtoId: vestido, combinacao: "G", quantidade: 5 }])).toMatchObject({ ok: false, erro: expect.stringMatching(/não existe mais/) })
    expect(await registrarPedido(slug, { nome: "Dani", whatsapp: "41955554444" }, [{ produtoId: camisa, combinacao: "", quantidade: 2 }])).toMatchObject({ ok: false, erro: expect.stringMatching(/Falta 1 peça|Faltam/) })
  })

  it("recusa WhatsApp inválido e loja despublicada", async () => {
    expect(await registrarPedido(slug, { nome: "Eva", whatsapp: "9999" }, [{ produtoId: camisa, combinacao: "", quantidade: 3 }])).toMatchObject({ ok: false, erro: expect.stringMatching(/DDD/) })
    await service.from("catalog_settings").update({ published: false }).eq("workspace_id", ws)
    expect(await registrarPedido(slug, { nome: "Eva", whatsapp: "51944443333" }, [{ produtoId: camisa, combinacao: "", quantidade: 3 }])).toMatchObject({ ok: false, erro: expect.stringMatching(/não está recebendo/) })
    await service.from("catalog_settings").update({ published: true }).eq("workspace_id", ws)
  })

  it("enviar o pedido não baixa o estoque", async () => {
    const { data } = await service.from("catalog_stock").select("quantity").eq("product_id", vestido).eq("combination", "M").single()
    expect(data!.quantity).toBe(10)
  })

  it("o navegador não registra pedido direto pela função do banco", async () => {
    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } })
    const { error } = await anon.rpc("registrar_pedido_catalogo", { p_workspace: ws, p_contato: null, p_nome: "x", p_whatsapp: "5511999999999", p_itens: [] })
    expect(error).not.toBeNull()
  })
})
