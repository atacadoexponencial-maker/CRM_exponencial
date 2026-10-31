// Pedido dela em 20/10/2026, no teste B19-04: o PDF recebido aparecia com o nome do
// caminho (um código nosso) e sem prévia. O balão mostra o nome original e a
// miniatura que o WhatsApp manda; o recebimento guarda a miniatura no Storage.

import { render, screen } from "@testing-library/react"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { BalaoMensagem } from "@/app/(auth)/chat/components/balao-mensagem"
import type { Mensagem } from "@/app/(auth)/chat/mock-mensagens"
import { guardarMidiaRecebida } from "@/lib/whatsapp/midia-recebida"
import type { createServiceClient } from "@/integrations/supabase/service"

const base: Omit<Mensagem, "tipo" | "conteudo"> = { id: "m", conversaId: "c", direcao: "recebida", horario: "14:12" }
const url = "https://x.supabase.co/storage/v1/object/public/chat-attachments/ws/recebidas/1792516361806-ebae0d7a.pdf"

describe("documento no balão", () => {
  it("mostra o nome original e a prévia quando os tem", () => {
    render(
      <BalaoMensagem mensagem={{ ...base, tipo: "documento", conteudo: url, nomeDoArquivo: "COLEÇAO GATA EXIBIDA.pdf", miniatura: "https://x/thumb.jpg" }} />
    )
    expect(screen.getByText("COLEÇAO GATA EXIBIDA.pdf")).toBeTruthy()
    expect(screen.queryByText(/ebae0d7a/)).toBeNull()
    expect(screen.getByAltText("Prévia de COLEÇAO GATA EXIBIDA.pdf").getAttribute("src")).toBe("https://x/thumb.jpg")
  })

  it("sem o nome original, usa o do caminho com espaços no lugar dos sublinhados", () => {
    const enviado = `${url.replace(/[^/]+$/, "")}1792516968018-Lead_Oculto_-_Exemplo.pdf`
    render(<BalaoMensagem mensagem={{ ...base, direcao: "enviada", tipo: "documento", conteudo: enviado }} />)
    expect(screen.getByText("Lead Oculto - Exemplo.pdf")).toBeTruthy()
  })
})

describe("miniatura guardada no recebimento", () => {
  // B47-02: o recebimento só baixa de endereço do próprio gateway (GATEWAY_BASE_URL).
  beforeAll(() => vi.stubEnv("GATEWAY_BASE_URL", "https://gw"))
  afterAll(() => vi.unstubAllEnvs())

  function storageFalso() {
    const uploads: string[] = []
    const storage = {
      from: () => ({
        upload: vi.fn(async (caminho: string) => { uploads.push(caminho); return { error: null } }),
        getPublicUrl: (caminho: string) => ({ data: { publicUrl: `https://supabase.exemplo/storage/${caminho}` } }),
      }),
    }
    return { storage, uploads }
  }

  it("baixa a thumbnail_url com o token da instância e devolve a URL dela", async () => {
    const { storage, uploads } = storageFalso()
    const buscar = vi.fn(async () => new Response(new ArrayBuffer(8), { status: 200 }))
    const guardada = await guardarMidiaRecebida({
      supabase: { storage } as unknown as ReturnType<typeof createServiceClient>,
      workspaceId: "ws-1",
      midia: { url: "https://gw/v1/media/m1/conteudo", mime_type: "application/pdf", filename: "tabela.pdf", thumbnail_url: "https://gw/v1/media/m1/thumb" },
      instanceToken: "tok",
      buscar: buscar as unknown as typeof fetch,
    })
    expect(buscar).toHaveBeenCalledTimes(2)
    expect((buscar.mock.calls[1] as unknown as [string, RequestInit])[0]).toBe("https://gw/v1/media/m1/thumb")
    expect(uploads[1]).toMatch(/\.pdf\.thumb\.jpg$/)
    expect(guardada?.thumbnailUrl).toContain(".thumb.jpg")
    expect(guardada?.filename).toBe("tabela.pdf")
  })

  it("sem thumbnail_url, não busca nada a mais e a miniatura fica nula", async () => {
    const { storage } = storageFalso()
    const buscar = vi.fn(async () => new Response(new ArrayBuffer(8), { status: 200 }))
    const guardada = await guardarMidiaRecebida({
      supabase: { storage } as unknown as ReturnType<typeof createServiceClient>,
      workspaceId: "ws-1",
      midia: { url: "https://gw/v1/media/m1/conteudo", mime_type: "application/pdf", filename: "tabela.pdf" },
      buscar: buscar as unknown as typeof fetch,
    })
    expect(buscar).toHaveBeenCalledTimes(1)
    expect(guardada?.thumbnailUrl).toBeNull()
  })
})
