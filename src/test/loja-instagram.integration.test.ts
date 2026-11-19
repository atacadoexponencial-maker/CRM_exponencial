// @vitest-environment node
// B61-01 — Instagram da loja: salvar, normalizar, recusar e limpar. Bate no Supabase
// real (banco de teste). Mockado só @/integrations/supabase/server (cliente autenticado
// de verdade).

import { createClient } from "@supabase/supabase-js"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

vi.mock("@/integrations/supabase/server", () => ({
  createClient: vi.fn(),
}))

import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { carregarTema, salvarAparencia } from "@/app/(auth)/catalogo/aparencia/actions"
import { carregarLojaPublica } from "@/lib/catalogo/loja-publica"
import { TEMA_PADRAO, type TemaLoja } from "@/app/loja/components/tema"

const mockSsr = vi.mocked(createSsrClient)
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const SENHA = "senha-test-123!"
const service = createClient(URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
const ts = Date.now()
const slug = `loja-ig-${ts}`
const email = `loja-ig-admin-${ts}@catalogo-test.com`
let ws = ""
let userId = ""

const temaBase: TemaLoja = { ...TEMA_PADRAO, nomeLoja: `Loja IG ${ts}` }

async function instagramNoBanco() {
  const { data } = await service.from("catalog_settings").select("instagram").eq("workspace_id", ws).single()
  return data!.instagram
}
async function instagramNaLoja() {
  const loja = await carregarLojaPublica(slug)
  expect(loja).not.toBeNull()
  return loja!.tema.instagram
}

beforeAll(async () => {
  const { data: empresa } = await service.from("workspaces").insert({ name: `Loja IG ${ts}` }).select().single()
  ws = empresa!.id
  const { data: conta } = await service.auth.admin.createUser({ email, password: SENHA, email_confirm: true })
  userId = conta.user!.id
  await service.from("profiles").insert({ id: userId, workspace_id: ws, name: "admin", role: "admin", status: "active" })
  // Loja já publicada, com o número que recebe os pedidos: é o que a vitrine exige para abrir.
  const { error } = await service.from("catalog_settings").insert({ workspace_id: ws, slug, orders_whatsapp: "5521900001111", published: true })
  if (error) throw new Error(error.message)

  const c = createClient(URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const entrada = await c.auth.signInWithPassword({ email, password: SENHA })
  if (entrada.error) throw new Error(entrada.error.message)
  mockSsr.mockResolvedValue(c as never)
}, 60_000)

afterAll(async () => {
  await service.from("catalog_settings").delete().eq("workspace_id", ws)
  if (userId) {
    await service.from("profiles").delete().eq("id", userId)
    await service.auth.admin.deleteUser(userId)
  }
  if (ws) await service.from("workspaces").delete().eq("id", ws)
})

describe("B61-01 — Instagram da loja", { timeout: 30_000 }, () => {
  it("CA-B61-50: o lojista salva o Instagram e a loja pública passa a mostrar", async () => {
    expect(await instagramNaLoja()).toBe("")
    const r = await salvarAparencia({ ...temaBase, instagram: "lojateste" })
    expect(r.erro).toBeUndefined()
    expect(r.aviso).toMatch(/Salvo/)
    expect(await instagramNaLoja()).toBe("lojateste")
    // A tela de Aparência reabre com o valor salvo.
    expect((await carregarTema())?.instagram).toBe("lojateste")
  })

  it("CA-B61-51: '@lojateste', o link do perfil e 'lojateste' guardam o mesmo perfil", async () => {
    const formas = ["@lojateste", "https://instagram.com/lojateste/", "lojateste", "  https://www.instagram.com/LojaTeste?igsh=abc  "]
    for (const forma of formas) {
      // Entre uma forma e outra, grava um perfil diferente: a igualdade abaixo é da gravação nova.
      expect((await salvarAparencia({ ...temaBase, instagram: "outroperfil" })).erro).toBeUndefined()
      expect(await instagramNoBanco()).toBe("outroperfil")
      expect((await salvarAparencia({ ...temaBase, instagram: forma })).erro, forma).toBeUndefined()
      expect(await instagramNoBanco(), forma).toBe("lojateste")
    }
  })

  it("CA-B61-52: Instagram inválido é recusado com o aviso e nada é gravado", async () => {
    expect((await salvarAparencia({ ...temaBase, instagram: "lojateste", boasVindas: "antes" })).erro).toBeUndefined()
    expect(await instagramNoBanco()).toBe("lojateste")

    const invalidos = ["loja teste!", "a".repeat(31), "loja/teste", "https://outro-site.com/lojateste"]
    for (const invalido of invalidos) {
      const r = await salvarAparencia({ ...temaBase, instagram: invalido, boasVindas: "depois" })
      expect(r.erro, invalido).toBe("Use só letras, números, ponto e sublinhado, com até 30 caracteres.")
    }
    expect((await salvarAparencia({ ...temaBase, instagram: 123 as never })).erro).toBe("Use só letras, números, ponto e sublinhado, com até 30 caracteres.")

    // Nem o Instagram nem o resto do formulário recusado foram gravados.
    const { data } = await service.from("catalog_settings").select("instagram, welcome_text").eq("workspace_id", ws).single()
    expect(data).toEqual({ instagram: "lojateste", welcome_text: "antes" })
    // O banco repete a regra para quem grava sem passar pela ação.
    const direto = await service.from("catalog_settings").update({ instagram: "Loja Teste!" }).eq("workspace_id", ws)
    expect(direto.error).not.toBeNull()
    expect(await instagramNoBanco()).toBe("lojateste")
  })

  it("CA-B61-53: limpar o campo e salvar tira o @ da loja", async () => {
    expect((await salvarAparencia({ ...temaBase, instagram: "lojateste" })).erro).toBeUndefined()
    expect(await instagramNaLoja()).toBe("lojateste")
    expect((await salvarAparencia({ ...temaBase, instagram: "   " })).erro).toBeUndefined()
    expect(await instagramNoBanco()).toBeNull()
    expect(await instagramNaLoja()).toBe("")
  })

  it("o texto de boas-vindas aceita até 300 caracteres e recusa 301", async () => {
    expect((await salvarAparencia({ ...temaBase, boasVindas: "a".repeat(300) })).erro).toBeUndefined()
    expect((await salvarAparencia({ ...temaBase, boasVindas: "a".repeat(301) })).erro).toBe("O texto de boas-vindas passa de 300 caracteres.")
  })
})
