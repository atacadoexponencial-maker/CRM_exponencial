// @vitest-environment node
// B61-06 — Formas de entrega e de pagamento: o que o lojista salva, o que o servidor
// recusa e o que a loja pública entrega; e a loja publicada antes da série, sem nada
// preenchido, abrindo e fazendo pedido. Bate no Supabase real (banco de teste). Mockado
// só @/integrations/supabase/server (cliente autenticado de verdade).

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

vi.mock("@/integrations/supabase/server", () => ({
  createClient: vi.fn(),
}))
// O pedido da loja lê o IP de quem pede; fora do servidor não há requisição.
const IP_DO_TESTE = `teste-b61-06-${Date.now()}-${Math.random()}`
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": IP_DO_TESTE }) }))
// O pedido busca a foto do contato pelo canal direto; aqui não há número conectado.
vi.mock("@/lib/whatsapp/foto-de-perfil", () => ({ buscarEGuardarFotoDoContato: vi.fn().mockResolvedValue("sem_canal") }))

import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { carregarConfiguracoes, salvarConfiguracoes } from "@/app/(auth)/catalogo/configuracoes/actions"
import type { ConfigCatalogo } from "@/app/(auth)/catalogo/components/form-configuracoes"
import { carregarLojaPublica, carregarProdutoPublico, carregarVitrine } from "@/lib/catalogo/loja-publica"
import { fazerPedido } from "@/app/loja/[endereco]/actions"

