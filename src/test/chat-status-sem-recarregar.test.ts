// Status da mensagem recém-enviada atualiza sem recarregar (B26-01). A mensagem
// nasce na tela com id provisório; o aviso de entregue e de lida chega pelo id
// real. Aqui, as funções que trocam um pelo outro e aplicam o status.

import { describe, expect, it } from "vitest"
import { aplicarStatus, confirmarEnvio } from "@/app/(auth)/chat/mensagens-locais"
import type { Mensagem } from "@/app/(auth)/chat/mock-mensagens"

const enviada = (id: string): Mensagem => ({
  id,
  conversaId: "conv-1",
  tipo: "texto",
  direcao: "enviada",
  conteudo: "Segue o catálogo",
  horario: "10:00",
  status: "enviado",
})

describe("B26-01 — status da mensagem recém-enviada sem recarregar", () => {
  it("CA-B26-05: depois de confirmada com o id real, a mensagem recebe entregue e depois lida", () => {
    let lista = [enviada("msg-0"), enviada("local-123")]
    lista = confirmarEnvio(lista, "local-123", "msg-9")

    const entregue = aplicarStatus(lista, "msg-9", "entregue")
    expect(entregue.achou).toBe(true)
    const lida = aplicarStatus(entregue.lista, "msg-9", "lido")

    expect(lida.lista.map((m) => [m.id, m.status])).toEqual([
      ["msg-0", "enviado"],
      ["msg-9", "lido"],
    ])
  })

  it("CA-B26-05: sem a confirmação, o aviso não acha a mensagem (era o motivo de só atualizar ao recarregar)", () => {
    const lista = [enviada("local-123")]
    const aplicado = aplicarStatus(lista, "msg-9", "entregue")
    expect(aplicado.achou).toBe(false)
    expect(aplicado.lista).toBe(lista)
  })

  it("CA-B26-05: aviso que chegou antes da confirmação é aplicado na troca do id", () => {
    const lista = confirmarEnvio([enviada("local-123")], "local-123", "msg-9", "entregue")
    expect(lista[0]).toMatchObject({ id: "msg-9", status: "entregue", conteudo: "Segue o catálogo" })
  })

  it("CA-B26-05: confirmar uma mensagem não mexe nas outras enviadas em sequência", () => {
    const lista = confirmarEnvio([enviada("local-1"), enviada("local-2")], "local-2", "msg-2")
    expect(lista.map((m) => m.id)).toEqual(["local-1", "msg-2"])
  })
})
