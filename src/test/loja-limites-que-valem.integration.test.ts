// @vitest-environment node
// B44-09 — os limites da loja valem com maiúsculas no endereço e com pedidos ao mesmo
// tempo (auditoria de 27/10/2026). Bate no Supabase real pela ação pública da vitrine,
// com uma loja de teste para cada critério.

import { createClient } from "@supabase/supabase-js"
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest"

const IP_DO_TESTE = `teste-b44-09-${Date.now()}-${Math.random()}`
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": IP_DO_TESTE }) }))
// O pedido busca a foto do contato pelo canal direto; aqui não há número conectado.
vi.mock("@/lib/whatsapp/foto-de-perfil", () => ({ buscarEGuardarFotoDoContato: vi.fn().mockResolvedValue("sem_canal") }))

import { fazerPedido } from "@/app/loja/[endereco]/actions"

const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const ts = Date.now()
const AVISO_MUITOS = { ok: false, erro: "Muitos pedidos em pouco tempo. Aguarde alguns minutos e tente de novo." }
const AVISO_ESPERE = { ok: false, erro: "Você acabou de fazer um pedido. Espere 2 minutos para enviar outro." }
const lojas: Record<string, { ws: string; slug: string; produto: string }> = {}

async function criarLoja(nome: string) {
  const slug = `b44-09-${nome}-${ts}`
  const ws = (await service.from("workspaces").insert({ name: `[TESTE] B44-09 ${nome} ${ts}` }).select("id").single()).data!.id
  await service.from("catalog_settings").insert({ workspace_id: ws, slug, orders_whatsapp: "5511900000000", published: true })
  const produto = (await service.from("catalog_products").insert({ workspace_id: ws, name: "Camisa", price: 20 }).select("id").single()).data!.id
  await service.from("catalog_stock").insert({ workspace_id: ws, product_id: produto, combination: "", quantity: 10_000 })
  lojas[nome] = { ws, slug, produto }
}

const pedir = (loja: string, endereco: string, telefone: string) =>
  fazerPedido(endereco, { nome: "Cliente", whatsapp: telefone }, [{ produtoId: lojas[loja].produto, combinacao: "", quantidade: 1 }])
const pedidosDa = async (loja: string) =>
  (await service.from("catalog_orders").select("id", { count: "exact", head: true }).eq("workspace_id", lojas[loja].ws)).count ?? 0
const telefone = (n: number) => `(21) 9${String(8000_0000 + n)}`

beforeAll(async () => {
  for (const nome of ["maiusculas", "rajada", "telefone"]) await criarLoja(nome)
}, 90_000)

afterAll(async () => {
  for (const { ws } of Object.values(lojas)) {
    await service.from("catalog_order_items").delete().eq("workspace_id", ws)
    await service.from("catalog_orders").delete().eq("workspace_id", ws)
    await service.from("catalog_stock").delete().eq("workspace_id", ws)
    await service.from("catalog_products").delete().eq("workspace_id", ws)
    await service.from("catalog_settings").delete().eq("workspace_id", ws)
    await service.from("contacts").delete().eq("workspace_id", ws)
    await service.from("workspaces").delete().eq("id", ws)
  }
}, 90_000)

describe("B44-09 — Limites da loja que valem de verdade", { timeout: 120_000 }, () => {
  it("CA-B44-33: should contar no mesmo limite os pedidos com maiúsculas diferentes no endereço da loja", async () => {
    const { slug } = lojas.maiusculas
    const formas = [slug, slug.toUpperCase(), slug.replace(/^b/, "B").replace("maiusculas", "Maiusculas")]
    for (let i = 0; i < 10; i++) expect((await pedir("maiusculas", formas[i % 3], telefone(i))).ok).toBe(true)

    expect(await pedir("maiusculas", slug.replace("maiusculas", "MAIUSCULAS"), telefone(99))).toEqual(AVISO_MUITOS)
    expect(await pedidosDa("maiusculas")).toBe(10)
  })

  it("CA-B44-34: should gravar no máximo 10 de 15 pedidos que chegam ao mesmo tempo", async () => {
    const resultados = await Promise.all(Array.from({ length: 15 }, (_, i) => pedir("rajada", lojas.rajada.slug, telefone(100 + i))))

    expect(resultados.filter((r) => r.ok)).toHaveLength(10)
    expect(resultados.filter((r) => !r.ok)).toEqual(Array.from({ length: 5 }, () => AVISO_MUITOS))
    expect(await pedidosDa("rajada")).toBe(10)
  })

  it("CA-B44-35: should gravar um pedido só quando o mesmo telefone pede duas vezes ao mesmo tempo", async () => {
    const resultados = await Promise.all([1, 2].map(() => pedir("telefone", lojas.telefone.slug, telefone(500))))

    expect(resultados.filter((r) => r.ok)).toHaveLength(1)
    expect(resultados.filter((r) => !r.ok)).toEqual([AVISO_ESPERE])
    expect(await pedidosDa("telefone")).toBe(1)
  })
})
