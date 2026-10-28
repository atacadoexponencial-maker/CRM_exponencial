// @vitest-environment node
// B16-09 — pedido pela vitrine. Bate no Supabase real; nada mockado (a cliente não tem
// login: o servidor usa a chave de serviço).

import { createClient } from "@supabase/supabase-js"
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"

// B29-02: a busca da foto de perfil é falsa aqui (o gateway não entra no teste);
// o que se confere é que o pedido a chama para o contato criado.
vi.mock("@/lib/whatsapp/foto-de-perfil", () => ({ buscarEGuardarFotoDoContato: vi.fn().mockResolvedValue("sem_canal") }))

import { buscarEGuardarFotoDoContato } from "@/lib/whatsapp/foto-de-perfil"
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
    // B45-01: todo contato nasce com card na primeira etapa da Entrada.
    const { data: cards } = await service.from("pipeline_cards").select("funil, etapa").eq("contact_id", pedido!.contact_id)
    expect(cards).toEqual([{ funil: "entrada", etapa: "lead" }])
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

describe("QA A9 — preço que mudou depois de entrar no carrinho", { timeout: 30_000 }, () => {
  it("o pedido não sai com preço diferente do que a cliente viu: avisa, devolve o novo e sai na segunda tentativa", async () => {
    await service.from("catalog_products").update({ price: 60 }).eq("id", vestido)
    const cliente = { nome: "Preço Novo", whatsapp: "(21) 97777-1234" }
    const r = await registrarPedido(slug, cliente, [{ produtoId: vestido, combinacao: "M", quantidade: 3, preco: 50 }])
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.erro).toContain("O preço mudou: Vestido")
    expect(r.precosNovos).toEqual([{ produtoId: vestido, preco: 60, faixas: [] }])

    const r2 = await registrarPedido(slug, cliente, [{ produtoId: vestido, combinacao: "M", quantidade: 3, preco: 60 }])
    expect(r2.ok).toBe(true)
    if (!r2.ok) return
    const { data: pedido } = await service.from("catalog_orders").select("total").eq("workspace_id", ws).eq("number", r2.numero).single()
    expect(pedido?.total).toBe(180)
  })
})

describe("B29-02 — pedido da loja e a foto de perfil", { timeout: 30_000 }, () => {
  it("CA-B29-07: o pedido pela loja pede a foto do contato criado, depois de o pedido estar gravado", async () => {
    vi.mocked(buscarEGuardarFotoDoContato).mockClear()
    const r = await registrarPedido(slug, { nome: "Foto Teste", whatsapp: "61 93333-2222" }, [{ produtoId: camisa, combinacao: "", quantidade: 3 }])
    expect(r.ok).toBe(true)

    const { data: contato } = await service.from("contacts").select("id").eq("workspace_id", ws).eq("phone_number", "5561933332222").single()
    expect(buscarEGuardarFotoDoContato).toHaveBeenCalledTimes(1)
    expect(buscarEGuardarFotoDoContato).toHaveBeenCalledWith(expect.objectContaining({ workspaceId: ws, contactId: contato!.id, telefone: "5561933332222" }))
  })
})


