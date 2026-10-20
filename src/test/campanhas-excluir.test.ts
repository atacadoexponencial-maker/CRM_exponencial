// QA M10 (06/10/2026, aprovado em 20/10) — excluir campanha: só em rascunho, agendada
// ou cancelada, e só da própria empresa. Enviada fica, porque o relatório é histórico.
// Banco falso; a sessão é simulada.

import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/sessao", () => ({ sessaoAtual: vi.fn() }))
vi.mock("@/integrations/supabase/server", () => ({ createClient: vi.fn() }))
vi.mock("@/integrations/supabase/service", () => ({ createServiceClient: vi.fn(() => ({})) }))
vi.mock("@/lib/campanhas", () => ({ processarCampanhasPendentes: vi.fn(async () => 0) }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

import { sessaoAtual } from "@/lib/sessao"
import { excluirCampanha } from "@/app/(auth)/campanhas/actions"

let filtros: unknown[][]
let apagou: boolean

function banco(role: string, apagadas: Array<{ id: string }>) {
  filtros = []
  apagou = false
  const obj: Record<string, unknown> = {}
  for (const m of ["select"]) obj[m] = vi.fn(() => obj)
  obj.eq = vi.fn((...a: unknown[]) => { filtros.push(a); return obj })
  obj.in = vi.fn((...a: unknown[]) => { filtros.push(a); return obj })
  obj.delete = vi.fn(() => { apagou = true; return obj })
  obj.then = (resolve: (v: unknown) => void) => Promise.resolve({ data: apagadas, error: null }).then(resolve)
  vi.mocked(sessaoAtual).mockResolvedValue({
    supabase: { from: vi.fn(() => obj) },
    user: { id: "u-1" },
    perfil: { id: "u-1", workspace_id: "ws-1", role },
  } as never)
}

beforeEach(() => vi.clearAllMocks())

describe("QA M10 — excluir campanha", () => {
  it("rascunho da própria empresa: apaga, filtrando por empresa e pelos status permitidos", async () => {
    banco("gerente", [{ id: "camp-1" }])
    expect(await excluirCampanha("camp-1")).toEqual({})
    expect(apagou).toBe(true)
    expect(filtros).toContainEqual(["workspace_id", "ws-1"])
    expect(filtros).toContainEqual(["status", ["rascunho", "agendada", "cancelada"]])
  })

  it("enviada (ou de outra empresa): nenhuma linha apagada, e diz por quê", async () => {
    banco("admin", [])
    expect(await excluirCampanha("camp-enviada")).toEqual({ erro: "Só é possível excluir campanhas em rascunho, agendadas ou canceladas" })
  })

  it("atendente não exclui", async () => {
    banco("atendente", [{ id: "camp-1" }])
    expect(await excluirCampanha("camp-1")).toEqual({ erro: "Sem permissão" })
    expect(apagou).toBe(false)
  })
})
