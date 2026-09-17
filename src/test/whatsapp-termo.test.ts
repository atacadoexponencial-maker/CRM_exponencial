// Termo de responsabilidade do canal direto (B3-01).
// Sem banco e sem rede: o que se mede é a regra de vigência e o bloqueio.

import { describe, expect, it } from "vitest"
import { GatewayRecusou, type ClienteGateway } from "@/lib/whatsapp/gateway/cliente"
import { criarConexaoDoGateway, type BancoDeConexoes } from "@/lib/whatsapp/gateway/instancias"
import {
  aceiteEstaVigente,
  TERMO_DO_CANAL_DIRETO,
  VERSAO_DO_TERMO,
} from "@/lib/whatsapp/gateway/termo"

describe("vigência do aceite", () => {
  it("aceite da versão vigente vale", () => {
    expect(aceiteEstaVigente({ terms_version: VERSAO_DO_TERMO })).toBe(true)
  })

  it("workspace sem aceite nenhum não está coberto", () => {
    expect(aceiteEstaVigente(null)).toBe(false)
  })

  it("versão nova exige aceite novo: o aceite antigo deixa de valer", () => {
    const aceiteAntigo = { terms_version: "2026-01-01" }

    expect(aceiteEstaVigente(aceiteAntigo)).toBe(false)
    // E continua valendo para a versão que foi aceita, que é o que o registro prova.
    expect(aceiteEstaVigente(aceiteAntigo, "2026-01-01")).toBe(true)
  })
})

describe("texto do termo", () => {
  it("a versão do texto e a constante são a mesma coisa", () => {
    expect(TERMO_DO_CANAL_DIRETO.versao).toBe(VERSAO_DO_TERMO)
  })

  it("diz o que a spec exige: risco de banimento, boas práticas e de quem é a responsabilidade", () => {
    const texto = TERMO_DO_CANAL_DIRETO.secoes
      .flatMap((s) => [s.titulo, ...s.paragrafos])
      .join(" ")
      .toLowerCase()

    expect(texto).toContain("fora dos termos de serviço")
    expect(texto).toContain("bloquear o número")
    expect(texto).toContain("aqueça número novo")
    expect(texto).toMatch(/responsabilidade pelo número(, pelo conteúdo enviado e pelas)? .*é sua/)
  })
})

describe("bloqueio da conexão sem aceite", () => {
  // A conferência do aceite mora na Server Action, antes de chamar o gateway.
  // Aqui se prova o contrapositivo do risco: se a criação chegasse a ser
  // chamada, uma instância nasceria e o token seria irrecuperável.
  function gatewayQueContaChamadas() {
    const chamadas: string[] = []
    const cliente: ClienteGateway = {
      async comServico(pedido) {
        chamadas.push(pedido.caminho)
        return { instance_id: "inst_1", instance_token: "t", state: "pairing" } as never
      },
      async comInstancia() {
        throw new Error("não usado")
      },
    }
    return { cliente, chamadas }
  }

  const bancoQueAceita = {
    from() {
      return {
        select() {
          return { eq: () => ({ order: async () => ({ data: [], error: null }) }) }
        },
        insert: async () => ({ error: null }),
      }
    },
  } as unknown as BancoDeConexoes

  it("a criação de instância é irreversível: uma vez chamada, o número existe no gateway", async () => {
    const gateway = gatewayQueContaChamadas()

    await criarConexaoDoGateway({
      cliente: gateway.cliente,
      supabase: bancoQueAceita,
      workspaceId: "ws_1",
      webhookUrl: "https://crm.exemplo/api/webhooks/gateway",
    })

    expect(gateway.chamadas).toEqual(["/instances"])
  })

  it("recusa do gateway por credencial inválida tem mensagem de configuração, não de aceite", async () => {
    const cliente: ClienteGateway = {
      async comServico() {
        throw new GatewayRecusou("invalid_credentials", "Credencial inválida.", 401)
      },
      async comInstancia() {
        throw new Error("não usado")
      },
    }

    const resultado = await criarConexaoDoGateway({
      cliente,
      supabase: bancoQueAceita,
      workspaceId: "ws_1",
      webhookUrl: "https://crm.exemplo/api/webhooks/gateway",
    })

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) expect(resultado.erro).toMatch(/configuração do servidor/)
  })
})
