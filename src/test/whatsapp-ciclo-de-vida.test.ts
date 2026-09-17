// Ciclo de vida do número do canal direto (B2-05): desconectar, encerrar no
// aparelho e remover. Gateway falso; nenhuma rede.

import { describe, expect, it } from "vitest"
import { GatewayIndisponivel, GatewayRecusou, type ClienteGateway } from "@/lib/whatsapp/gateway/cliente"
import {
  EFEITO,
  operarInstancia,
  reconectaSemQr,
  type OperacaoDeCicloDeVida,
} from "@/lib/whatsapp/gateway/ciclo-de-vida"

const INSTANCIA = "inst_01HZX8P7A3"
const TOKEN = "token-da-instancia"

function gatewayFalso(resposta: unknown) {
  const chamadas: Array<{ caminho: string; metodo?: string; token: string }> = []
  const cliente: ClienteGateway = {
    async comServico() {
      throw new Error("Estas operações usam a credencial da instância.")
    },
    async comInstancia(token, pedido) {
      chamadas.push({ token, caminho: pedido.caminho, metodo: pedido.metodo })
      if (resposta instanceof Error) throw resposta
      return resposta as never
    },
  }
  return { cliente, chamadas }
}

describe("as três operações batem no endpoint certo", () => {
  it.each([
    ["desconectar", `/instances/${INSTANCIA}/disconnect`, "POST", "disconnected"],
    ["encerrar_no_aparelho", `/instances/${INSTANCIA}/logout`, "POST", "disconnected"],
    ["remover", `/instances/${INSTANCIA}`, "DELETE", "removed"],
  ] as const)("%s → %s", async (operacao, caminho, metodo, estado) => {
    const gateway = gatewayFalso({ state: estado })

    const resultado = await operarInstancia(
      gateway.cliente,
      INSTANCIA,
      TOKEN,
      operacao as OperacaoDeCicloDeVida
    )

    expect(gateway.chamadas[0]).toEqual({ token: TOKEN, caminho, metodo })
    expect(resultado).toEqual({ ok: true, estado })
  })
})

describe("as três são coisas diferentes, e o texto diz isso", () => {
  it("desconectar promete volta sem QR; encerrar avisa que vai precisar; remover avisa que não tem volta", () => {
    expect(EFEITO.desconectar).toMatch(/sem ler o QR Code de novo/)
    expect(EFEITO.encerrar_no_aparelho).toMatch(/novo QR Code/)
    expect(EFEITO.remover).toMatch(/Não tem volta/)
  })

  it("só desconectar reconecta sem QR", () => {
    expect(reconectaSemQr("desconectar")).toBe(true)
    expect(reconectaSemQr("encerrar_no_aparelho")).toBe(false)
    expect(reconectaSemQr("remover")).toBe(false)
    expect(reconectaSemQr(null)).toBe(false)
  })
})

describe("recusa e indisponibilidade", () => {
  it("instância que já não existe é sinalizada para o CRM limpar a própria cópia", async () => {
    const gateway = gatewayFalso(
      new GatewayRecusou("instance_not_found", "Instância não encontrada.", 404)
    )

    const resultado = await operarInstancia(gateway.cliente, INSTANCIA, TOKEN, "remover")

    expect(resultado).toEqual({
      ok: false,
      erro: "Esta conexão já não existe no gateway.",
      jaNaoExiste: true,
    })
  })

  it("conexão de outro workspace é recusada e não é tratada como inexistente", async () => {
    const gateway = gatewayFalso(
      new GatewayRecusou("instance_forbidden", "Token de outra instância.", 403)
    )

    const resultado = await operarInstancia(gateway.cliente, INSTANCIA, TOKEN, "desconectar")

    expect(resultado).toMatchObject({ ok: false, jaNaoExiste: false })
  })

  it("gateway fora do ar: nada foi alterado, e a mensagem diz isso", async () => {
    const gateway = gatewayFalso(new GatewayIndisponivel("sem resposta"))

    const resultado = await operarInstancia(gateway.cliente, INSTANCIA, TOKEN, "desconectar")

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) {
      expect(resultado.erro).toMatch(/Nada foi alterado/)
      expect(resultado.jaNaoExiste).toBe(false)
    }
  })

  it("a operação não grava nada: quem grava é a action, depois de o gateway confirmar", async () => {
    // O módulo não recebe cliente de banco nenhum — é a garantia estrutural de
    // que o CRM não fica marcando "desconectado" com o número ainda enviando.
    expect(operarInstancia.length).toBe(4)
  })
})
