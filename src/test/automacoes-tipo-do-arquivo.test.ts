// B22-38 — o upload da ação "enviar imagem ou documento" confere o conteúdo, e não
// só o tipo que o navegador declara pela extensão (baixo do QA das automações,
// 09/10/2026).

import { describe, expect, it, vi } from "vitest"
import { conteudoDoTipo } from "@/lib/automacoes/referencias"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/integrations/supabase/service", () => ({ createServiceClient: vi.fn() }))
vi.mock("@/lib/sessao", () => ({ sessaoAtual: vi.fn() }))

import { createServiceClient } from "@/integrations/supabase/service"
import { sessaoAtual } from "@/lib/sessao"
import { guardarArquivoDaAutomacao } from "@/app/(auth)/configuracoes/automacoes/actions"

const bytes = (...b: number[]) => new Uint8Array([...b, ...new Array(12).fill(0)].slice(0, 12))
const texto = (s: string) => new Uint8Array([...s].map((c) => c.charCodeAt(0)))

describe("B22-38 — assinatura do arquivo", () => {
  it("cada formato aceito pelos primeiros bytes", () => {
    expect(conteudoDoTipo("image/jpeg", bytes(0xff, 0xd8, 0xff, 0xe0))).toBe(true)
    expect(conteudoDoTipo("image/png", bytes(0x89, 0x50, 0x4e, 0x47))).toBe(true)
    expect(conteudoDoTipo("image/webp", texto("RIFF\u0000\u0000\u0000\u0000WEBP"))).toBe(true)
    expect(conteudoDoTipo("application/pdf", texto("%PDF-1.7\n\n\n\n"))).toBe(true)
    expect(conteudoDoTipo("application/vnd.openxmlformats-officedocument.wordprocessingml.document", bytes(0x50, 0x4b, 0x03, 0x04))).toBe(true)
    expect(conteudoDoTipo("application/vnd.ms-excel", bytes(0xd0, 0xcf, 0x11, 0xe0))).toBe(true)
  })

  it("conteúdo de outro tipo é recusado", () => {
    expect(conteudoDoTipo("application/pdf", texto("MZ\u0090\u0000executavel"))).toBe(false)
    expect(conteudoDoTipo("image/jpeg", bytes(0x89, 0x50, 0x4e, 0x47))).toBe(false)
    expect(conteudoDoTipo("image/webp", texto("RIFF\u0000\u0000\u0000\u0000WAVE"))).toBe(false)
    expect(conteudoDoTipo("text/html", texto("<html>"))).toBe(false)
  })

  it("a action recusa um .pdf que não é PDF, sem subir", async () => {
    const upload = vi.fn()
    vi.mocked(createServiceClient).mockReturnValue({ storage: { from: () => ({ upload }) } } as never)
    vi.mocked(sessaoAtual).mockResolvedValue({
      supabase: {},
      user: { id: "admin-1" },
      perfil: { role: "admin", workspace_id: "ws-1" },
    } as unknown as Awaited<ReturnType<typeof sessaoAtual>>)
    const dados = new FormData()
    dados.set("arquivo", new File(["<script>alert(1)</script>"], "tabela.pdf", { type: "application/pdf" }))

    expect(await guardarArquivoDaAutomacao(dados)).toEqual({
      erro: "O conteúdo do arquivo não é do tipo que a extensão diz. Escolha o arquivo original.",
    })
    expect(upload).not.toHaveBeenCalled()
  })
})
