// B22-42 — agir numa regra que outra aba ou outro admin já apagou (baixo do QA das
// automações, 09/10/2026): a mensagem diz que ela não existe mais, em vez de
// "Tente novamente". O banco falso não acha a regra.

import { describe, it, expect, vi } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/integrations/supabase/service", () => ({ createServiceClient: vi.fn() }))
vi.mock("@/lib/sessao", () => ({ sessaoAtual: vi.fn() }))

import { sessaoAtual } from "@/lib/sessao"
import { alternarRegra, excluirRegra } from "@/app/(auth)/configuracoes/automacoes/actions"

function semARegra() {
  const obj: Record<string, unknown> = {}
  for (const m of ["select", "eq", "update", "delete"]) obj[m] = vi.fn(() => obj)
  obj.maybeSingle = vi.fn(async () => ({ data: null, error: null }))
  vi.mocked(sessaoAtual).mockResolvedValue({
    supabase: { from: vi.fn(() => obj) },
    user: { id: "admin-1" },
    perfil: { role: "admin", workspace_id: "ws-1" },
  } as unknown as Awaited<ReturnType<typeof sessaoAtual>>)
}

describe("B22-42 — regra que não existe mais", () => {
  it("pausar ou ativar", async () => {
    semARegra()
    expect(await alternarRegra("r1", false)).toEqual({ erro: "Esta automação não existe mais." })
    expect(await alternarRegra("r1", true)).toEqual({ erro: "Esta automação não existe mais." })
  })

  it("excluir", async () => {
    semARegra()
    expect(await excluirRegra("r1")).toEqual({ erro: "Esta automação não existe mais." })
  })
})
