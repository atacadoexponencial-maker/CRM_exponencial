// @vitest-environment node
// B61-04 — O que a loja pública entrega para o cartão em retrato (opções do primeiro tipo,
// a esgotada, o resumo do segundo tipo e o selo "Últimas unidades!") e o limite do selo
// nas Configurações. Bate no Supabase real (banco de teste). Mockado só
// @/integrations/supabase/server (cliente autenticado de verdade).

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

vi.mock("@/integrations/supabase/server", () => ({
  createClient: vi.fn(),
}))

import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { carregarConfiguracoes, salvarConfiguracoes } from "@/app/(auth)/catalogo/configuracoes/actions"
import type { ConfigCatalogo } from "@/app/(auth)/catalogo/components/form-configuracoes"
import { carregarVitrine } from "@/lib/catalogo/loja-publica"

const mockSsr = vi.mocked(createSsrClient)
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const SENHA = "senha-test-123!"
const AVISO_LIMITE = "Use um número inteiro de 1 a 999, ou deixe vazio para não mostrar o selo."
const service = createClient(URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
const ts = Date.now()
const email = `loja-cartao-admin-${ts}@catalogo-test.com`

let ws = ""
let userId = ""
let logado: SupabaseClient

const TAMANHO = (opcoes: string[]) => ({ id: "t", nome: "Tamanho", opcoes })
const COR = (opcoes: string[]) => ({ id: "c", nome: "Cor", opcoes })

async function criarProduto(nome: string, posicao: number, tipos: { id: string; nome: string; opcoes: string[] }[], estoque: Record<string, number>) {
  const { data, error } = await service
    .from("catalog_products")
    .insert({ workspace_id: ws, name: nome, price: 10, position: posicao, visible: true, variant_types: tipos })
    .select("id")
    .single()
  if (error) throw new Error(error.message)
  const linhas = Object.entries(estoque).map(([combination, quantity]) => ({ workspace_id: ws, product_id: data.id, combination, quantity }))
  const gravado = await service.from("catalog_stock").insert(linhas)
  if (gravado.error) throw new Error(gravado.error.message)
}

function config(parcial: Partial<ConfigCatalogo> = {}): ConfigCatalogo {
  return { endereco: "", numeroPedidos: "", minimo: { tipo: "nenhum", valor: null }, descontos: [], mensagemFechamento: "", publicado: false, limiteSelo: "", ...parcial }
}

/** Deixa o limite do selo como o teste precisa, direto no banco. */
async function definirLimite(limite: number | null) {
  const { error } = await service.from("catalog_settings").upsert({ workspace_id: ws, low_stock_limit: limite })
  if (error) throw new Error(error.message)
}
async function limiteNoBanco() {
  const { data } = await service.from("catalog_settings").select("low_stock_limit").eq("workspace_id", ws).maybeSingle()
  return data ? data.low_stock_limit : undefined
}
async function produtoDaLoja(nome: string) {
  const { produtos } = await carregarVitrine(ws)
  const achado = produtos.find((p) => p.nome === nome)
  expect(achado, `a loja devolve o produto ${nome}`).toBeDefined()
  return achado!
}
async function comSelo() {
  const { produtos } = await carregarVitrine(ws)
  return produtos.filter((p) => p.ultimasUnidades).map((p) => p.nome).sort()
}

beforeAll(async () => {
  const { data: empresa } = await service.from("workspaces").insert({ name: `Loja Cartao ${ts}` }).select().single()
  ws = empresa!.id
  const { data: conta } = await service.auth.admin.createUser({ email, password: SENHA, email_confirm: true })
  userId = conta.user!.id
  await service.from("profiles").insert({ id: userId, workspace_id: ws, name: "admin", role: "admin", status: "active" })

  // Tamanhos P, M e G, com o M zerado (7 peças no total).
  await criarProduto("Blusa tamanhos", 0, [TAMANHO(["P", "M", "G"])], { P: 3, M: 0, G: 4 })
  // Tamanho e Cor: o P só tem estoque no Preto; o M não tem em nenhuma cor (2 peças no total).
  await criarProduto("Vestido duas variações", 1, [TAMANHO(["P", "M"]), COR(["Preto", "Branco"])], { "P / Preto": 2, "P / Branco": 0, "M / Preto": 0, "M / Branco": 0 })
  await criarProduto("Com 5 peças", 2, [], { "": 5 })
  await criarProduto("Com 6 peças", 3, [], { "": 6 })
  await criarProduto("Sem estoque", 4, [], { "": 0 })
  await criarProduto("Com 1 peça", 5, [], { "": 1 })

  logado = createClient(URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const entrada = await logado.auth.signInWithPassword({ email, password: SENHA })
  if (entrada.error) throw new Error(entrada.error.message)
  mockSsr.mockResolvedValue(logado as never)
}, 60_000)

afterAll(async () => {
  if (ws) {
    await service.from("catalog_stock").delete().eq("workspace_id", ws)
    await service.from("catalog_products").delete().eq("workspace_id", ws)
    await service.from("catalog_settings").delete().eq("workspace_id", ws)
  }
  if (userId) {
    await service.from("profiles").delete().eq("id", userId)
    await service.auth.admin.deleteUser(userId)
  }
  if (ws) await service.from("workspaces").delete().eq("id", ws)
})

describe("B61-04 — opções do cartão na loja pública", { timeout: 60_000 }, () => {
  it("CA-B61-24: a loja entrega P, M e G para o cartão, com o M (sem estoque) esgotado", async () => {
    const p = await produtoDaLoja("Blusa tamanhos")
    expect(p.opcoes).toEqual([
      { nome: "P", esgotada: false },
      { nome: "M", esgotada: true },
      { nome: "G", esgotada: false },
    ])
    expect(p.outrasOpcoes).toBeNull()
    expect(p.esgotado).toBe(false)
  })

  it("CA-B61-25: produto com Tamanho e Cor entrega P e M para os quadradinhos e o texto '2 opções de cor'", async () => {
    const p = await produtoDaLoja("Vestido duas variações")
    expect(p.opcoes?.map((o) => o.nome)).toEqual(["P", "M"])
    expect(p.outrasOpcoes).toBe("2 opções de cor")
  })

  it("CA-B61-26: o P com estoque só na cor Preto não vem esgotado; o M, sem estoque em cor nenhuma, vem", async () => {
    // O estoque gravado é o do cenário: P só no Preto.
    const { data: estoque } = await service.from("catalog_stock").select("combination, quantity").eq("workspace_id", ws).like("combination", "P / %")
    expect(Object.fromEntries((estoque ?? []).map((e) => [e.combination, e.quantity]))).toEqual({ "P / Preto": 2, "P / Branco": 0 })

    const p = await produtoDaLoja("Vestido duas variações")
    expect(p.opcoes).toEqual([
      { nome: "P", esgotada: false },
      { nome: "M", esgotada: true },
    ])
  })
})

describe("B61-04 — selo 'Últimas unidades!'", { timeout: 60_000 }, () => {
  it("CA-B61-30: sem limite configurado, nenhum produto vem com o selo, nem o que tem 1 peça", async () => {
    await service.from("catalog_settings").delete().eq("workspace_id", ws)
    expect(await limiteNoBanco()).toBeUndefined()
    // O produto com 1 peça existe e está na loja.
    expect((await produtoDaLoja("Com 1 peça")).esgotado).toBe(false)
    expect(await comSelo()).toEqual([])

    // Com a linha de configurações gravada e o campo vazio, também não.
    await definirLimite(null)
    expect(await limiteNoBanco()).toBeNull()
    expect(await comSelo()).toEqual([])
  })

  it("CA-B61-28: com o selo em 5 peças, o produto com 5 no total vem com o selo e o de 6 não", async () => {
    await definirLimite(5)
    expect((await produtoDaLoja("Com 5 peças")).ultimasUnidades).toBe(true)
    expect((await produtoDaLoja("Com 6 peças")).ultimasUnidades).toBe(false)
    // O total soma todas as combinações: 3 + 0 + 4 = 7 fica fora; 2 + 0 + 0 + 0 = 2 entra.
    expect((await produtoDaLoja("Blusa tamanhos")).ultimasUnidades).toBe(false)
    expect((await produtoDaLoja("Vestido duas variações")).ultimasUnidades).toBe(true)
  })

  it("CA-B61-29: com o selo em 5 peças, o produto sem estoque vem esgotado e sem o selo", async () => {
    await definirLimite(5)
    const p = await produtoDaLoja("Sem estoque")
    expect(p.esgotado).toBe(true)
    expect(p.ultimasUnidades).toBe(false)
  })

  it("CA-B61-67: o lojista salva 5 no campo do selo, a tela confirma e a loja passa a marcar os produtos com 5 peças ou menos", async () => {
    await definirLimite(null)
    expect(await comSelo()).toEqual([])

    const r = await salvarConfiguracoes(config({ limiteSelo: "5" }))
    expect(r.erro).toBeUndefined()
    expect(r.aviso).toMatch(/^Salvo\./)
    expect(await limiteNoBanco()).toBe(5)
    // Ao reabrir a tela, o campo vem com o 5.
    expect((await carregarConfiguracoes())?.config.limiteSelo).toBe("5")
    expect(await comSelo()).toEqual(["Com 1 peça", "Com 5 peças", "Vestido duas variações"])
  })

  it("CA-B61-68: 0, número negativo, número com vírgula e número acima de 999 são recusados pelo servidor e nada é gravado", async () => {
    await definirLimite(5)
    for (const digitado of ["0", "-3", "2,5", "1000", "2.5", "abc"]) {
      const r = await salvarConfiguracoes(config({ limiteSelo: digitado, mensagemFechamento: "não pode gravar" }))
      expect(r.erro, `"${digitado}" é recusado`).toBe(AVISO_LIMITE)
      expect(await limiteNoBanco(), `"${digitado}" não muda o limite`).toBe(5)
    }
    // Nem o resto do formulário foi gravado junto.
    const { data } = await service.from("catalog_settings").select("closing_message").eq("workspace_id", ws).single()
    expect(data!.closing_message).toBe("")
    // Os limites das pontas valem.
    expect((await salvarConfiguracoes(config({ limiteSelo: "999" }))).erro).toBeUndefined()
    expect(await limiteNoBanco()).toBe(999)
    expect((await salvarConfiguracoes(config({ limiteSelo: "1" }))).erro).toBeUndefined()
    expect(await limiteNoBanco()).toBe(1)
  })

  it("CA-B61-69: com o selo em 5 peças, salvar o campo vazio desliga o selo em toda a loja", async () => {
    await definirLimite(5)
    expect(await comSelo()).toEqual(["Com 1 peça", "Com 5 peças", "Vestido duas variações"])

    const r = await salvarConfiguracoes(config({ limiteSelo: "" }))
    expect(r.erro).toBeUndefined()
    expect(await limiteNoBanco()).toBeNull()
    expect((await carregarConfiguracoes())?.config.limiteSelo).toBe("")
    expect(await comSelo()).toEqual([])
  })
})