const mockSsr = vi.mocked(createSsrClient)
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const SENHA = "senha-test-123!"
const service = createClient(URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
const ts = Date.now()
const email = `loja-entrega-admin-${ts}@catalogo-test.com`
const slug = `b61-06-loja-${ts}`
const slugAntiga = `b61-06-antiga-${ts}`
const PEDIDOS = "(21) 90000-1111"

let ws = ""
let wsAntiga = ""
let userId = ""
let produtoAntigo = ""
let logado: SupabaseClient

function config(parcial: Partial<ConfigCatalogo> = {}): ConfigCatalogo {
  return { endereco: slug, numeroPedidos: PEDIDOS, minimo: { tipo: "nenhum", valor: null }, descontos: [], mensagemFechamento: "", publicado: true, limiteSelo: "", formasEntrega: [], formasPagamento: [], ...parcial }
}
async function formasNoBanco() {
  const { data } = await service.from("catalog_settings").select("delivery_methods, payment_methods").eq("workspace_id", ws).single()
  return { entrega: data!.delivery_methods, pagamento: data!.payment_methods }
}
/** O que a página de produto e o rodapé da loja recebem. */
async function formasNaLoja() {
  const loja = await carregarLojaPublica(slug)
  expect(loja, "a loja está publicada").not.toBeNull()
  return { entrega: loja!.formasEntrega, pagamento: loja!.formasPagamento }
}

beforeAll(async () => {
  const { data: empresa } = await service.from("workspaces").insert({ name: `Loja Entrega ${ts}` }).select().single()
  ws = empresa!.id
  const { data: conta } = await service.auth.admin.createUser({ email, password: SENHA, email_confirm: true })
  userId = conta.user!.id
  await service.from("profiles").insert({ id: userId, workspace_id: ws, name: "admin", role: "admin", status: "active" })

  // Loja publicada como antes da série: só endereço e número, o resto no padrão do banco.
  const { data: antiga } = await service.from("workspaces").insert({ name: `[TESTE] B61-06 antiga ${ts}` }).select().single()
  wsAntiga = antiga!.id
  await service.from("catalog_settings").insert({ workspace_id: wsAntiga, slug: slugAntiga, orders_whatsapp: "5511900000000", published: true })
  const { data: categoria } = await service.from("catalog_categories").insert({ workspace_id: wsAntiga, name: "Camisas", position: 0 }).select("id").single()
  const { data: p } = await service.from("catalog_products").insert({ workspace_id: wsAntiga, category_id: categoria!.id, name: "Camisa", price: 20 }).select("id").single()
  produtoAntigo = p!.id
  await service.from("catalog_stock").insert({ workspace_id: wsAntiga, product_id: produtoAntigo, combination: "", quantity: 3 })

  logado = createClient(URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const entrada = await logado.auth.signInWithPassword({ email, password: SENHA })
  if (entrada.error) throw new Error(entrada.error.message)
  mockSsr.mockResolvedValue(logado as never)
}, 60_000)

afterAll(async () => {
  for (const empresa of [ws, wsAntiga]) {
    if (!empresa) continue
    await service.from("catalog_order_items").delete().eq("workspace_id", empresa)
    await service.from("catalog_orders").delete().eq("workspace_id", empresa)
    await service.from("catalog_stock").delete().eq("workspace_id", empresa)
    await service.from("catalog_products").delete().eq("workspace_id", empresa)
    await service.from("catalog_categories").delete().eq("workspace_id", empresa)
    await service.from("catalog_settings").delete().eq("workspace_id", empresa)
    await service.from("contacts").delete().eq("workspace_id", empresa)
  }
  if (userId) {
    await service.from("profiles").delete().eq("id", userId)
    await service.auth.admin.deleteUser(userId)
  }
  for (const empresa of [ws, wsAntiga]) if (empresa) await service.from("workspaces").delete().eq("id", empresa)
}, 60_000)

describe("B61-06 — formas de entrega e de pagamento", { timeout: 60_000 }, () => {
  it("CA-B61-70: o lojista marca 'Correios' e 'Excursão' em entrega e 'Pix' em pagamento; ao reabrir continuam marcadas e a loja mostra exatamente as três", async () => {
    // Começa com nada marcado.
    expect((await carregarConfiguracoes())?.config).toMatchObject({ formasEntrega: [], formasPagamento: [] })

    const r = await salvarConfiguracoes(config({ formasEntrega: ["excursao", "correios"], formasPagamento: ["pix"] }))
    expect(r.erro).toBeUndefined()
    expect(await formasNoBanco()).toEqual({ entrega: ["correios", "excursao"], pagamento: ["pix"] })
    // Ao reabrir a tela, as três caixas vêm marcadas.
    expect((await carregarConfiguracoes())?.config).toMatchObject({ formasEntrega: ["correios", "excursao"], formasPagamento: ["pix"] })
    // A página de produto da loja recebe exatamente essas três, pelos nomes.
    expect(await formasNaLoja()).toEqual({ entrega: ["Correios", "Excursão"], pagamento: ["Pix"] })
  })

  it("CA-B61-42: com 'Correios' e 'Retirada no local' em entrega e 'Pix' e 'Cartão de crédito' em pagamento, a loja entrega essas opções e nenhuma outra", async () => {
    expect((await salvarConfiguracoes(config({ formasEntrega: ["correios", "retirada"], formasPagamento: ["pix", "cartao"] }))).erro).toBeUndefined()
    expect(await formasNaLoja()).toEqual({ entrega: ["Correios", "Retirada no local"], pagamento: ["Pix", "Cartão de crédito"] })
  })

  it("CA-B61-43: sem forma de entrega marcada e com 'Pix' em pagamento, a loja entrega a entrega vazia e só Pix em pagamento", async () => {
    expect((await salvarConfiguracoes(config({ formasEntrega: [], formasPagamento: ["pix"] }))).erro).toBeUndefined()
    expect(await formasNaLoja()).toEqual({ entrega: [], pagamento: ["Pix"] })
  })

  it("CA-B61-49: com 'Transportadora' em entrega e nada em pagamento, a loja entrega só a Transportadora para o rodapé", async () => {
    expect((await salvarConfiguracoes(config({ formasEntrega: ["transportadora"], formasPagamento: [] }))).erro).toBeUndefined()
    expect(await formasNaLoja()).toEqual({ entrega: ["Transportadora"], pagamento: [] })
  })

  it("CA-B61-71: forma fora da lista ('Drone') é recusada pelo servidor e as formas gravadas não mudam", async () => {
    expect((await salvarConfiguracoes(config({ formasEntrega: ["correios"], formasPagamento: ["boleto"] }))).erro).toBeUndefined()
    const gravadas = { entrega: ["correios"], pagamento: ["boleto"] }
    expect(await formasNoBanco()).toEqual(gravadas)

    const tentativas: [Partial<ConfigCatalogo>, string][] = [
      [{ formasEntrega: ["Drone"], formasPagamento: ["pix"] }, "Forma de entrega inválida."],
      [{ formasEntrega: ["correios", "drone"], formasPagamento: ["pix"] }, "Forma de entrega inválida."],
      [{ formasEntrega: ["transportadora"], formasPagamento: ["Drone"] }, "Forma de pagamento inválida."],
      // O nome de exibição não é o identificador da lista, e pix não é forma de entrega.
      [{ formasEntrega: ["pix"], formasPagamento: [] }, "Forma de entrega inválida."],
      [{ formasEntrega: "correios" as unknown as string[], formasPagamento: [] }, "Forma de entrega inválida."],
    ]
    for (const [parcial, aviso] of tentativas) {
      const r = await salvarConfiguracoes(config({ ...parcial, mensagemFechamento: "não pode gravar" }))
      expect(r.erro, JSON.stringify(parcial)).toBe(aviso)
      expect(await formasNoBanco(), JSON.stringify(parcial)).toEqual(gravadas)
    }
    // Nem o resto do formulário entrou junto, e a loja segue com o que estava.
    const { data } = await service.from("catalog_settings").select("closing_message").eq("workspace_id", ws).single()
    expect(data!.closing_message).toBe("")
    expect(await formasNaLoja()).toEqual({ entrega: ["Correios"], pagamento: ["Boleto"] })
  })
})

describe("B61-06 — loja publicada antes da série", { timeout: 60_000 }, () => {
  it("CA-B61-72: sem Instagram, foto de categoria, subcategoria, selo, entrega e pagamento, a loja e o produto abrem e a cliente faz um pedido", async () => {
    // O que está no banco é o cenário: nada da série preenchido.
    const { data: cfg } = await service.from("catalog_settings").select("instagram, low_stock_limit, delivery_methods, payment_methods").eq("workspace_id", wsAntiga).single()
    expect(cfg).toEqual({ instagram: null, low_stock_limit: null, delivery_methods: [], payment_methods: [] })

    // A vitrine abre: sem @, sem foto enviada na categoria, sem subcategoria e sem selo.
    const loja = await carregarLojaPublica(slugAntiga)
    expect(loja).not.toBeNull()
    expect(loja!.tema.instagram).toBe("")
    expect(loja!.formasEntrega).toEqual([])
    expect(loja!.formasPagamento).toEqual([])
    const { categorias, produtos } = await carregarVitrine(loja!.workspaceId)
    expect(categorias).toEqual([{ id: expect.any(String), nome: "Camisas", fotoUrl: null, subcategorias: [] }])
    expect(produtos).toHaveLength(1)
    // 3 peças em estoque e nenhum limite: sem o selo.
    expect(produtos[0]).toMatchObject({ nome: "Camisa", subcategoriaId: null, esgotado: false, ultimasUnidades: false, opcoes: [], outrasOpcoes: null })

    // A página do produto abre.
    const produto = await carregarProdutoPublico(loja!.workspaceId, produtoAntigo)
    expect(produto).toMatchObject({ nome: "Camisa", preco: 20, codigo: "", estoque: { "": 3 } })

    // E ela faz um pedido.
    const pedido = await fazerPedido(slugAntiga, { nome: "Cliente", whatsapp: "(21) 98000-0001" }, [{ produtoId: produtoAntigo, combinacao: "", quantidade: 1 }], "XXXX.DUMMY.TOKEN.XXXX")
    expect(pedido.ok, JSON.stringify(pedido)).toBe(true)
    const { count } = await service.from("catalog_orders").select("id", { count: "exact", head: true }).eq("workspace_id", wsAntiga)
    expect(count).toBe(1)
  })
})
