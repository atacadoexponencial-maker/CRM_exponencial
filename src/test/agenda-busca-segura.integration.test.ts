// @vitest-environment node
// B44-10 — a busca de contato da Agenda aceita vírgula, parênteses e aspas, sem
// trazer contato que o atendente não pode ver (auditoria de 27/10/2026). Bate no
// Supabase real; o client SSR é trocado pelo navegador do atendente.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest"

let clienteDaVez: SupabaseClient
vi.mock("@/integrations/supabase/server", () => ({ createClient: async () => clienteDaVez }))

import { buscarContatosParaFollowUp } from "@/app/(auth)/agenda/actions"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const ts = Date.now()
const SENHA = "senha-segura-123"
const NOME = `Ana (loja ${ts}), "centro"`
let empresa = "", ana = "", bia = "", contatoDaAna = "", contatoDaBia = ""
const usuarios: string[] = []

async function criarAtendente(nome: string) {
  const email = `b44-10-${nome}-${ts}@teste.com`
  const id = (await service.auth.admin.createUser({ email, password: SENHA, email_confirm: true })).data.user!.id
  usuarios.push(id)
  await service.from("profiles").insert({ id, workspace_id: empresa, name: nome, role: "atendente" })
  return { id, email }
}

beforeAll(async () => {
  empresa = (await service.from("workspaces").insert({ name: `[TESTE] B44-10 ${ts}` }).select("id").single()).data!.id
  const contaDaAna = await criarAtendente("ana")
  ana = contaDaAna.id
  bia = (await criarAtendente("bia")).id
  // Atendente vê o contato de que é dono (pode_ver_contato); B45-02: o dono do contato
  // é o mesmo responsável da conversa.
  contatoDaAna = (await service.from("contacts").insert({ workspace_id: empresa, name: NOME, phone_number: `55219${String(ts).slice(-8)}`, atendente_id: ana }).select("id").single()).data!.id
  contatoDaBia = (await service.from("contacts").insert({ workspace_id: empresa, name: `${NOME} da Bia`, phone_number: `55319${String(ts).slice(-8)}`, atendente_id: bia }).select("id").single()).data!.id
  await service.from("conversations").insert([
    { workspace_id: empresa, contact_id: contatoDaAna, assigned_to: ana },
    { workspace_id: empresa, contact_id: contatoDaBia, assigned_to: bia },
  ])
  clienteDaVez = createClient(URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  await clienteDaVez.auth.signInWithPassword({ email: contaDaAna.email, password: SENHA })
}, 60_000)

afterAll(async () => {
  await service.from("conversations").delete().eq("workspace_id", empresa)
  await service.from("contacts").delete().eq("workspace_id", empresa)
  for (const id of usuarios) {
    await service.from("profiles").delete().eq("id", id)
    await service.auth.admin.deleteUser(id)
  }
  await service.from("workspaces").delete().eq("id", empresa)
}, 60_000)

describe("B44-10 — Busca da Agenda segura", { timeout: 30_000 }, () => {
  it("CA-B44-36: should achar o contato com vírgula, parênteses e aspas no nome, sem trazer o que não pode ver", async () => {
    const achados = await buscarContatosParaFollowUp(NOME)
    expect(achados).toEqual([{ id: contatoDaAna, nome: NOME }])

    // Termo que bate com os dois nomes: a Ana continua sem ver o contato da Bia.
    const tambem = await buscarContatosParaFollowUp(`loja ${ts}), "centro`)
    expect(tambem.map((c) => c.id)).toEqual([contatoDaAna])
  })
})