describe("B31-01 — faixas de preço e mínimo por produto no pedido", { timeout: 30_000 }, () => {
  // O formato de moeda usa espaço fixo entre "R$" e o número.
  const semNbsp = (t: string) => t.replace(/ /g, " ")
  let camiseta = ""
  const cliente = (n: number) => ({ nome: `Faixa ${n}`, whatsapp: `(21) 9${String(6000000 + n).padStart(8, "0")}` })

  it("CA-B31-10: pedido com 12 peças grava o unitário da faixa e a mensagem traz o preço; com 11 fica o base", async () => {
    camiseta = (await service.from("catalog_products").insert({ workspace_id: ws, name: "Camiseta", price: 29.9, price_tiers: [{ min: 12, price: 24.9 }], variant_types: [{ id: "c", nome: "Cor", opcoes: ["Azul", "Preto"] }] }).select("id").single()).data!.id
    await service.from("catalog_stock").insert([
      { workspace_id: ws, product_id: camiseta, combination: "Azul", quantity: 100 },
      { workspace_id: ws, product_id: camiseta, combination: "Preto", quantity: 100 },
    ])
    const r = await registrarPedido(slug, cliente(1), [
      { produtoId: camiseta, combinacao: "Azul", quantidade: 8 },
      { produtoId: camiseta, combinacao: "Preto", quantidade: 4 },
    ])
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(semNbsp(r.mensagem)).toContain("8x Camiseta (Azul) — R$ 24,90 cada (preço de 12+)")
    expect(semNbsp(r.mensagem)).toContain("*R$ 298,80*")
    const { data: pedido } = await service.from("catalog_orders").select("total, catalog_order_items(unit_price)").eq("workspace_id", ws).eq("number", r.numero).single()
    expect(pedido?.total).toBe(298.8)
    expect(pedido?.catalog_order_items.map((i) => i.unit_price)).toEqual([24.9, 24.9])

    const r2 = await registrarPedido(slug, cliente(2), [{ produtoId: camiseta, combinacao: "Azul", quantidade: 11 }])
    expect(r2.ok).toBe(true)
    if (!r2.ok) return
    expect(semNbsp(r2.mensagem)).toContain("11x Camiseta (Azul) — R$ 29,90 cada =")
  })

  it("CA-B31-11: a faixa foi tirada depois de a peça entrar no carrinho: o pedido não sai e devolve o preço de hoje", async () => {
    await service.from("catalog_products").update({ price_tiers: [] }).eq("id", camiseta)
    const r = await registrarPedido(slug, cliente(3), [{ produtoId: camiseta, combinacao: "Azul", quantidade: 12, preco: 24.9 }])
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.erro).toContain("O preço mudou: Camiseta")
    expect(r.precosNovos).toEqual([{ produtoId: camiseta, preco: 29.9, faixas: [] }])
    await service.from("catalog_products").update({ price_tiers: [{ min: 12, price: 24.9 }] }).eq("id", camiseta)
  })

  it("CA-B31-12: produto com mínimo 6 recusa 4 peças mesmo com o mínimo da loja batido", async () => {
    await service.from("catalog_products").update({ min_quantity: 6 }).eq("id", camiseta)
    const r = await registrarPedido(slug, cliente(4), [
      { produtoId: camiseta, combinacao: "Azul", quantidade: 2 },
      { produtoId: camiseta, combinacao: "Preto", quantidade: 2 },
      { produtoId: camisa, combinacao: "", quantidade: 5 },
    ])
    expect(r).toMatchObject({ ok: false, erro: expect.stringMatching(/^Camiseta: mínimo 6 peças/) })
    const r2 = await registrarPedido(slug, cliente(4), [
      { produtoId: camiseta, combinacao: "Azul", quantidade: 3 },
      { produtoId: camiseta, combinacao: "Preto", quantidade: 3 },
    ])
    expect(r2.ok).toBe(true)
  })

  it("CA-B31-14: produto sem regra segue como na B16: preço base e qualquer quantidade", async () => {
    const r = await registrarPedido(slug, cliente(5), [{ produtoId: camisa, combinacao: "", quantidade: 40 }])
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(semNbsp(r.mensagem)).toContain("40x Camisa — R$ 20,00 cada = R$ 800,00")
  })
})

describe("B31-02 — desconto por total do pedido no servidor", { timeout: 30_000 }, () => {
  const semNbsp = (t: string) => t.replace(/\u00a0/g, " ")

  it("CA-B31-17: pedido com 50 peças grava desconto de 10% e total com desconto; a mensagem traz subtotal, desconto e total; com 49 não há desconto", async () => {
    await service.from("catalog_settings").update({ order_discounts: [{ min: 50, percent: 10 }] }).eq("workspace_id", ws)
    const { data: cam } = await service.from("catalog_products").select("id").eq("workspace_id", ws).eq("name", "Camiseta").single()
    await service.from("catalog_products").update({ min_quantity: null }).eq("id", cam!.id)
    const r = await registrarPedido(slug, { nome: "Desconto 50", whatsapp: "(21) 95000-0050" }, [
      { produtoId: cam!.id, combinacao: "Azul", quantidade: 30 },
      { produtoId: cam!.id, combinacao: "Preto", quantidade: 20 },
    ])
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const m = semNbsp(r.mensagem)
    expect(m).toContain("Subtotal: 50 peças · R$ 1.245,00")
    expect(m).toContain("Desconto de 10% do pedido: − R$ 124,50")
    expect(m).toContain("Total: *R$ 1.120,50*")
    const { data: pedido } = await service.from("catalog_orders").select("total, discount, discount_percent, pieces").eq("workspace_id", ws).eq("number", r.numero).single()
    expect(pedido).toMatchObject({ total: 1120.5, discount: 124.5, discount_percent: 10, pieces: 50 })

    const r2 = await registrarPedido(slug, { nome: "Desconto 49", whatsapp: "(21) 95000-0049" }, [{ produtoId: cam!.id, combinacao: "Azul", quantidade: 49 }])
    expect(r2.ok).toBe(true)
    if (!r2.ok) return
    expect(semNbsp(r2.mensagem)).toContain("Total: 49 peças · *R$ 1.220,10*")
    const { data: pedido2 } = await service.from("catalog_orders").select("total, discount").eq("workspace_id", ws).eq("number", r2.numero).single()
    expect(pedido2).toMatchObject({ total: 1220.1, discount: 0 })
    await service.from("catalog_settings").update({ order_discounts: [] }).eq("workspace_id", ws)
  })
})

