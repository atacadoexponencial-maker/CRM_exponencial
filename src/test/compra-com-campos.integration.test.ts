// @vitest-environment node
// B30-01: registrar compra com os campos dos relatórios, no Supabase real.
// Única coisa mockada: @/integrations/supabase/server, para injetar um
// cliente autenticado de verdade no lugar do cliente baseado em cookies.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"

vi.mock("@/integrations/supabase/server", () => ({
  createClient: vi.fn(),
}))

import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { registrarCompra, buscarDadosContato } from "@/app/(auth)/contatos/actions"

const mockSsrCreateClient = vi.mocked(createSsrClient)

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const ts = Date.now()
const SENHA = "senha-segura-123"

let empresa = ""
let admin = "", vendedor = "", atendente = ""
let contato = ""
const navegadores: Record<string, SupabaseClient> = {}
const usuarios: string[] = []

async function criarUsuario(nome: string, role: string) {
  const email = `b30-01-${nome.toLowerCase().replace(/\s+/g, "-")}-${ts}@teste.com`
  const id = (await service.auth.admin.createUser({ email, password: SENHA, email_confirm: true })).data.user!.id
  await service.from("profiles").insert({ id, workspace_id: empresa, name: nome, role, status: "active" })
  const navegador = createClient(URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  const { error } = await navegador.auth.signInWithPassword({ email, password: SENHA })
  if (error) throw new Error(`Falha ao autenticar ${email}: ${error.message}`)
  navegadores[id] = navegador
  usuarios.push(id)
  return id
}

function entrarComo(id: string) {
  mockSsrCreateClient.mockResolvedValue(navegadores[id] as never)
}

async function comprasDoContato() {
  const perfil = await buscarDadosContato(contato)
  return perfil?.compras ?? []
}

beforeAll(async () => {
  empresa = (await service.from("workspaces").insert({ name: `Compras B30 ${ts}` }).select("id").single()).data!.id
  admin = await criarUsuario("Admin", "admin")
  vendedor = await criarUsuario("Bruno Vendedor", "gerente")
  atendente = await criarUsuario("Ana Atendente", "atendente")
  contato = (await service.from("contacts")
    .insert({ workspace_id: empresa, name: "Cliente B30", phone_number: `55219${String(ts).slice(-8)}`, atendente_id: atendente })
    .select("id").single()).data!.id
})

afterAll(async () => {
  await service.from("contact_purchases").delete().eq("contact_id", contato)
  await service.from("contacts").delete().eq("id", contato)
  await service.from("profiles").delete().in("id", usuarios)
  for (const id of usuarios) await service.auth.admin.deleteUser(id)
  await service.from("workspaces").delete().eq("id", empresa)
})

describe("B30-01 — Compra do contato com peças, desconto, pagamento, atendente e origem", () => {
  it("CA-B30-06: compra manual só com data e valor entra com origem Manual e os demais campos vazios", async () => {
    entrarComo(admin)
    const r = await registrarCompra(contato, { data: "2026-10-01", valor: "120" })
    expect(r.erro).toBeUndefined()

    const compra = (await comprasDoContato()).find((c) => c.valor === 120)
    expect(compra).toBeDefined()
    expect(compra!.origem).toBe("manual")
    expect(compra!.pecas).toBeNull()
    expect(compra!.desconto).toBeNull()
    expect(compra!.formaPagamento).toBeNull()
    expect(compra!.atendente).toBeNull()
  })

  it("CA-B30-07: compra manual com todos os campos aparece com eles e o valor continua o digitado", async () => {
    entrarComo(admin)
    const r = await registrarCompra(contato, {
      data: "2026-10-05",
      valor: "500",
      pecas: "12",
      desconto: "30",
      formaPagamento: "pix",
      atendenteId: vendedor,
    })
    expect(r.erro).toBeUndefined()

    const compra = (await comprasDoContato()).find((c) => c.valor === 500)
    expect(compra).toBeDefined()
    expect(compra!.valor).toBe(500) // o desconto não é subtraído
    expect(compra!.pecas).toBe(12)
    expect(compra!.desconto).toBe(30)
    expect(compra!.formaPagamento).toBe("pix")
    expect(compra!.atendente).toBe("Bruno Vendedor")
    expect(compra!.origem).toBe("manual")
  })

  it("CA-B30-07: atendente de fora da empresa ou inválido é recusado pelo servidor", async () => {
    entrarComo(admin)
    const r = await registrarCompra(contato, { data: "2026-10-06", valor: "70", atendenteId: "00000000-0000-0000-0000-000000000000" })
    expect(r.erro).toBe("Atendente inválido")
    expect((await comprasDoContato()).some((c) => c.valor === 70)).toBe(false)
  })

  it("CA-B30-09: o servidor também recusa peças quebradas e desconto negativo", async () => {
    entrarComo(admin)
    expect((await registrarCompra(contato, { data: "2026-10-07", valor: "80", pecas: "2.5" })).erro).toMatch(/inteiro/)
    expect((await registrarCompra(contato, { data: "2026-10-07", valor: "80", desconto: "-10" })).erro).toMatch(/negativo/)
    expect((await comprasDoContato()).some((c) => c.valor === 80)).toBe(false)
  })

  it("CA-B30-10: usuário Atendente recebe aviso de falta de permissão e nada é gravado", async () => {
    entrarComo(atendente)
    const r = await registrarCompra(contato, { data: "2026-10-08", valor: "90", pecas: "1" })
    expect(r.erro).toBe("Sem permissão para registrar compras")

    const { data } = await service.from("contact_purchases").select("id").eq("contact_id", contato).eq("valor", 90)
    expect(data).toEqual([])
  })
})
