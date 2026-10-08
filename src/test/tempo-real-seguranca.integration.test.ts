// @vitest-environment node
// B19-04 — tempo real do chat em canal fechado (auditoria de 06/10/2026). Bate no
// Realtime real do Supabase: assina como o navegador assinaria e transmite como o
// servidor transmite (transmitirMensagem).
// B21-01: a mensagem nova vai para `workspace:<id>:gestao` (Admin/Gerente) e
// `usuario:<responsável>`, não mais para o tópico da empresa toda.

import { createClient, type RealtimeChannel, type SupabaseClient } from "@supabase/supabase-js"
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { transmitirMensagem } from "@/lib/whatsapp/realtime"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const ts = Date.now()
const SENHA = "senha-segura-123"
let empresa = "", outraEmpresa = ""
const usuarios: string[] = []
const clientes: SupabaseClient[] = []

async function navegador(ws: string | null, sufixo: string, role = "atendente") {
  const client = createClient(URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  clientes.push(client)
  if (ws) {
    const email = `b19-04-${sufixo}-${ts}@teste.com`
    const { data } = await service.auth.admin.createUser({ email, password: SENHA, email_confirm: true })
    usuarios.push(data.user!.id)
    await service.from("profiles").insert({ id: data.user!.id, workspace_id: ws, name: sufixo, role })
    const { data: login } = await client.auth.signInWithPassword({ email, password: SENHA })
    await client.realtime.setAuth(login.session!.access_token)
  }
  return client
}

async function idDe(client: SupabaseClient) {
  return (await client.auth.getUser()).data.user!.id
}

/** Assina e devolve o status final da entrada e as mensagens recebidas. */
async function assinar(client: SupabaseClient, privado: boolean, topico = `workspace:${empresa}`) {
  const recebidas: unknown[] = []
  const canal: RealtimeChannel = client
    .channel(topico, { config: { private: privado } })
    .on("broadcast", { event: "nova_mensagem" }, ({ payload }) => recebidas.push(payload))
  const status = await new Promise<string>((resolve) => {
    canal.subscribe((s) => {
      if (s === "SUBSCRIBED" || s === "CHANNEL_ERROR" || s === "TIMED_OUT") resolve(s)
    })
    setTimeout(() => resolve("SEM_RESPOSTA"), 10_000)
  })
  return { canal, status, recebidas }
}

function mensagem(conteudo: string, conversationId: string = crypto.randomUUID()) {
  return {
    id: crypto.randomUUID(), conversation_id: conversationId, workspace_id: empresa,
    direction: "inbound", type: "text", content: conteudo, created_at: new Date().toISOString(), status: null,
  }
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms))

beforeAll(async () => {
  empresa = (await service.from("workspaces").insert({ name: `Tempo real B19 ${ts}` }).select("id").single()).data!.id
  outraEmpresa = (await service.from("workspaces").insert({ name: `Outra tempo real B19 ${ts}` }).select("id").single()).data!.id
}, 30_000)

afterAll(async () => {
  for (const c of clientes) await c.removeAllChannels()
  await service.from("conversations").delete().eq("workspace_id", empresa)
  await service.from("contacts").delete().eq("workspace_id", empresa)
  for (const id of usuarios) {
    await service.from("profiles").delete().eq("id", id)
    await service.auth.admin.deleteUser(id)
  }
  await service.from("workspaces").delete().in("id", [empresa, outraEmpresa])
}, 60_000)

describe("B19-04 — Tempo real do chat em canal fechado", { timeout: 40_000 }, () => {
  it("should entregar a mensagem nova à gestão e ao responsável, e a mais ninguém", async () => {
    const gerente = await assinar(await navegador(empresa, "gerente", "gerente"), true, `workspace:${empresa}:gestao`)
    const clienteResponsavel = await navegador(empresa, "responsavel")
    const responsavel = await assinar(clienteResponsavel, true, `usuario:${await idDe(clienteResponsavel)}`)
    const clienteColega = await navegador(empresa, "colega-ouvinte")
    const colega = await assinar(clienteColega, true, `usuario:${await idDe(clienteColega)}`)
    const colegaNaEmpresa = await assinar(clienteColega, true)
    const colegaNaGestao = await assinar(await navegador(empresa, "colega-gestao"), true, `workspace:${empresa}:gestao`)
    const colegaNoTopicoAlheio = await assinar(await navegador(empresa, "bisbilhoteiro"), true, `usuario:${await idDe(clienteResponsavel)}`)
    const anonimoPublico = await assinar(await navegador(null, "anonimo"), false, `workspace:${empresa}:gestao`)
    const anonimoPrivado = await assinar(await navegador(null, "anonimo2"), true, `workspace:${empresa}:gestao`)
    const intruso = await assinar(await navegador(outraEmpresa, "intruso", "gerente"), true, `workspace:${empresa}:gestao`)

    expect(gerente.status).toBe("SUBSCRIBED")
    expect(responsavel.status).toBe("SUBSCRIBED")
    expect(colega.status).toBe("SUBSCRIBED")
    expect(colegaNaGestao.status).not.toBe("SUBSCRIBED")
    expect(colegaNoTopicoAlheio.status).not.toBe("SUBSCRIBED")
    expect(anonimoPrivado.status).not.toBe("SUBSCRIBED")
    expect(intruso.status).not.toBe("SUBSCRIBED")

    const contato = (await service.from("contacts")
      .insert({ workspace_id: empresa, name: "Cliente", phone_number: `55219${String(ts).slice(-8)}` })
      .select("id").single()).data!.id
    const conversa = (await service.from("conversations")
      .insert({ workspace_id: empresa, contact_id: contato, assigned_to: await idDe(clienteResponsavel) })
      .select("id").single()).data!.id

    await transmitirMensagem(mensagem("texto sigiloso", conversa))
    await esperar(4_000)

    expect(gerente.recebidas).toHaveLength(1)
    expect(responsavel.recebidas).toHaveLength(1)
    expect(colega.recebidas).toHaveLength(0)
    expect(colegaNaEmpresa.recebidas).toHaveLength(0)
    expect(colegaNaGestao.recebidas).toHaveLength(0)
    expect(colegaNoTopicoAlheio.recebidas).toHaveLength(0)
    expect(anonimoPublico.recebidas).toHaveLength(0)
    expect(anonimoPrivado.recebidas).toHaveLength(0)
    expect(intruso.recebidas).toHaveLength(0)
  }, 120_000)

  it("should not deixar ninguém de fora injetar aviso falso no canal da empresa", async () => {
    const membro = await assinar(await navegador(empresa, "membro2"), true)
    expect(membro.status).toBe("SUBSCRIBED")

    // Anônimo transmite no canal público com o mesmo nome.
    const anonimo = await navegador(null, "injetor")
    const publico = anonimo.channel(`workspace:${empresa}`, { config: { private: false } })
    await publico.httpSend("nova_mensagem", mensagem("falsa do anônimo")).catch(() => {})

    // Usuário logado da própria empresa tenta transmitir no canal privado (não há policy de INSERT).
    const colega = await navegador(empresa, "colega")
    const privado = colega.channel(`workspace:${empresa}`, { config: { private: true } })
    await privado.httpSend("nova_mensagem", mensagem("falsa do colega")).catch(() => {})

    await esperar(4_000)
    expect(membro.recebidas).toHaveLength(0)
  })
})
