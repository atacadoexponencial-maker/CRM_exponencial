// B53-07 — vídeo HEVC na conversa aberta (CA-B53-34): o navegador que toca HEVC
// mostra o original; o que não toca mostra a capa com "Preparando o vídeo…"; e o
// aviso do tempo real troca o balão no lugar, sem recarregar.

import { describe, it, expect, afterEach, vi } from "vitest"
import { render, screen, cleanup } from "@testing-library/react"
import { BalaoMensagem } from "@/app/(auth)/chat/components/balao-mensagem"
import { aplicarMensagemRecebida } from "@/app/(auth)/chat/mensagens-locais"
import type { Mensagem } from "@/app/(auth)/chat/mock-mensagens"

const URL_VIDEO = "https://x.supabase.co/storage/v1/object/sign/chat-attachments/ws/recebidas/1.mp4?token=a"
const URL_CAPA = "https://x.supabase.co/storage/v1/object/sign/chat-attachments/ws/recebidas/1.mp4.thumb.jpg?token=a"

const hevc: Mensagem = {
  id: "msg-1",
  conversaId: "conv-1",
  tipo: "video",
  direcao: "recebida",
  conteudo: URL_VIDEO,
  horario: "10:53",
  tipoDoArquivo: "video/mp4; codecs=hvc1",
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("B53-07 — vídeo HEVC na conversa aberta", () => {
  it("CA-B53-34: navegador que não toca HEVC mostra a capa com \"Preparando o vídeo…\"", () => {
    vi.spyOn(HTMLMediaElement.prototype, "canPlayType").mockReturnValue("")
    const { container } = render(<BalaoMensagem mensagem={{ ...hevc, miniatura: URL_CAPA }} />)

    expect(screen.getByText("Preparando o vídeo…")).toBeTruthy()
    expect(screen.getByAltText("Capa do vídeo").getAttribute("src")).toBe(URL_CAPA)
    expect(container.querySelector("video")).toBeNull()
  })

  it("CA-B53-34: navegador que toca HEVC mostra o original na hora", () => {
    vi.spyOn(HTMLMediaElement.prototype, "canPlayType").mockReturnValue("probably")
    const { container } = render(<BalaoMensagem mensagem={hevc} />)

    expect(container.querySelector("video")?.getAttribute("src")).toBe(URL_VIDEO)
    expect(screen.queryByText("Preparando o vídeo…")).toBeNull()
  })

  it("CA-B53-34: o aviso da capa e depois o do vídeo convertido trocam o balão no lugar", () => {
    const outra: Mensagem = { ...hevc, id: "msg-0", tipo: "texto", conteudo: "oi" }
    const lista = [outra, hevc]

    const comCapa = aplicarMensagemRecebida(lista, { ...hevc, miniatura: URL_CAPA, horario: "outro" })
    expect(comCapa).toHaveLength(2)
    expect(comCapa[1]).toMatchObject({ id: "msg-1", miniatura: URL_CAPA, horario: "10:53" })

    const novoLink = URL_VIDEO.replace("token=a", "token=b")
    const convertido = aplicarMensagemRecebida(comCapa, { ...hevc, conteudo: novoLink, miniatura: URL_CAPA, tipoDoArquivo: "video/mp4" })
    expect(convertido[1]).toMatchObject({ tipoDoArquivo: "video/mp4", conteudo: novoLink })

    // E o balão passa a ser o player com o arquivo convertido
    vi.spyOn(HTMLMediaElement.prototype, "canPlayType").mockReturnValue("")
    const { container } = render(<BalaoMensagem mensagem={convertido[1]} />)
    expect(container.querySelector("video")?.getAttribute("src")).toBe(novoLink)
  })

  it("CA-B53-34: mensagem nova entra no fim, e a repetida sem mudança não mexe na lista", () => {
    const lista = [hevc]
    expect(aplicarMensagemRecebida(lista, hevc)).toBe(lista)
    expect(aplicarMensagemRecebida(lista, { ...hevc, id: "msg-2" }).map((m) => m.id)).toEqual(["msg-1", "msg-2"])
  })
})
