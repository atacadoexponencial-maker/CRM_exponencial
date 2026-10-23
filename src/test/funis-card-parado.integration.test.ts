// @vitest-environment node
// B41-05 — prazo de parado nas etapas dos funis da empresa: o editor grava o prazo, o
// quadro marca o card parado e a Central de Alertas mostra o "Card parado". Bate no
// Supabase real.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

vi.mock("@/integrations/supabase/server", () => ({ createClient: vi.fn() }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { criarFunil, editarEtapa, listarFunisParaGerenciar } from "@/app/(auth)/configuracoes/funis/actions"
import { listarCardsDoFunil } from "@/app/(auth)/pipeline/actions"
import { listarAlertas } from "@/app/(auth)/alertas/actions"
import { situacaoDoCard } from "@/lib/card-parado"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SENHA = "senha-test-123!"
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
const ts = Date.now()
const diasAtras = (d: number) => new Date(Date.now() - d * 86_400_000 - 3_600_000).toISOString()

let ws = ""
const usuarios: Record<string, string> = {}
const clientes: Record<string, SupabaseClient> = {}
let feira = ""
const etapa: Record<string, string> = {}
const cards: Record<string, string> = {}

async function criarPessoa(chave: string, role: string) {
  const email = `b41-05-${chave}-${ts}@funis-test.com`
  const id = (await service.auth.admin.createUser({ email, password: SENHA, email_confirm: true })).data.user!.id
  usuarios[chave] = id
  await service.from("profiles").insert({ id, workspace_id: ws, name: `Pessoa ${chave}`, role, status: "active" })
  const c = createClient(URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  await c.auth.signInWithPassword({ email, password: SENHA })
  clientes[chave] = c
}
const como = (chave: string) => vi.mocked(createSsrClient).mockResolvedValue(clientes[chave] as never)

async function cardParado(nome: string, n: number, etapaId: string, dias: number, atendente: string | null) {
  const contato = (await service.from("contacts").insert({ workspace_id: ws, name: nome, phone_number: `55619${String(ts).slice(-6)}${n}` }).select("id").single()).data!.id
  const id = (await service.from("pipeline_cards").insert({ workspace_id: ws, contact_id: contato, funil: feira, etapa: etapaId, atendente_id: atendente }).select("id").single()).data!.id
  await service.from("pipeline_cards").update({ etapa_changed_at: diasAtras(dias) }).eq("id", id)
  cards[nome] = id
}

beforeAll(async () => {
  ws = (await service.from("workspaces").insert({ name: `[TESTE] B41-05 ${ts}` }).select("id").single()).data!.id
  await criarPessoa("admin", "admin")
  await criarPessoa("ana", "atendente")
  await criarPessoa("bruno", "atendente")
  como("admin")
  feira = (await criarFunil("Feira de Março", [{ nome: "Convidado" }, { nome: "Confirmou" }])).id!
  const { data } = await service.from("funil_etapas").select("id, ordem").eq("funil_id", feira)
  const [convidado, confirmou] = [...data!].sort((a, b) => a.ordem - b.ordem)
  Object.assign(etapa, { convidado: convidado.id, confirmou: confirmou.id })
}, 120_000)

afterAll(async () => {
  await service.from("pipeline_cards").delete().eq("workspace_id", ws)
  await service.from("funis").delete().eq("workspace_id", ws)
  await service.from("contacts").delete().eq("workspace_id", ws)
  await service.from("profiles").delete().eq("workspace_id", ws)
  for (const id of Object.values(usuarios)) await service.auth.admin.deleteUser(id)
  await service.from("workspaces").delete().eq("id", ws)
}, 120_000)

const prazoGravado = async (id: string) => (await service.from("funil_etapas").select("parado_dias").eq("id", id).single()).data!.parado_dias

describe("B41-05 — Prazo de parado nos funis da empresa", { timeout: 60_000 }, () => {
  it("CA-B41-35: should gravar prazo vazio, 1 e 365, e recusar 0, 366, número quebrado e texto", async () => {
    como("admin")
    expect((await editarEtapa(etapa.confirmou, { paradoDias: "" })).erro).toBeUndefined()
    expect(await prazoGravado(etapa.confirmou)).toBeNull()
    expect((await editarEtapa(etapa.confirmou, { paradoDias: "1" })).erro).toBeUndefined()
    expect(await prazoGravado(etapa.confirmou)).toBe(1)
    expect((await editarEtapa(etapa.confirmou, { paradoDias: 365 })).erro).toBeUndefined()
    expect(await prazoGravado(etapa.confirmou)).toBe(365)

    for (const ruim of ["0", "366", "2,5", "abc", 0, 2.5]) {
      expect((await editarEtapa(etapa.confirmou, { paradoDias: ruim })).erro).toBe("O prazo vai de 1 a 365 dias.")
    }
    expect(await prazoGravado(etapa.confirmou)).toBe(365)
    // O banco também barra
    expect((await service.from("funil_etapas").update({ parado_dias: 0 }).eq("id", etapa.confirmou)).error).not.toBeNull()

    expect((await editarEtapa(etapa.confirmou, { paradoDias: "3" })).erro).toBeUndefined()
    const lista = await listarFunisParaGerenciar()
    expect(lista.funis[0].etapas.map((e) => e.paradoDias)).toEqual([null, 3])
  })

  it("CA-B41-22: should marcar parado no quadro o card que passou do prazo da etapa, e não o da etapa sem prazo", async () => {
    await cardParado("Parado em Confirmou", 1, etapa.confirmou, 4, null)
    await cardParado("Parado em Convidado", 2, etapa.convidado, 4, null)
    como("admin")
    const doQuadro = await listarCardsDoFunil(feira)
    const confirmou = doQuadro.find((c) => c.id === cards["Parado em Confirmou"])!
    const convidado = doQuadro.find((c) => c.id === cards["Parado em Convidado"])!
    expect(confirmou.limiteParadoDias).toBe(4)
    expect(situacaoDoCard(confirmou.etapaDesde!, confirmou.limiteParadoDias ?? null).parado).toBe(true)
    expect(convidado.limiteParadoDias).toBeNull()
    expect(situacaoDoCard(convidado.etapaDesde!, convidado.limiteParadoDias ?? null).parado).toBe(false)
  })

  it("CA-B41-36: should mostrar o card parado na Central de Alertas, e ao Atendente só se o card for dele", async () => {
    await cardParado("Card da Ana", 3, etapa.confirmou, 5, usuarios.ana)
    como("admin")
    const doAdmin = (await listarAlertas())!.alertas.filter((a) => a.tipo === "card_parado")
    const daAna = doAdmin.find((a) => a.cardId === cards["Card da Ana"])!
    expect(daAna).toMatchObject({ tipoLabel: "Card parado", etapaLabel: "Feira de Março · Confirmou", diasSemAtividade: 5, contatoNome: "Card da Ana" })
    expect(doAdmin.map((a) => a.cardId)).toContain(cards["Parado em Confirmou"])
    expect(doAdmin.map((a) => a.cardId)).not.toContain(cards["Parado em Convidado"])

    como("ana")
    expect((await listarAlertas())!.alertas.filter((a) => a.tipo === "card_parado").map((a) => a.cardId)).toEqual([cards["Card da Ana"]])
    como("bruno")
    expect((await listarAlertas())!.alertas.filter((a) => a.tipo === "card_parado")).toEqual([])
  })
})
