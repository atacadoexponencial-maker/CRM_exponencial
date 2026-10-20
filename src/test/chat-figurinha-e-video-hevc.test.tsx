// Relato dela em 20/10/2026, teste B19-04 com o chip: GIF chegou como link .webp e
// vídeo do iPhone (HEVC) tocou só o áudio. O balão mostra figurinha como imagem e
// avisa no vídeo HEVC, com o botão de baixar; o recebimento marca o codec pelo
// cabeçalho do MP4.

import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { BalaoMensagem } from "@/app/(auth)/chat/components/balao-mensagem"
import type { Mensagem } from "@/app/(auth)/chat/mock-mensagens"
import { mimeComCodec } from "@/lib/whatsapp/midia-recebida"

const base: Omit<Mensagem, "tipo" | "conteudo"> = { id: "m", conversaId: "c", direcao: "recebida", horario: "13:45" }

describe("figurinha e GIF no balão", () => {
  it("figurinha com arquivo aparece como imagem, não como link", () => {
    const url = "https://x.supabase.co/storage/v1/object/public/chat-attachments/ws/recebidas/1.webp"
    render(<BalaoMensagem mensagem={{ ...base, tipo: "figurinha", conteudo: url }} />)
    expect(screen.getByAltText("figurinha").getAttribute("src")).toBe(url)
    expect(screen.queryByText(url)).toBeNull()
  })
})

describe("vídeo HEVC no balão", () => {
  it("avisa e oferece o download em vez do player mudo; vídeo comum continua no player", () => {
    const url = "https://x.supabase.co/storage/v1/object/public/chat-attachments/ws/recebidas/1.mp4"
    const { container, unmount } = render(
      <BalaoMensagem mensagem={{ ...base, tipo: "video", conteudo: url, tipoDoArquivo: "video/mp4; codecs=hvc1" }} />
    )
    expect(screen.getByText(/formato \(HEVC\)/)).toBeTruthy()
    expect(screen.getByText("Baixar vídeo").closest("a")?.getAttribute("href")).toBe(url)
    expect(container.querySelector("video")).toBeNull()
    unmount()

    const comum = render(<BalaoMensagem mensagem={{ ...base, tipo: "video", conteudo: url, tipoDoArquivo: "video/mp4" }} />)
    expect(comum.container.querySelector("video")?.getAttribute("src")).toBe(url)
  })
})

describe("codec lido do cabeçalho do MP4", () => {
  const ftyp = (marcas: string) => new TextEncoder().encode(`\0\0\0\x18ftyp${marcas}`)

  it("hvc1/hev1 marcam HEVC; H.264 e outros tipos ficam como estão", () => {
    expect(mimeComCodec("video/mp4", ftyp("iso4\0\0\0\0iso4hvc1isom"))).toBe("video/mp4; codecs=hvc1")
    expect(mimeComCodec("video/mp4", ftyp("isomiso2avc1mp41"))).toBe("video/mp4")
    expect(mimeComCodec("image/jpeg", ftyp("hvc1"))).toBe("image/jpeg")
    expect(mimeComCodec(null, ftyp("hvc1"))).toBeNull()
  })
})
