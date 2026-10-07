// @vitest-environment node
// B20-05 — freio de tentativas no cadastro e no login (auditoria de 06/10/2026). Bate no
// Supabase real. Para não criar 5 empresas de verdade nem gastar o limite do Supabase
// Auth, o "passado" (tentativas anteriores) é gravado direto na tabela de tentativas.

import { createClient } from "@supabase/supabase-js"
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest"

let ipDaVez = ""
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": ipDaVez }) }))
vi.mock("@/integrations/supabase/server", async () => {
  const { createClient } = await import("@supabase/supabase-js")
  return {
    createClient: async () =>
      createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
      }),
  }
})

import { cadastrarEmpresa } from "@/app/cadastro/actions"
import { realizarLogin } from "@/app/login/actions"
import { AVISO_MUITAS_TENTATIVAS } from "@/app/login/avisos"
import { chaveDoEmail, chaveDoIp } from "@/lib/limite-de-tentativas"

const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const ts = Date.now()
const SENHA = "senha-segura-123"
const emailUsuario = `b20-05-usuario-${ts}@teste.com`
let empresa = "", usuario = ""
const chavesUsadas: string[] = []

async function passado(tipo: "cadastro" | "login", chave: string, quantas: number) {
  chavesUsadas.push(chave)
  await service.from("tentativas_de_acesso").insert(Array.from({ length: quantas }, () => ({ tipo, chave })))
}

async function contar(tipo: string, chave: string) {
  const { count } = await service.from("tentativas_de_acesso").select("id", { count: "exact", head: true }).eq("tipo", tipo).eq("chave", chave)
  return count ?? 0
}

beforeAll(async () => {
  empresa = (await service.from("workspaces").insert({ name: `Limite B20 ${ts}` }).select("id").single()).data!.id
  usuario = (await service.auth.admin.createUser({ email: emailUsuario, password: SENHA, email_confirm: true })).data.user!.id
  await service.from("profiles").insert({ id: usuario, workspace_id: empresa, name: "Usuário", role: "admin" })
}, 30_000)

afterAll(async () => {
  for (const chave of chavesUsadas) await service.from("tentativas_de_acesso").delete().eq("chave", chave)
  await service.from("profiles").delete().eq("id", usuario)
  await service.auth.admin.deleteUser(usuario)
  await service.from("workspaces").delete().eq("id", empresa)
}, 30_000)

describe("B20-05 — Freio de tentativas no cadastro e no login", { timeout: 30_000 }, () => {
  it("should reject o 6º cadastro na mesma hora pelo mesmo endereço, sem criar nada", async () => {
    ipDaVez = `ip-cadastro-${ts}`
    await passado("cadastro", chaveDoIp(ipDaVez), 5)

    const nomeEmpresa = `Robô B20 ${ts}`
    const r = await cadastrarEmpresa({
      nomeEmpresa, nomeResponsavel: "Robô", email: `b20-05-robo-${ts}@teste.com`, senha: SENHA, confirmarSenha: SENHA,
    })
    expect(r).toEqual({ erro: "limite" })
    const { count } = await service.from("workspaces").select("id", { count: "exact", head: true }).eq("name", nomeEmpresa)
    expect(count).toBe(0)
  })

  it("should reject a 11ª tentativa no mesmo e-mail mesmo com a senha certa", async () => {
    ipDaVez = `ip-login-email-${ts}`
    chavesUsadas.push(chaveDoIp(ipDaVez))
    await passado("login", chaveDoEmail(emailUsuario), 10)

    expect(await realizarLogin(emailUsuario, SENHA)).toEqual({ erro: AVISO_MUITAS_TENTATIVAS })
  })

  it("should reject login a partir de 30 erros do mesmo endereço, para qualquer e-mail", async () => {
    ipDaVez = `ip-login-ip-${ts}`
    await passado("login", chaveDoIp(ipDaVez), 30)

    expect(await realizarLogin(`b20-05-qualquer-${ts}@teste.com`, "errada-123")).toEqual({ erro: AVISO_MUITAS_TENTATIVAS })
  })

  it("should contar senha errada no e-mail e no endereço, e não contar o login certo", async () => {
    ipDaVez = `ip-login-conta-${ts}`
    const email = `b20-05-conta-${ts}@teste.com`
    chavesUsadas.push(chaveDoEmail(email), chaveDoIp(ipDaVez))

    expect(await realizarLogin(email, "senha-errada-1")).toEqual({ erro: "E-mail ou senha incorretos" })
    expect(await contar("login", chaveDoEmail(email))).toBe(1)
    expect(await contar("login", chaveDoIp(ipDaVez))).toBe(1)

    chavesUsadas.push(chaveDoEmail(emailUsuario))
    const antes = await contar("login", chaveDoEmail(emailUsuario))
    await realizarLogin(emailUsuario, SENHA).catch(() => {}) // acerto termina em redirect
    expect(await contar("login", chaveDoEmail(emailUsuario))).toBe(antes)
  })

  it("should guardar só o hash, nunca o e-mail ou o IP em claro", () => {
    expect(chaveDoEmail(emailUsuario)).toMatch(/^[0-9a-f]{64}$/)
    expect(chaveDoEmail(` ${emailUsuario.toUpperCase()} `)).toBe(chaveDoEmail(emailUsuario))
    expect(chaveDoIp("1.2.3.4")).not.toContain("1.2.3.4")
  })
})