describe("B31-03 — grade fechada no servidor", { timeout: 30_000 }, () => {
  const semNbsp = (t: string) => t.replace(/ /g, " ")
  let grade = ""

  it("CA-B31-13: P 2, M 4, G 3, GG 2 em Azul é recusado como grade quebrada; P 2, M 4, G 4, GG 2 sai com '2 grades (12 peças)' em Azul", async () => {
    grade = (await service.from("catalog_products").insert({
      workspace_id: ws, name: "Jaqueta", price: 29.9,
      variant_types: [{ id: "t", nome: "Tamanho", opcoes: ["P", "M", "G", "GG"] }, { id: "c", nome: "Cor", opcoes: ["Azul", "Preto"] }],
      pack_quantities: { P: 1, M: 2, G: 2, GG: 1 },
    }).select("id").single()).data!.id
    await service.from("catalog_stock").insert(["P", "M", "G", "GG"].flatMap((t) => ["Azul", "Preto"].map((c) => ({ workspace_id: ws, product_id: grade, combination: `${t} / ${c}`, quantity: 100 }))))
    const quebrada = await registrarPedido(slug, { nome: "Grade 1", whatsapp: "(21) 94000-0001" }, [
      { produtoId: grade, combinacao: "P / Azul", quantidade: 2 },
      { produtoId: grade, combinacao: "M / Azul", quantidade: 4 },
      { produtoId: grade, combinacao: "G / Azul", quantidade: 3 },
      { produtoId: grade, combinacao: "GG / Azul", quantidade: 2 },
    ])
    expect(quebrada).toMatchObject({ ok: false, erro: expect.stringMatching(/^Jaqueta: a grade de Azul está quebrada\. Cada grade tem P 1 · M 2 · G 2 · GG 1/) })

    const r = await registrarPedido(slug, { nome: "Grade 1", whatsapp: "(21) 94000-0001" }, [
      { produtoId: grade, combinacao: "P / Azul", quantidade: 2 },
      { produtoId: grade, combinacao: "M / Azul", quantidade: 4 },
      { produtoId: grade, combinacao: "G / Azul", quantidade: 4 },
      { produtoId: grade, combinacao: "GG / Azul", quantidade: 2 },
    ])
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const m = semNbsp(r.mensagem)
    expect(m).toContain("• Jaqueta (Azul): 2 grades (12 peças) — R$ 29,90 cada = R$ 358,80")
    expect(m).toContain("   P 2 · M 4 · G 4 · GG 2")
    expect(m).not.toContain("2x Jaqueta")
    expect(m).toContain("Total: 12 peças · *R$ 358,80*")
  })

  it("CA-B31-15: 1 grade com preço próprio 150 grava unitário 25,00 e total 150,00; a mensagem traz R$ 25,00 cada", async () => {
    await service.from("catalog_products").update({ pack_price: 150, price_tiers: [{ min: 6, price: 20 }] }).eq("id", grade)
    const r = await registrarPedido(slug, { nome: "Grade 2", whatsapp: "(21) 94000-0002" }, [
      { produtoId: grade, combinacao: "P / Preto", quantidade: 1 },
      { produtoId: grade, combinacao: "M / Preto", quantidade: 2 },
      { produtoId: grade, combinacao: "G / Preto", quantidade: 2 },
      { produtoId: grade, combinacao: "GG / Preto", quantidade: 1 },
    ])
    expect(r.ok).toBe(true)
    if (!r.ok) return
    // Com preço próprio da grade, a faixa "a partir de 6: R$ 20" não vale.
    expect(semNbsp(r.mensagem)).toContain("• Jaqueta (Preto): 1 grade (6 peças) — R$ 25,00 cada = R$ 150,00")
    const { data: pedido } = await service.from("catalog_orders").select("total, catalog_order_items(unit_price)").eq("workspace_id", ws).eq("number", r.numero).single()
    expect(pedido?.total).toBe(150)
    expect(pedido?.catalog_order_items.every((i) => i.unit_price === 25)).toBe(true)
  })
})
