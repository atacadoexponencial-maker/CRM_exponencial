// B53-07 — mídia recebida pela API Oficial que não pôde ser baixada: o webhook grava
// "Mídia não pôde ser carregada" no conteúdo (webhook-whatsapp-midia.integration.test.ts),
// e o balão mostra esse texto no lugar do arquivo, em vez de ficar vazio.

import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { BalaoMensagem } from "@/app/(auth)/chat/components/balao-mensagem"
import type { Mensagem } from "@/app/(auth)/chat/mock-mensagens"

const AVISO = "Mídia não pôde ser carregada"

function recebida(tipo: Mensagem["tipo"]): Mensagem {
  return { id: `msg-${tipo}`, conversaId: "conv-1", tipo, direcao: "recebida", conteudo: AVISO, horario: "10:00" }
}

describe("B53-07 — balão da mídia que não pôde ser carregada", () => {
  it.each(["imagem", "audio", "video", "documento", "figurinha"] as const)(
    "CA-B53-13: should mostrar \"Mídia não pôde ser carregada\" no balão de %s sem arquivo",
    (tipo) => {
      const { container } = render(<BalaoMensagem mensagem={recebida(tipo)} />)
      expect(screen.getByText(AVISO)).toBeTruthy()
      // Nada tenta abrir o aviso como arquivo
      expect(container.querySelector("img, video, audio, a[href]")).toBeNull()
    }
  )
})
