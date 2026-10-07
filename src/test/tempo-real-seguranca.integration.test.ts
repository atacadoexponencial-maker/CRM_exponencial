// @vitest-environment node
// B19-04 — tempo real do chat em canal fechado (auditoria de 06/10/2026). Bate no
// Realtime real do Supabase: assina como o navegador assinaria e transmite como o
// servidor transmite (transmitirMensagem).

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

async function navegador(ws: string | null, sufixo: string) {
  const client = createClient(URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  clientes.push(client)
  if (ws) {
    const email = `b19-04-${sufixo}-${ts}@teste.com`
    const { data } = await service.auth.admin.createUser({ email, password: SENHA, email_confirm: true })
    usuarios.push(data.user!.id)
    await service.from("profiles").insert({ id: data.user!.id, workspace_id: ws, name: sufixo, role: "atendente" })
    const { data: login } = await client.auth.signInWithPassword({ email, password: SENHA })
    await client.realtime.setAuth(login.session!.access_token)
  }
  return client
}

/** Assina e devolve o status final da entrada e as mensagens recebidas. */
async function assinar(client: SupabaseClient, privado: boolean) {
  const recebidas: unknown[] = []
  const canal: RealtimeChannel = client
    .channel(`workspace:${empresa}`, { config: { private: privado } })
    .on("broadcast", { event: "nova_mensagem" }, ({ payload }) => recebidas.push(payload))
  const status = await new Promise<string>((resolve) => {
    canal.subscribe((s) => {
      if (s === "SUBSCRIBED" || s === "CHANNEL_ERROR" || s === "TIMED_OUT") resolve(s)
    })
    setTimeout(() => resolve("SEM_RESPOSTA"), 10_000)
  })
  return { canal, status, recebidas }
}

function mensagem(conteudo: string) {
  return {
    id: crypto.randomUUID(), conversation_id: crypto.randomUUID(), workspace_id: empresa,
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
  for (const id of usuarios) {
    await service.from("profiles").delete().eq("id", id)
    await service.auth.admin.deleteUser(id)
  }
  await service.from("workspaces").delete().in("id", [empresa, outraEmpresa])
}, 60_000)

describe("B19-04 — Tempo real do chat em canal fechado", { timeout: 40_000 }, () => {
  it("should entregar a mensagem nova a quem é da empresa, e não a anônimo nem a outra empresa", async () => {
    const membro = await assinar(await navegador(empresa, "membro"), true)
    const anonimoPublico = await assinar(await navegador(null, "anonimo"), false)
    const anonimoPrivado = await assinar(await navegador(null, "anonimo2"), true)
    const intruso = await assinar(await navegador(outraEmpresa, "intruso"), true)

    expect(membro.status).toBe("SUBSCRIBED")
    expect(anonimoPrivado.status).not.toBe("SUBSCRIBED")
    expect(intruso.status).not.toBe("SUBSCRIBED")

    await transmitirMensagem(mensagem("texto sigiloso"))
    await esperar(4_000)

    expect(membro.recebidas).toHaveLength(1)
    expect(anonimoPublico.recebidas).toHaveLength(0)
    expect(anonimoPrivado.recebidas).toHaveLength(0)
    expect(intruso.recebidas).toHaveLength(0)
  })

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
