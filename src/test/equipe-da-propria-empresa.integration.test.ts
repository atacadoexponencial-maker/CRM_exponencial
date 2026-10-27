// @vitest-environment node
// B44-02 — times e papéis só da própria empresa, com o papel Admin e o dono protegido
// (auditoria de 27/10/2026). Bate no Supabase real; o client SSR é trocado pelo
// "navegador" de quem está agindo.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest"

let clienteDaVez: SupabaseClient
vi.mock("@/integrations/supabase/server", () => ({ createClient: async () => clienteDaVez }))

import {
  adicionarUsuario,
  desativarUsuario,
  editarPapel,
  gerenciarTimes,
  listarUsuarios,
  type Papel,
} from "@/app/(auth)/configuracoes/usuarios/actions"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const ts = Date.now()
const SENHA = "senha-segura-123"
const DONO_PROTEGIDO = { erro: "O dono da empresa não pode ser alterado" }
const RECUSA_DE_TIMES = { erro: "Usuário ou time não encontrado nesta empresa." }

let empresaA = "", empresaB = ""
let dono = "", segundoAdmin = "", gerente = "", atendente = "", usuarioB = ""
let timeA1 = "", timeA2 = "", timeB = ""
const usuarios: string[] = []
const navegadores: Record<string, SupabaseClient> = {}

