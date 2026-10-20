// B29-02 — a foto de perfil e a lixeira: restaurar não mexe na foto; apagar de vez
// leva a cópia junto. O banco e o storage são falsos.

import { describe, it, expect, vi } from "vitest"

vi.mock("@/integrations/supabase/service", () => ({ createServiceClient: vi.fn() }))
vi.mock("@/lib/whatsapp/realtime", () => ({ transmitirContatoRestaurado: vi.fn().mockResolvedValue(undefined) }))

import { apagarDaLixeira, tirarDaLixeira } from "@/lib/lixeira"
import type { createServiceClient } from "@/integrations/supabase/service"

function bancoFalso() {
  const updates: Array<Record<string, unknown>> = []
  const removidos: Array<{ bucket: string; caminhos: string[] }> = []
  const rpcs: string[] = []
  const svc = {
    from: vi.fn((tabela: string) => {
      const obj: Record<string, unknown> = {}
      for (const m of ["select", "eq", "not", "in", "neq"]) obj[m] = vi.fn(() => obj)
      obj.update = vi.fn((linha: Record<string, unknown>) => { updates.push(linha); return obj })
      obj.then = (r: (v: unknown) => void) => Promise.resolve({ data: tabela === "contacts" ? [{ id: "c1" }] : [], error: null }).then(r)
      return obj
    }),
    rpc: vi.fn(async (nome: string) => { rpcs.push(nome); return { data: true, error: null } }),
    storage: { from: vi.fn((bucket: string) => ({ remove: vi.fn(async (caminhos: string[]) => { removidos.push({ bucket, caminhos }); return { error: null } }) })) },
  }
  return { svc: svc as unknown as ReturnType<typeof createServiceClient>, updates, removidos, rpcs }
}

describe("B29-02 — foto de perfil na lixeira", () => {
  it("CA-B29-11: apagar de vez remove a cópia da foto do bucket, antes dos dados", async () => {
    const b = bancoFalso()

    expect(await apagarDaLixeira(b.svc, "ws-1", "c1")).toBe(true)

    expect(b.removidos).toContainEqual({ bucket: "contact-photos", caminhos: ["ws-1/c1.jpg"] })
    expect(b.rpcs).toEqual(["apagar_contato_de_vez"])
  })

  it("CA-B29-11: restaurar não toca em photo_path nem em photo_checked_at", async () => {
    const b = bancoFalso()

    expect(await tirarDaLixeira(b.svc, "ws-1", "c1")).toBe(true)

    expect(b.updates).toEqual([{ excluido_em: null, excluido_por: null }])
    expect(b.removidos).toEqual([])
  })
})
