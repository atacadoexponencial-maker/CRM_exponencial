// B22-37 — arquivos da ação "enviar imagem ou documento" que nenhuma regra usa
// (baixo do QA das automações, 09/10/2026; limpeza decidida pelo Luan em 14/10):
// saem do armazenamento ao salvar ou excluir uma regra, se tiverem mais de 1 dia.

import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/integrations/supabase/service", () => ({ createServiceClient: vi.fn() }))
vi.mock("@/lib/sessao", () => ({ sessaoAtual: vi.fn() }))

import { createServiceClient } from "@/integrations/supabase/service"
import { sessaoAtual } from "@/lib/sessao"
import { excluirRegra } from "@/app/(auth)/configuracoes/automacoes/actions"

const ANTIGO = "2026-10-01T10:00:00Z"
const AGORA = new Date().toISOString()
const PASTA = "ws-1/automacoes"

let removidos: string[][]

function preparar(fluxosQueSobram: unknown[]) {
  removidos = []
  const storage = {
    from: vi.fn(() => ({
      list: vi.fn(async () => ({
        data: [
          { id: "1", name: "1759000000-usado.pdf", created_at: ANTIGO },
          { id: "2", name: "1759000000-trocado.pdf", created_at: ANTIGO },
          { id: "3", name: "1760000000-recem-subido.jpg", created_at: AGORA },
          { id: null, name: "subpasta", created_at: null },
        ],
        error: null,
      })),
      remove: vi.fn(async (caminhos: string[]) => {
        removidos.push(caminhos)
        return { data: [], error: null }
      }),
    })),
  }
  vi.mocked(createServiceClient).mockReturnValue({ storage } as never)

  const from = vi.fn((tabela: string) => {
    const obj: Record<string, unknown> = {}
    for (const m of ["select", "eq", "delete"]) obj[m] = vi.fn(() => obj)
    obj.maybeSingle = vi.fn(async () => ({ data: { id: "r1" }, error: null }))
    obj.then = (resolve: (v: unknown) => void) =>
      Promise.resolve({ data: tabela === "automation_flows" ? fluxosQueSobram.map((fluxo) => ({ fluxo })) : [], error: null }).then(resolve)
    return obj
  })
  vi.mocked(sessaoAtual).mockResolvedValue({
    supabase: { from },
    user: { id: "admin-1" },
    perfil: { role: "admin", workspace_id: "ws-1" },
  } as unknown as Awaited<ReturnType<typeof sessaoAtual>>)
}

beforeEach(() => vi.clearAllMocks())

describe("B22-37 — limpeza dos arquivos sem uso", () => {
  it("ao excluir: sai só o arquivo antigo que nenhuma regra usa", async () => {
    preparar([
      {
        blocos: [
          { id: "a", tipo: "acao", acao: "enviar_midia", parametros: { arquivo: `https://x/storage/v1/object/public/chat-attachments/${PASTA}/1759000000-usado.pdf` } },
        ],
      },
    ])
    expect(await excluirRegra("r1")).toEqual({})
    expect(removidos).toEqual([[`${PASTA}/1759000000-trocado.pdf`]])
  })

  it("arquivo citado num fluxo fora do formato também fica", async () => {
    preparar([{ blocos: [{ qualquer: "1759000000-usado.pdf e 1759000000-trocado.pdf" }] }])
    await excluirRegra("r1")
    expect(removidos).toEqual([])
  })
})
