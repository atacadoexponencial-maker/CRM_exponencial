// @vitest-environment node
// B22-04 — "atribuir ao time" escolhe e grava a conversa numa operação só, travada
// por time (achado A6 do QA das automações, 09/10/2026). Roda a função
// atribuir_conversa_ao_time no banco real, com a service role, como o motor.

import { createClient } from "@supabase/supabase-js"
import { describe, it, expect, beforeAll, afterAll } from "vitest"

const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const ts = Date.now()
let empresa = ""
let timeVendas = ""
let timeParalelo = ""
let timeSemAtivos = ""
const pessoas: Record<string, string> = {}
let contatos = 0

async function pessoa(nome: string, status: "active" | "inactive" = "active") {
  const { data, error } = await service.auth.admin.createUser({
    email: `b22-04-${nome.toLowerCase()}-${ts}@teste.com`,
    password: "senha-segura-123",
    email_confirm: true,
  })
  if (error) throw error
  pessoas[nome] = data.user.id
  await service.from("profiles").insert({ id: data.user.id, workspace_id: empresa, name: nome, role: "atendente", status })
}

async function time(nome: string, membros: string[]) {
  const id = (await service.from("teams").insert({ workspace_id: empresa, name: nome }).select("id").single()).data!.id
  for (const m of membros) await service.from("user_teams").insert({ team_id: id, user_id: pessoas[m] })
  return id
}

/** Conversa nova, com um contato só dela. */
async function conversa(dados: { com?: string; status?: string } = {}) {
  contatos++
  const contato = (
    await service
      .from("contacts")
      .insert({ workspace_id: empresa, name: `Cliente ${contatos}`, phone_number: `5500${String(ts).slice(-7)}${String(contatos).padStart(2, "0")}` })
      .select("id")
      .single()
  ).data!.id
  const { data, error } = await service
    .from("conversations")
    .insert({
      workspace_id: empresa,
      contact_id: contato,
      assigned_to: dados.com ? pessoas[dados.com] : null,
      status: dados.status ?? "em_espera",
    })
    .select("id")
    .single()
  if (error) throw error
  return data.id as string
}

const atribuir = (timeId: string, conversaId: string | null, workspaceId = empresa) =>
  service.rpc("atribuir_conversa_ao_time", {
    p_workspace_id: workspaceId,
    p_team_id: timeId,
    p_conversation_id: conversaId as string,
  })

const lerConversa = async (id: string) =>
  (await service.from("conversations").select("assigned_to, status").eq("id", id).single()).data!

beforeAll(async () => {
  empresa = (await service.from("workspaces").insert({ name: `Atribuir ao time B22-04 ${ts}` }).select("id").single()).data!.id
  await pessoa("Ana")
  await pessoa("Bruno")
  await pessoa("Carla", "inactive")
  await pessoa("Eva")
  await pessoa("Fabio")
  timeVendas = await time("Vendas", ["Bruno", "Ana", "Carla"])
  timeParalelo = await time("Paralelo", ["Eva", "Fabio"])
  timeSemAtivos = await time("Só desativados", ["Carla"])
}, 90_000)

afterAll(async () => {
  if (!empresa) return
  await service.from("conversations").delete().eq("workspace_id", empresa)
  await service.from("contacts").delete().eq("workspace_id", empresa)
  await service.from("user_teams").delete().in("user_id", Object.values(pessoas))
  await service.from("teams").delete().eq("workspace_id", empresa)
  await service.from("profiles").delete().eq("workspace_id", empresa)
  for (const id of Object.values(pessoas)) await service.auth.admin.deleteUser(id)
  await service.from("workspaces").delete().eq("id", empresa)
}, 90_000)