async function criarUsuario(empresa: string, nome: string, role: Papel) {
  const email = `b44-02-${nome}-${ts}@teste.com`
  const id = (await service.auth.admin.createUser({ email, password: SENHA, email_confirm: true })).data.user!.id
  usuarios.push(id)
  await service.from("profiles").insert({ id, workspace_id: empresa, name: nome, role })
  const navegador = createClient(URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  await navegador.auth.signInWithPassword({ email, password: SENHA })
  navegadores[id] = navegador
  return id
}

const comoUsuario = (id: string) => { clienteDaVez = navegadores[id] }
const timesDe = async (usuario: string) =>
  ((await service.from("user_teams").select("team_id").eq("user_id", usuario)).data ?? []).map((v) => v.team_id).sort()
const perfilDe = async (usuario: string) =>
  (await service.from("profiles").select("role, status").eq("id", usuario).single()).data

beforeAll(async () => {
  empresaA = (await service.from("workspaces").insert({ name: `[TESTE] B44-02 A ${ts}` }).select("id").single()).data!.id
  empresaB = (await service.from("workspaces").insert({ name: `[TESTE] B44-02 B ${ts}` }).select("id").single()).data!.id
  dono = await criarUsuario(empresaA, "dono", "admin")
  await service.from("workspaces").update({ dono_id: dono }).eq("id", empresaA)
  segundoAdmin = await criarUsuario(empresaA, "segundo-admin", "admin")
  gerente = await criarUsuario(empresaA, "gerente", "gerente")
  atendente = await criarUsuario(empresaA, "atendente", "atendente")
  usuarioB = await criarUsuario(empresaB, "usuario-b", "atendente")
  timeA1 = (await service.from("teams").insert({ workspace_id: empresaA, name: `A1 ${ts}` }).select("id").single()).data!.id
  timeA2 = (await service.from("teams").insert({ workspace_id: empresaA, name: `A2 ${ts}` }).select("id").single()).data!.id
  timeB = (await service.from("teams").insert({ workspace_id: empresaB, name: `B ${ts}` }).select("id").single()).data!.id
  await service.from("user_teams").insert([{ user_id: usuarioB, team_id: timeB }, { user_id: atendente, team_id: timeA1 }])
}, 90_000)

afterAll(async () => {
  const { data: perfis } = await service.from("profiles").select("id").in("workspace_id", [empresaA, empresaB])
  const todos = [...new Set([...usuarios, ...(perfis ?? []).map((p) => p.id)])]
  await service.from("user_teams").delete().in("user_id", todos)
  await service.from("workspaces").update({ dono_id: null }).eq("id", empresaA)
  await service.from("teams").delete().in("workspace_id", [empresaA, empresaB])
  for (const id of todos) {
    await service.from("profiles").delete().eq("id", id)
    await service.auth.admin.deleteUser(id)
  }
  await service.from("workspaces").delete().in("id", [empresaA, empresaB])
}, 90_000)

describe("B44-02 — Times e papéis só da própria empresa", { timeout: 30_000 }, () => {
  it("CA-B44-05: should recusar pôr o usuário de outra empresa em time, de A ou de B", async () => {
    comoUsuario(dono)
    expect(await gerenciarTimes(usuarioB, [timeA1])).toEqual(RECUSA_DE_TIMES)
    expect(await gerenciarTimes(usuarioB, [timeB])).toEqual(RECUSA_DE_TIMES)
    expect(await timesDe(usuarioB)).toEqual([timeB])
  })

  it("CA-B44-06: should recusar pôr usuário da própria empresa em time de outra empresa", async () => {
    comoUsuario(dono)
    expect(await gerenciarTimes(atendente, [timeB])).toEqual(RECUSA_DE_TIMES)
    expect(await timesDe(atendente)).toEqual([timeA1])
    const { data: vinculosB } = await service.from("user_teams").select("user_id").eq("team_id", timeB)
    expect((vinculosB ?? []).map((v) => v.user_id)).toEqual([usuarioB])
  })

  it("CA-B44-07: should trocar os times de alguém da própria empresa", async () => {
    comoUsuario(dono)
    expect(await gerenciarTimes(atendente, [timeA2])).toEqual({})
    expect(await timesDe(atendente)).toEqual([timeA2])
  })

  it("CA-B44-08: should promover um Gerente a Admin, que passa a usar o que só o Admin usa", async () => {
    comoUsuario(dono)
    expect(await editarPapel(gerente, "admin")).toEqual({})
    const lista = await listarUsuarios()
    expect(lista.find((u) => u.id === gerente)?.role).toBe("admin")

    comoUsuario(gerente)
    expect(await gerenciarTimes(atendente, [timeA1])).toEqual({})
    expect(await timesDe(atendente)).toEqual([timeA1])
  })

  it("CA-B44-09: should cadastrar uma pessoa já como Admin", async () => {
    comoUsuario(dono)
    const email = `b44-02-novo-admin-${ts}@teste.com`
    expect(await adicionarUsuario({ nome: "Novo Admin", email, senha: SENHA, papel: "admin", times: [] })).toEqual({})
    const novo = (await listarUsuarios()).find((u) => u.email === email)
    expect(novo?.role).toBe("admin")
    const { data: perfil } = await service.from("profiles").select("workspace_id").eq("id", novo!.id).single()
    expect(perfil?.workspace_id).toBe(empresaA)
  })

  it("CA-B44-10: should recusar papel que não existe, na edição e no cadastro", async () => {
    comoUsuario(dono)
    expect(await editarPapel(atendente, "dono" as Papel)).toEqual({ erro: "Papel inválido" })
    expect((await perfilDe(atendente))?.role).toBe("atendente")

    const email = `b44-02-papel-invalido-${ts}@teste.com`
    expect(await adicionarUsuario({ nome: "Papel invalido", email, senha: SENHA, papel: "dono" as Papel, times: [] }))
      .toEqual({ erro: "Papel inválido" })
    expect((await listarUsuarios()).some((u) => u.email === email)).toBe(false)
  })

  it("CA-B44-43: should impedir que outro Admin rebaixe ou desative o dono", async () => {
    comoUsuario(segundoAdmin)
    expect(await editarPapel(dono, "gerente")).toEqual(DONO_PROTEGIDO)
    expect(await desativarUsuario(dono)).toEqual(DONO_PROTEGIDO)
    expect(await perfilDe(dono)).toEqual({ role: "admin", status: "active" })
  })

  it("CA-B44-44: should deixar o dono rebaixar e desativar outro Admin", async () => {
    comoUsuario(dono)
    expect(await editarPapel(segundoAdmin, "gerente")).toEqual({})
    expect((await listarUsuarios()).find((u) => u.id === segundoAdmin)?.role).toBe("gerente")

    expect(await desativarUsuario(segundoAdmin)).toEqual({})
    expect((await listarUsuarios()).find((u) => u.id === segundoAdmin)?.status).toBe("inactive")
  })
})
