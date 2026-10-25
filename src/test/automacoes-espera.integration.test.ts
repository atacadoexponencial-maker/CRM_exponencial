// @vitest-environment node
// B28-02 — duas chamadas do relógio ao mesmo tempo não seguem a mesma espera. Roda
// `reivindicar_esperas_vencidas` contra o banco real: a trava (`for update skip
// locked`) é do Postgres, e um banco falso não a confere. Grava com a service role,
// numa empresa criada só para o teste, e a função só olha essa empresa.

import { createClient } from "@supabase/supabase-js"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const ts = Date.now()
let workspaceId = ""
let execucaoId = ""

beforeAll(async () => {
  workspaceId = (await service.from("workspaces").insert({ name: `Espera B28-02 ${ts}` }).select("id").single()).data!.id
  const { data, error } = await service
    .from("automation_runs")
    .insert({
      workspace_id: workspaceId,
      regra_id: crypto.randomUUID(),
      regra_origem: "fluxo",
      regra_nome: "Espera B28-02",
      evento: { tipo: "conversa_criada" },
      resultado: "esperando",
      caminho: [],
      gatilho: { tipo: "conversa_criada", workspaceId },
      // Vencida há um minuto
      retomar_em: new Date(Date.now() - 60_000).toISOString(),
    } as never)
    .select("id")
    .single()
  if (error) throw error
  execucaoId = (data as { id: string }).id
}, 60_000)

afterAll(async () => {
  if (!workspaceId) return
  await service.from("automation_runs").delete().eq("workspace_id", workspaceId)
  await service.from("workspaces").delete().eq("id", workspaceId)
}, 60_000)

describe("B28-02 — reivindicar esperas vencidas", () => {
  it("CA-B28-25: duas chamadas juntas entregam a espera vencida uma vez só", async () => {
    const reivindicar = () =>
      service.rpc("reivindicar_esperas_vencidas" as never, { p_limite: 10, p_workspace_id: workspaceId } as never)
    const [primeira, segunda] = await Promise.all([reivindicar(), reivindicar()])
    expect(primeira.error).toBeNull()
    expect(segunda.error).toBeNull()

    const entregues = [...((primeira.data ?? []) as Array<{ id: string }>), ...((segunda.data ?? []) as Array<{ id: string }>)]
    expect(entregues.map((e) => e.id)).toEqual([execucaoId])

    // Uma terceira chamada também não a entrega de novo
    const terceira = await reivindicar()
    expect(terceira.data).toEqual([])
  })
})
