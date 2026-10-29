// B49-02 — a limpeza dos arquivos sem uso das automações (B22-37) continua achando o
// arquivo em uso depois dos anexos fechados: o fluxo guarda o endereço que o editor
// recebe ao subir o arquivo, e a limpeza procura por ele.

import { describe, it, expect, vi } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/integrations/supabase/service", () => ({ createServiceClient: vi.fn() }))
vi.mock("@/lib/sessao", () => ({ sessaoAtual: vi.fn() }))

import { createServiceClient } from "@/integrations/supabase/service"
import { sessaoAtual } from "@/lib/sessao"
import { excluirRegra, guardarArquivoDaAutomacao } from "@/app/(auth)/configuracoes/automacoes/actions"

const ANTIGO = "2026-10-01T10:00:00Z"
const PASTA = "ws-1/automacoes"

describe("B49-02 — limpeza dos arquivos das automações", () => {
  it("CA-B49-15: should apagar só o arquivo sem uso, e manter o que a automação usa", async () => {
    let subido = ""
    const removidos: string[][] = []
    const storage = {
      from: vi.fn(() => ({
        upload: vi.fn(async (caminho: string) => {
          subido = caminho.split("/").pop()!
          return { data: { path: caminho }, error: null }
        }),
        getPublicUrl: (caminho: string) => ({
          data: { publicUrl: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/chat-attachments/${caminho}` },
        }),
        list: vi.fn(async () => ({
          data: [
            { id: "1", name: subido, created_at: ANTIGO },
            { id: "2", name: "1759000000-sem-uso.pdf", created_at: ANTIGO },
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

    let fluxos: unknown[] = []
    const from = vi.fn((tabela: string) => {
      const obj: Record<string, unknown> = {}
      for (const m of ["select", "eq", "delete"]) obj[m] = vi.fn(() => obj)
      obj.maybeSingle = vi.fn(async () => ({ data: { id: "r1" }, error: null }))
      obj.then = (resolve: (v: unknown) => void) =>
        Promise.resolve({ data: tabela === "automation_flows" ? fluxos.map((fluxo) => ({ fluxo })) : [], error: null }).then(resolve)
      return obj
    })
    vi.mocked(sessaoAtual).mockResolvedValue({
      supabase: { from },
      user: { id: "admin-1" },
      perfil: { role: "admin", workspace_id: "ws-1" },
    } as unknown as Awaited<ReturnType<typeof sessaoAtual>>)

    // O arquivo sobe pelo editor e o endereço que ele recebe fica no fluxo
    const formData = new FormData()
    formData.append("arquivo", new File(["%PDF-1.4 tabela"], "tabela.pdf", { type: "application/pdf" }))
    const { arquivo } = await guardarArquivoDaAutomacao(formData)
    expect(arquivo?.url).toContain(`${PASTA}/${subido}`)
    fluxos = [{ blocos: [{ id: "a", tipo: "acao", acao: "enviar_midia", parametros: { arquivo } }] }]

    expect(await excluirRegra("r1")).toEqual({})
    expect(removidos).toEqual([[`${PASTA}/1759000000-sem-uso.pdf`]])
  })
})
