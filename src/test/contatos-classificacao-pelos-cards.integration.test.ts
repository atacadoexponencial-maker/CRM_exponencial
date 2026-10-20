// @vitest-environment node
// QA A3 (06/10/2026) — contacts.classificacao acompanha os cards do contato, pelo
// gatilho do banco (migration 20261020000002). Antes, nada gravava a coluna: a
// lista de Contatos mostrava "Sem histórico" e os filtros por classificação não
// funcionavam. Bate no Supabase real, pela chave de serviço.

import { createClient } from "@supabase/supabase-js"
import { describe, it, expect, beforeAll, afterAll } from "vitest"

const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const ts = Date.now()
let ws = ""
let contato = ""

async function classificacao() {
  const { data } = await service.from("contacts").select("classificacao").eq("id", contato).single()
  return data?.classificacao
}

beforeAll(async () => {
  ws = (await service.from("workspaces").insert({ name: `[TESTE] Classificação ${ts}` }).select().single()).data!.id
  contato = (await service.from("contacts").insert({ workspace_id: ws, phone_number: `55119${String(ts).slice(-8)}`, name: "Cliente" }).select("id").single()).data!.id
}, 30_000)

afterAll(async () => {
  await service.from("pipeline_cards").delete().eq("workspace_id", ws)
  await service.from("contacts").delete().eq("workspace_id", ws)
  await service.from("workspaces").delete().eq("id", ws)
})

describe("QA A3 — classificação do contato gravada pelos cards", { timeout: 30_000 }, () => {
  it("sem card: sem_historico; card na Entrada: lead", async () => {
    expect(await classificacao()).toBe("sem_historico")
    const { error } = await service.from("pipeline_cards").insert({ workspace_id: ws, contact_id: contato, funil: "entrada", etapa: "lead" })
    expect(error).toBeNull()
    expect(await classificacao()).toBe("lead")
  })

  it("card na Recompra manda: onboarding → ativo, ativos_ri → em_risco, inativos → inativo, perdidos → perdido", async () => {
    const { data: card } = await service
      .from("pipeline_cards")
      .insert({ workspace_id: ws, contact_id: contato, funil: "recompra", etapa: "onboarding" })
      .select("id")
      .single()
    expect(await classificacao()).toBe("ativo")
    await service.from("pipeline_cards").update({ etapa: "ativos_ri" }).eq("id", card!.id)
    expect(await classificacao()).toBe("em_risco")
    await service.from("pipeline_cards").update({ etapa: "inativos" }).eq("id", card!.id)
    expect(await classificacao()).toBe("inativo")
    await service.from("pipeline_cards").update({ etapa: "perdidos" }).eq("id", card!.id)
    expect(await classificacao()).toBe("perdido")
  })

  it("apagar o card da Recompra volta para lead; apagar o da Entrada, para sem_historico", async () => {
    await service.from("pipeline_cards").delete().eq("workspace_id", ws).eq("funil", "recompra")
    expect(await classificacao()).toBe("lead")
    await service.from("pipeline_cards").delete().eq("workspace_id", ws)
    expect(await classificacao()).toBe("sem_historico")
  })
})
