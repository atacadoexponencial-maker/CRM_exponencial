// @vitest-environment node
// B52-02 — Criar a senha nova pelo link. Bate no banco de teste.
// Mockado só o cliente SSR: cada teste recebe um cliente comum, que faz o papel do
// navegador de quem abriu o link (é nele que a sessão nova fica).

import { createHash, randomBytes } from "node:crypto"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest"

vi.mock("@/integrations/supabase/server", () => ({ createClient: vi.fn() }))

import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { salvarSenhaNova } from "@/app/redefinir-senha/actions"
import { linkDeSenhaNovaValido } from "@/lib/senha-nova"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const cliente = () => createClient(URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
const ts = Date.now()
const SENHA_ANTIGA = "senha-antiga-b52"
const SENHA_NOVA = "senha-nova-b52-02"
let workspaceId = ""
const usuarios: string[] = []
let navegador: SupabaseClient

async function novaConta(sufixo: string) {
  const email = `b52-02-${sufixo}-${ts}@teste.com`
  const { data } = await service.auth.admin.createUser({ email, password: SENHA_ANTIGA, email_confirm: true })
  usuarios.push(data.user!.id)
  await service.from("profiles").insert({ id: data.user!.id, workspace_id: workspaceId, name: sufixo, role: "atendente", status: "active" })
  return { id: data.user!.id, email }
}

/** Grava um link como o pedido da B52-01 grava, e devolve o código do e-mail. */
async function link(userId: string, extra: Record<string, unknown> = {}) {
  const codigo = randomBytes(32).toString("base64url")
  const token_hash = createHash("sha256").update(codigo).digest("hex")
  await service.from("redefinicoes_de_senha").insert({ user_id: userId, token_hash, expira_em: new Date(Date.now() + 3_600_000).toISOString(), ...extra })
  return codigo
}

const situacao = async (codigo: string) =>
  (await service.from("redefinicoes_de_senha").select("usado_em, cancelado_em").eq("token_hash", createHash("sha256").update(codigo).digest("hex")).single()).data!
const entra = async (email: string, senha: string) => !(await cliente().auth.signInWithPassword({ email, password: senha })).error

beforeAll(async () => {
  workspaceId = (await service.from("workspaces").insert({ name: `[TESTE] B52-02 ${ts}` }).select("id").single()).data!.id
}, 60_000)

beforeEach(() => {
  navegador = cliente()
  vi.mocked(createSsrClient).mockResolvedValue(navegador as never)
})

afterAll(async () => {
  await service.from("profiles").delete().eq("workspace_id", workspaceId)
  for (const id of usuarios) await service.auth.admin.deleteUser(id)
  await service.from("workspaces").delete().eq("id", workspaceId)
}, 60_000)

describe("B52-02 — Criar a senha nova pelo link", { timeout: 60_000 }, () => {
  it("CA-B52-08: should conferir o link duas vezes sem gastar, e ele continuar valendo para salvar", async () => {
    const conta = await novaConta("abre-duas")
    const codigo = await link(conta.id)

    expect(await linkDeSenhaNovaValido(codigo)).toBe(true)
    expect(await linkDeSenhaNovaValido(codigo)).toBe(true)
    expect(await situacao(codigo)).toEqual({ usado_em: null, cancelado_em: null })
    expect(await salvarSenhaNova({ codigo, senha: SENHA_NOVA, confirmarSenha: SENHA_NOVA })).toEqual({ ok: true })
  })

  it("CA-B52-09: should trocar a senha e deixar quem salvou já logado", async () => {
    const conta = await novaConta("entra")
    const codigo = await link(conta.id)

    expect(await salvarSenhaNova({ codigo, senha: SENHA_NOVA, confirmarSenha: SENHA_NOVA })).toEqual({ ok: true })
    const { data } = await navegador.auth.getUser()
    expect(data.user?.id).toBe(conta.id)
    expect(await entra(conta.email, SENHA_ANTIGA)).toBe(false)
    expect(await entra(conta.email, SENHA_NOVA)).toBe(true)
    expect((await situacao(codigo)).usado_em).not.toBeNull()
  })

  it("CA-B52-10: should encerrar a sessão aberta em outro aparelho", async () => {
    const conta = await novaConta("outro-aparelho")
    const outro = cliente()
    expect((await outro.auth.signInWithPassword({ email: conta.email, password: SENHA_ANTIGA })).error).toBeNull()
    expect((await outro.auth.getUser()).data.user?.id).toBe(conta.id)

    expect(await salvarSenhaNova({ codigo: await link(conta.id), senha: SENHA_NOVA, confirmarSenha: SENHA_NOVA })).toEqual({ ok: true })

    expect((await outro.auth.getUser()).error).not.toBeNull()
    expect((await outro.auth.refreshSession()).error).not.toBeNull()
    // A sessão de quem salvou continua
    expect((await navegador.auth.getUser()).data.user?.id).toBe(conta.id)
  })

  it("CA-B52-11: should não valer nem salvar link vencido, usado, derrubado ou inventado, sem mudar a senha", async () => {
    const conta = await novaConta("nao-vale")
    const agora = new Date().toISOString()
    const codigos = [
      await link(conta.id, { expira_em: new Date(Date.now() - 1000).toISOString() }),
      await link(conta.id, { usado_em: agora }),
      await link(conta.id, { cancelado_em: agora }),
      "codigo-que-nao-existe",
    ]
    for (const codigo of codigos) {
      expect(await linkDeSenhaNovaValido(codigo)).toBe(false)
      expect(await salvarSenhaNova({ codigo, senha: SENHA_NOVA, confirmarSenha: SENHA_NOVA })).toEqual({ erro: "link_invalido" })
    }
    expect(await entra(conta.email, SENHA_ANTIGA)).toBe(true)
  })

  it("CA-B52-12: should recusar senha curta ou confirmação diferente sem gastar o link nem mudar a senha", async () => {
    const conta = await novaConta("senha-invalida")
    const codigo = await link(conta.id)

    expect(await salvarSenhaNova({ codigo, senha: "curta", confirmarSenha: "curta" })).toEqual({ erro: "senha_curta" })
    expect(await salvarSenhaNova({ codigo, senha: SENHA_NOVA, confirmarSenha: "outra-senha-123" })).toEqual({ erro: "senhas_diferentes" })
    expect(await situacao(codigo)).toEqual({ usado_em: null, cancelado_em: null })
    expect(await linkDeSenhaNovaValido(codigo)).toBe(true)
    expect(await entra(conta.email, SENHA_ANTIGA)).toBe(true)
  })

  it("CA-B52-13: should não salvar pela conta desativada depois do pedido", async () => {
    const conta = await novaConta("desativada")
    const codigo = await link(conta.id)
    await service.from("profiles").update({ status: "inactive" }).eq("id", conta.id)

    expect(await linkDeSenhaNovaValido(codigo)).toBe(false)
    expect(await salvarSenhaNova({ codigo, senha: SENHA_NOVA, confirmarSenha: SENHA_NOVA })).toEqual({ erro: "link_invalido" })
    expect((await situacao(codigo)).usado_em).toBeNull()

    // Reativada, a senha de antes ainda é a que vale
    await service.from("profiles").update({ status: "active" }).eq("id", conta.id)
    expect(await entra(conta.email, SENHA_ANTIGA)).toBe(true)
  })
})