// Os casos rodam em ordem e a carga de cada um conta a dos anteriores
describe("B22-04 — atribuir_conversa_ao_time", () => {
  it("conversa sem atendente, carga empatada: o primeiro pelo nome, e em espera passa a em atendimento", async () => {
    const id = await conversa()
    const { data, error } = await atribuir(timeVendas, id)
    expect(error).toBeNull()
    expect(data).toEqual([{ atendente_id: pessoas.Ana, manteve: false }])
    expect(await lerConversa(id)).toEqual({ assigned_to: pessoas.Ana, status: "em_atendimento" })
  })

  it("escolhe quem tem menos conversas abertas (Ana tem 1, Bruno 0)", async () => {
    const id = await conversa()
    expect((await atribuir(timeVendas, id)).data).toEqual([{ atendente_id: pessoas.Bruno, manteve: false }])
  })

  it("conversa já com um membro ativo do time: fica com ele, mesmo com mais carga (sem pingue-pongue)", async () => {
    await conversa({ com: "Bruno", status: "em_atendimento" })
    const id = await conversa({ com: "Bruno", status: "em_atendimento" })
    for (let i = 0; i < 3; i++) {
      expect((await atribuir(timeVendas, id)).data).toEqual([{ atendente_id: pessoas.Bruno, manteve: true }])
    }
    expect((await lerConversa(id)).assigned_to).toBe(pessoas.Bruno)
  })

  it("conversa com um membro desativado: vai para um ativo", async () => {
    const id = await conversa({ com: "Carla", status: "em_atendimento" })
    expect((await atribuir(timeVendas, id)).data).toEqual([{ atendente_id: pessoas.Ana, manteve: false }])
  })

  it("conversa com alguém de fora do time: vai para um membro", async () => {
    const id = await conversa({ com: "Eva", status: "em_atendimento" })
    const { data } = await atribuir(timeVendas, id)
    expect([pessoas.Ana, pessoas.Bruno]).toContain(data![0].atendente_id)
    expect(data![0].manteve).toBe(false)
  })

  it("conversa resolvida: troca o atendente e continua resolvida", async () => {
    const id = await conversa({ status: "resolvida" })
    await atribuir(timeVendas, id)
    expect((await lerConversa(id)).status).toBe("resolvida")
  })

  it("sem conversa: devolve a escolha e não grava nada", async () => {
    const antes = (await service.from("conversations").select("id", { count: "exact", head: true }).eq("workspace_id", empresa)).count
    const { data } = await atribuir(timeVendas, null)
    expect(data).toHaveLength(1)
    expect(data![0].manteve).toBe(false)
    const depois = (await service.from("conversations").select("id", { count: "exact", head: true }).eq("workspace_id", empresa)).count
    expect(depois).toBe(antes)
  })

  it("time só com desativados: nenhuma linha, e a conversa não muda", async () => {
    const id = await conversa()
    expect((await atribuir(timeSemAtivos, id)).data).toEqual([])
    expect(await lerConversa(id)).toEqual({ assigned_to: null, status: "em_espera" })
  })

  it("time de outra empresa: nenhuma linha", async () => {
    const outra = (await service.from("workspaces").insert({ name: `Outra B22-04 ${ts}` }).select("id").single()).data!.id
    try {
      expect((await atribuir(timeVendas, null, outra)).data).toEqual([])
    } finally {
      await service.from("workspaces").delete().eq("id", outra)
    }
  })

  it("seis leads ao mesmo tempo saem divididos, três para cada (a trava por time)", async () => {
    const ids = await Promise.all(Array.from({ length: 6 }, () => conversa()))
    const respostas = await Promise.all(ids.map((id) => atribuir(timeParalelo, id)))
    expect(respostas.every((r) => r.error === null)).toBe(true)

    const escolhidos = respostas.map((r) => r.data![0].atendente_id)
    expect(escolhidos.filter((id) => id === pessoas.Eva)).toHaveLength(3)
    expect(escolhidos.filter((id) => id === pessoas.Fabio)).toHaveLength(3)
  })

  it("só o service role chama a função", async () => {
    const anonimo = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { error } = await anonimo.rpc("atribuir_conversa_ao_time", {
      p_workspace_id: empresa,
      p_team_id: timeVendas,
      p_conversation_id: null as unknown as string,
    })
    expect(error).not.toBeNull()
  })
})
