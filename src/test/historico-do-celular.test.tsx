// B23-02 — O cartão do número mostra o andamento das conversas antigas (parte de tela
// dos CA-B23-09 e CA-B23-10). O texto é decidido no servidor (textoDaImportacao);
// o cartão só o mostra.

import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { CartaoNumero, type NumeroConectado } from "@/app/(auth)/configuracoes/whatsapp/canal-direto/cartao-numero"
import { textoDaImportacao } from "@/lib/whatsapp/historico-do-celular"

const base: NumeroConectado = {
  id: "c1",
  canal: "meta",
  phone_number: "5511999998888",
  display_name: "Loja",
  state: "connected",
  state_reason: null,
  em_uso_no_celular: true,
}

describe("B23-02 — Andamento das conversas antigas no cartão", () => {
  it('CA-B23-09: should mostrar "Conversas antigas importadas" quando a importação chegou a 100%', () => {
    render(<CartaoNumero numero={{ ...base, importacao: textoDaImportacao("importado", 100) }} />)
    expect(screen.getByText("Conversas antigas importadas")).toBeTruthy()
    expect(screen.getByText("Conectado")).toBeTruthy()
  })

  it("CA-B23-09: should mostrar o andamento enquanto importa", () => {
    render(<CartaoNumero numero={{ ...base, importacao: textoDaImportacao("importando", 55) }} />)
    expect(screen.getByText("Trazendo conversas antigas (55%)")).toBeTruthy()
  })

  it('CA-B23-10: should mostrar "Você não autorizou o envio das conversas antigas" com o número ainda conectado', () => {
    render(<CartaoNumero numero={{ ...base, importacao: textoDaImportacao("recusado", 0) }} />)
    expect(screen.getByText("Você não autorizou o envio das conversas antigas")).toBeTruthy()
    expect(screen.getByText("Conectado")).toBeTruthy()
  })

  it("CA-B23-10: should not mostrar nada sobre importação num número sem histórico pedido", () => {
    render(<CartaoNumero numero={{ ...base, em_uso_no_celular: false, importacao: textoDaImportacao(null, 0) }} />)
    expect(screen.queryByText(/conversas antigas/)).toBeNull()
  })
})
