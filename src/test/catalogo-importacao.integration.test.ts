// @vitest-environment node
// B18 — importação de produtos por planilha. Batem no Supabase real.
// Mockado só @/integrations/supabase/server (cliente autenticado de verdade).

import { createClient } from "@supabase/supabase-js"
import * as XLSX from "xlsx"
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"

vi.mock("@/integrations/supabase/server", () => ({
  createClient: vi.fn(),
}))

import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { importarLote, previaImportacao } from "@/app/(auth)/catalogo/importar/actions"
import { COLUNAS_PLANILHA } from "@/lib/catalogo/planilha"

const mockSsr = vi.mocked(createSsrClient)
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SENHA = "senha-test-123!"
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
const ts = Date.now()
const criados = { workspaceIds: [] as string[], userIds: [] as string[] }
const emailAdmin = `imp-admin-${ts}@catalogo-test.com`
const emailAtend = `imp-atend-${ts}@catalogo-test.com`
const emailB = `imp-b-${ts}@catalogo-test.com`
let ws = ""

async function criarUsuario(workspace: string, email: string, role: string, nome: string) {
  const { data } = await service.auth.admin.createUser({ email, password: SENHA, email_confirm: true })
  await service.from("profiles").insert({ id: data.user!.id, workspace_id: workspace, name: nome, role, status: "active" })
  criados.userIds.push(data.user!.id)
}
async function entrarComo(email: string) {
  const c = createClient(URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const { error } = await c.auth.signInWithPassword({ email, password: SENHA })
  if (error) throw new Error(error.message)
  mockSsr.mockResolvedValue(c as never)
}

/** Planilha .xlsx com o cabeçalho do modelo e as linhas dadas (pares coluna → valor). */
function planilhaXlsx(linhas: Record<string, unknown>[], nome = "produtos.xlsx"): FormData {
  const matriz = [COLUNAS_PLANILHA.map((c) => c.titulo), ...linhas.map((l) => COLUNAS_PLANILHA.map((c) => l[c.chave] ?? null))]
  const livro = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(livro, XLSX.utils.aoa_to_sheet(matriz), "Produtos")
  const bytes = XLSX.write(livro, { type: "array", bookType: "xlsx" }) as ArrayBuffer
  const dados = new FormData()
  dados.set("arquivo", new File([bytes], nome))
  return dados
}
function lote(dados: FormData, codigos: string[]): FormData {
  dados.set("codigos", JSON.stringify(codigos))
  return dados
}
function arquivo(conteudo: string, nome: string): FormData {
  const dados = new FormData()
  dados.set("arquivo", new File([new TextEncoder().encode(conteudo)], nome))
  return dados
}

beforeAll(async () => {
  ws = (await service.from("workspaces").insert({ name: `Importação ${ts}` }).select().single()).data!.id
  const wsB = (await service.from("workspaces").insert({ name: `Importação B ${ts}` }).select().single()).data!.id
  criados.workspaceIds.push(ws, wsB)
  await criarUsuario(ws, emailAdmin, "admin", "Admin Imp")
  await criarUsuario(ws, emailAtend, "atendente", "Atendente Imp")
  await criarUsuario(wsB, emailB, "admin", "Outra")
  const cat = (await service.from("catalog_categories").insert({ workspace_id: ws, name: "Vestidos" }).select("id").single()).data!.id
  const vestido = (await service.from("catalog_products").insert({
    workspace_id: ws, name: "Vestido Linho", price: 79.9, sku: "VES-001", category_id: cat,
    variant_types: [{ id: "t", nome: "Tamanho", opcoes: ["P", "M"] }],
  }).select("id").single()).data!.id
  await service.from("catalog_stock").insert([
    { workspace_id: ws, product_id: vestido, combination: "P", quantity: 5 },
    { workspace_id: ws, product_id: vestido, combination: "M", quantity: 7 },
  ])
  await service.from("catalog_products").insert([
    // Num insert de várias linhas, coluna ausente vira null (não o padrão): variant_types em todas.
    { workspace_id: ws, name: "Duplicado 1", price: 10, sku: "DUP", variant_types: [] },
    { workspace_id: ws, name: "Duplicado 2", price: 10, sku: "DUP", variant_types: [] },
    { workspace_id: ws, name: "Blusa", price: 30, sku: "BLU-1", variant_types: [{ id: "c", nome: "Cor", opcoes: ["Azul"] }] },
    { workspace_id: wsB, name: "De outra empresa", price: 10, sku: "OUTRA", variant_types: [] },
  ]).then((r) => { if (r.error) throw new Error(r.error.message) })
}, 60_000)

afterAll(async () => {
  // Fotos guardadas pela importação e as de teste.
  for (const pasta of ["produtos", "teste"]) {
    const { data } = await service.storage.from("catalog-images").list(`${ws}/${pasta}`, { limit: 1000 })
    if (data?.length) await service.storage.from("catalog-images").remove(data.map((a) => `${ws}/${pasta}/${a.name}`))
  }
  await service.from("catalog_products").delete().in("workspace_id", criados.workspaceIds)
  await service.from("catalog_categories").delete().in("workspace_id", criados.workspaceIds)
  if (criados.userIds.length) {
    await service.from("profiles").delete().in("id", criados.userIds)
    for (const id of criados.userIds) await service.auth.admin.deleteUser(id)
  }
  await service.from("workspaces").delete().in("id", criados.workspaceIds)
})

describe("B18-01 — Modelo, envio e prévia da planilha", { timeout: 30_000 }, () => {
  it("prévia separa novos e atualizados e mostra o que muda", async () => {
    await entrarComo(emailAdmin)
    const r = await previaImportacao(planilhaXlsx([
      { codigo: "VES-001", nome: "Vestido Linho", preco: "89,90", variacao1: "Tamanho", opcao1: "P", estoque: 10 },
      { codigo: "VES-001", variacao1: "Tamanho", opcao1: "G", estoque: 2 },
      { codigo: "NOVO-1", nome: "Saia", preco: "49,90", categoria: "Saias", estoque: 4 },
    ]))
    if ("erro" in r) throw new Error(r.erro)
    expect(r.previa).toMatchObject({ novos: 1, atualizados: 1, comErro: 0, erros: [] })
    const vestido = r.previa.itens.find((i) => i.codigo === "VES-001")!
    expect(vestido.situacao).toBe("atualiza")
    // P: 5 → 10; M fica 7 (não está na planilha); G é nova com 2. Total 12 → 19.
    // O real formatado usa espaço que não quebra depois do "R$".
    expect(vestido.mudancas.map((m) => m.replace(/ /g, " "))).toEqual(["Preço R$ 79,90 → R$ 89,90", "Estoque 12 → 19", "1 combinação nova"])
    expect(vestido.combinacoes).toBe(3)
    expect(r.previa.itens.find((i) => i.codigo === "NOVO-1")).toMatchObject({ situacao: "novo", estoqueTotal: 4, combinacoes: 1 })
  })

  it("nada é gravado na prévia", async () => {
    const { data } = await service.from("catalog_products").select("id").eq("workspace_id", ws).eq("sku", "NOVO-1")
    expect(data).toEqual([])
    const { data: est } = await service.from("catalog_stock").select("quantity").eq("workspace_id", ws).eq("combination", "P")
    expect(est?.[0].quantity).toBe(5)
  })

  it("código repetido no catálogo e variações que não batem viram erro", async () => {
    await entrarComo(emailAdmin)
    const r = await previaImportacao(planilhaXlsx([
      { codigo: "DUP", nome: "Dup", preco: 10 },
      { codigo: "BLU-1", nome: "Blusa", preco: 30, variacao1: "Tamanho", opcao1: "P" },
    ]))
    if ("erro" in r) throw new Error(r.erro)
    expect(r.previa.itens).toEqual([])
    expect(r.previa.comErro).toBe(2)
    expect(r.previa.erros.map((e) => e.texto)).toEqual([
      "DUP: há 2 produtos com esse código no catálogo. Dê códigos diferentes a eles no CRM.",
      "BLU-1: as variações não batem com as do produto (Cor). Edite o produto no CRM.",
    ])
  })

  it("CSV com ponto e vírgula e acentos", async () => {
    await entrarComo(emailAdmin)
    const csv = "Código;Nome;Preço;Estoque\nCAL-1;Calça Algodão;1.234,50;3\n"
    const r = await previaImportacao(arquivo(csv, "produtos.csv"))
    if ("erro" in r) throw new Error(r.erro)
    expect(r.previa.itens).toEqual([expect.objectContaining({ codigo: "CAL-1", nome: "Calça Algodão", situacao: "novo", estoqueTotal: 3 })])
  })

  it("arquivo errado, coluna faltando e planilha vazia", async () => {
    await entrarComo(emailAdmin)
    expect(await previaImportacao(arquivo("oi", "foto.png"))).toEqual({ erro: "Envie a planilha do Excel ou o arquivo .csv do Google Planilhas." })
    expect(await previaImportacao(arquivo("Código,Nome\nA,B\n", "p.csv"))).toEqual({ erro: "Falta a coluna Preço. Use o modelo." })
    expect(await previaImportacao(arquivo("Nome\nB\n", "p.csv"))).toEqual({ erro: "Faltam as colunas Código e Preço. Use o modelo." })
    expect(await previaImportacao(arquivo("Código,Nome,Preço\n", "p.csv"))).toEqual({ erro: "A planilha não tem nenhum produto." })
  })

  it("produto de outra empresa com o mesmo código não é atualizado", async () => {
    await entrarComo(emailAdmin)
    const r = await previaImportacao(planilhaXlsx([{ codigo: "OUTRA", nome: "Meu", preco: 10 }]))
    if ("erro" in r) throw new Error(r.erro)
    expect(r.previa.itens).toEqual([expect.objectContaining({ codigo: "OUTRA", situacao: "novo" })])
  })

  it("Atendente não importa", async () => {
    await entrarComo(emailAtend)
    expect(await previaImportacao(planilhaXlsx([{ codigo: "A", nome: "A", preco: 10 }]))).toEqual({ erro: "Só Admin e Gerente mexem no catálogo." })
  })
})

describe("B18-02 — Gravar a importação", { timeout: 60_000 }, () => {
  const produto = async (sku: string) =>
    (await service.from("catalog_products").select("id, name, price, description, visible, category_id, variant_types, catalog_stock(combination, quantity)").eq("workspace_id", ws).eq("sku", sku)).data ?? []
  const estoque = (p: { catalog_stock: unknown }) =>
    Object.fromEntries(((p.catalog_stock as { combination: string; quantity: number }[]) ?? []).map((e) => [e.combination, e.quantity]))
  const planilha = () => planilhaXlsx([
    { codigo: "VES-001", nome: "Vestido Linho", preco: "89,90", variacao1: "Tamanho", opcao1: "P", estoque: 10 },
    { codigo: "VES-001", variacao1: "Tamanho", opcao1: "G", estoque: 2 },
    { codigo: "NOVO-2", nome: "Saia Midi", preco: "49,90", categoria: "Saias", estoque: 4 },
    { codigo: "ERRADO", nome: "Sem preço" },
  ])

  beforeAll(async () => {
    await service.from("catalog_products").update({ description: "Linho leve." }).eq("workspace_id", ws).eq("sku", "VES-001")
  })

  it("cria o novo e atualiza o existente sem apagar o que a planilha não traz", async () => {
    await entrarComo(emailAdmin)
    const r = await importarLote(lote(planilha(), ["VES-001", "NOVO-2"]))
    if ("erro" in r) throw new Error(r.erro)
    expect(r.lote).toEqual({ novos: 1, atualizados: 1, falhas: [], avisos: [] })

    const [vestido] = await produto("VES-001")
    expect(Number(vestido.price)).toBe(89.9)
    expect(vestido.description).toBe("Linho leve.")
    expect(vestido.category_id).not.toBeNull()
    expect((vestido.variant_types as { opcoes: string[] }[])[0].opcoes).toEqual(["P", "M", "G"])
    expect(estoque(vestido)).toEqual({ P: 10, M: 7, G: 2 })

    const [saia] = await produto("NOVO-2")
    expect(saia).toMatchObject({ name: "Saia Midi", visible: true })
    expect(estoque(saia)).toEqual({ "": 4 })
    const { data: cat } = await service.from("catalog_categories").select("name").eq("id", saia.category_id!).single()
    expect(cat?.name).toBe("Saias")
  })

  it("reimportar atualiza sem duplicar e reaproveita a categoria", async () => {
    await entrarComo(emailAdmin)
    const dados = planilhaXlsx([{ codigo: "NOVO-2", nome: "Saia Midi", preco: "59,90", categoria: "SAIAS" }])
    const r = await importarLote(lote(dados, ["NOVO-2"]))
    if ("erro" in r) throw new Error(r.erro)
    expect(r.lote).toEqual({ novos: 0, atualizados: 1, falhas: [], avisos: [] })
    const iguais = await produto("NOVO-2")
    expect(iguais).toHaveLength(1)
    expect(Number(iguais[0].price)).toBe(59.9)
    // Estoque vazio na reimportação mantém o que havia.
    expect(estoque(iguais[0])).toEqual({ "": 4 })
    const { data: cats } = await service.from("catalog_categories").select("id").eq("workspace_id", ws).ilike("name", "saias")
    expect(cats).toHaveLength(1)
  })

  it("produto com erro na planilha não é gravado e volta como falha", async () => {
    await entrarComo(emailAdmin)
    const r = await importarLote(lote(planilha(), ["ERRADO"]))
    if ("erro" in r) throw new Error(r.erro)
    expect(r.lote.novos + r.lote.atualizados).toBe(0)
    expect(await produto("ERRADO")).toEqual([])
  })

  it("não mexe no produto de outra empresa com o mesmo código", async () => {
    await entrarComo(emailAdmin)
    const r = await importarLote(lote(planilhaXlsx([{ codigo: "OUTRA", nome: "Meu Produto", preco: 15 }]), ["OUTRA"]))
    if ("erro" in r) throw new Error(r.erro)
    expect(r.lote.novos).toBe(1)
    const { data: deles } = await service.from("catalog_products").select("name").eq("sku", "OUTRA").neq("workspace_id", ws)
    expect(deles).toEqual([{ name: "De outra empresa" }])
  })

  it("Atendente não grava e lote inválido é recusado", async () => {
    await entrarComo(emailAtend)
    expect(await importarLote(lote(planilha(), ["NOVO-2"]))).toEqual({ erro: "Só Admin e Gerente mexem no catálogo." })
    await entrarComo(emailAdmin)
    expect(await importarLote(lote(planilha(), []))).toEqual({ erro: "Lote inválido." })
  })
})

describe("B18-03 — Fotos por link", { timeout: 60_000 }, () => {
  // PNG de 1×1 pixel.
  const PNG = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0))
  const publica = (caminho: string) => `${URL}/storage/v1/object/public/catalog-images/${caminho}`
  let fotoBoa = "", naoImagem = ""

  beforeAll(async () => {
    await service.storage.from("catalog-images").upload(`${ws}/teste/boa.png`, PNG, { contentType: "image/png" })
    await service.storage.from("catalog-images").upload(`${ws}/teste/falsa.png`, new TextEncoder().encode("isto não é imagem"), { contentType: "image/png" })
    fotoBoa = publica(`${ws}/teste/boa.png`)
    naoImagem = publica(`${ws}/teste/falsa.png`)
  })

  const fotosDe = async (sku: string) =>
    ((await service.from("catalog_products").select("photos").eq("workspace_id", ws).eq("sku", sku).single()).data?.photos as string[]) ?? []

  it("baixa e guarda as fotos; links ruins viram aviso e o produto entra", async () => {
    await entrarComo(emailAdmin)
    const links = [fotoBoa, publica(`${ws}/teste/nao-existe.png`), naoImagem, "http://127.0.0.1/foto.jpg", "http://169.254.169.254/latest/meta-data"].join(" ")
    const r = await importarLote(lote(planilhaXlsx([{ codigo: "FOTO-1", nome: "Com fotos", preco: 20, fotos: links }]), ["FOTO-1"]))
    if ("erro" in r) throw new Error(r.erro)
    expect(r.lote.novos).toBe(1)
    expect(r.lote.avisos.map((a) => a.texto)).toEqual([
      "a foto 2 não abriu (link quebrado).",
      "a foto 3 não é uma imagem JPG, PNG ou WebP.",
      "a foto 4 não abriu (endereço não permitido).",
      "a foto 5 não abriu (endereço não permitido).",
    ])
    const fotos = await fotosDe("FOTO-1")
    expect(fotos).toHaveLength(1)
    expect(fotos[0]).toMatch(new RegExp(`^${ws}/produtos/.+\.png$`))
  })

  it("coluna vazia mantém as fotos; preenchida substitui e apaga as antigas", async () => {
    await entrarComo(emailAdmin)
    const antes = await fotosDe("FOTO-1")
    await importarLote(lote(planilhaXlsx([{ codigo: "FOTO-1", nome: "Com fotos", preco: 25 }]), ["FOTO-1"]))
    expect(await fotosDe("FOTO-1")).toEqual(antes)

    await importarLote(lote(planilhaXlsx([{ codigo: "FOTO-1", nome: "Com fotos", preco: 25, fotos: `${fotoBoa}, ${fotoBoa}` }]), ["FOTO-1"]))
    const depois = await fotosDe("FOTO-1")
    expect(depois).toHaveLength(2)
    expect(depois).not.toContain(antes[0])
    const { data } = await service.storage.from("catalog-images").list(`${ws}/produtos`, { search: antes[0].split("/").pop() })
    expect(data).toEqual([])
  })

  it("se nenhuma foto baixar, o produto existente mantém as dele", async () => {
    await entrarComo(emailAdmin)
    const antes = await fotosDe("FOTO-1")
    const r = await importarLote(lote(planilhaXlsx([{ codigo: "FOTO-1", nome: "Com fotos", preco: 25, fotos: "http://127.0.0.1/x.jpg" }]), ["FOTO-1"]))
    if ("erro" in r) throw new Error(r.erro)
    expect(r.lote.avisos).toHaveLength(1)
    expect(await fotosDe("FOTO-1")).toEqual(antes)
  })
})
