// Transporte até o gateway (B0-01). `fetch` simulado: sem rede e sem banco.

import { describe, expect, it, vi } from "vitest"
import {
  clienteGatewayDoAmbiente,
  criarClienteGateway,
  GatewayIndisponivel,
  GatewayRecusou,
} from "@/lib/whatsapp/gateway/cliente"

const BASE = "https://gateway.exemplo.com/v1"
const CHAVE = "chave-de-servico"
const TOKEN = "token-da-instancia"

function respostaOk(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

function clienteCom(buscar: typeof fetch) {
  return criarClienteGateway({ baseUrl: BASE, serviceKey: CHAVE, fetch: buscar, timeoutMs: 1000 })
}

describe("credenciais", () => {
  it("chamada de serviço manda a chave de serviço, e só ela", async () => {
    const buscar = vi.fn(async () => respostaOk({ instances: [] }))

    await clienteCom(buscar as unknown as typeof fetch).comServico({
      caminho: "/instances?workspace_id=ws_1",
    })

    const [url, init] = buscar.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe(`${BASE}/instances?workspace_id=ws_1`)
    expect(init.headers).toEqual({ "X-Gateway-Service-Key": CHAVE })
    expect(init.method).toBe("GET")
  })

  it("chamada de instância manda o token da instância, e nunca a chave de serviço junto", async () => {
    const buscar = vi.fn(async () => respostaOk({ state: "connected" }))

    await clienteCom(buscar as unknown as typeof fetch).comInstancia(TOKEN, {
      caminho: "/instances/inst_1/disconnect",
      metodo: "POST",
    })

    const [, init] = buscar.mock.calls[0] as unknown as [string, RequestInit]
    expect(init.headers).toEqual({ "X-Instance-Token": TOKEN })
    expect(JSON.stringify(init.headers)).not.toContain(CHAVE)
  })

  it("barra sobrando na base não gera caminho com barra dupla", async () => {
    const buscar = vi.fn(async () => respostaOk({}))

    await criarClienteGateway({
      baseUrl: `${BASE}/`,
      serviceKey: CHAVE,
      fetch: buscar as unknown as typeof fetch,
    }).comServico({ caminho: "/instances" })

    expect((buscar.mock.calls[0] as unknown as [string])[0]).toBe(`${BASE}/instances`)
  })
})

describe("corpo e resposta", () => {
  it("manda JSON e devolve o corpo já convertido", async () => {
    const buscar = vi.fn(async () => respostaOk({ instance_id: "inst_1", instance_token: "t" }, 201))

    const criada = await clienteCom(buscar as unknown as typeof fetch).comServico<{
      instance_id: string
    }>({
      caminho: "/instances",
      metodo: "POST",
      corpo: { workspace_id: "ws_1", webhook_url: "https://crm.exemplo/api" },
    })

    const [, init] = buscar.mock.calls[0] as unknown as [string, RequestInit]
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json")
    expect(JSON.parse(init.body as string)).toEqual({
      workspace_id: "ws_1",
      webhook_url: "https://crm.exemplo/api",
    })
    expect(criada.instance_id).toBe("inst_1")
  })

  it("chamada sem corpo não declara Content-Type", async () => {
    const buscar = vi.fn(async () => respostaOk({}))

    await clienteCom(buscar as unknown as typeof fetch).comServico({ caminho: "/instances" })

    const [, init] = buscar.mock.calls[0] as unknown as [string, RequestInit]
    expect(init.headers).not.toHaveProperty("Content-Type")
    expect(init.body).toBeUndefined()
  })

  it("204 sem corpo não quebra", async () => {
    const buscar = vi.fn(async () => new Response(null, { status: 204 }))

    await expect(
      clienteCom(buscar as unknown as typeof fetch).comInstancia(TOKEN, {
        caminho: "/instances/inst_1",
        metodo: "DELETE",
      })
    ).resolves.toBeUndefined()
  })
})

describe("recusa do gateway", () => {
  it("preserva o code do contrato e a mensagem legível", async () => {
    const buscar = vi.fn(async () =>
      respostaOk(
        { error: { code: "instance_not_connected", message: "A instância não está conectada." } },
        409
      )
    )

    const chamada = clienteCom(buscar as unknown as typeof fetch).comInstancia(TOKEN, {
      caminho: "/instances/inst_1/messages",
      metodo: "POST",
      corpo: { to: "5511999998888", type: "text", text: "oi" },
    })

    await expect(chamada).rejects.toBeInstanceOf(GatewayRecusou)
    await chamada.catch((erro: GatewayRecusou) => {
      expect(erro.code).toBe("instance_not_connected")
      expect(erro.message).toBe("A instância não está conectada.")
      expect(erro.status).toBe(409)
    })
  })

  it("recusa fora do formato do contrato vira código desconhecido, mantendo o status", async () => {
    const buscar = vi.fn(async () => new Response("<html>502</html>", { status: 502 }))

    const chamada = clienteCom(buscar as unknown as typeof fetch).comServico({ caminho: "/instances" })

    await chamada.catch((erro: GatewayRecusou) => {
      expect(erro).toBeInstanceOf(GatewayRecusou)
      expect(erro.code).toBe("unknown_error")
      expect(erro.status).toBe(502)
    })
    expect.assertions(3)
  })

  it("credencial inválida chega como invalid_credentials, não como erro genérico", async () => {
    const buscar = vi.fn(async () =>
      respostaOk({ error: { code: "invalid_credentials", message: "Credencial inválida." } }, 401)
    )

    await clienteCom(buscar as unknown as typeof fetch)
      .comServico({ caminho: "/instances" })
      .catch((erro: GatewayRecusou) => expect(erro.code).toBe("invalid_credentials"))
    expect.assertions(1)
  })
})

describe("gateway fora do ar", () => {
  it("rede que falha vira GatewayIndisponivel, sem expor a URL", async () => {
    const buscar = vi.fn(async () => {
      throw new TypeError("fetch failed")
    })

    const chamada = clienteCom(buscar as unknown as typeof fetch).comServico({ caminho: "/instances" })

    await expect(chamada).rejects.toBeInstanceOf(GatewayIndisponivel)
    await expect(chamada).rejects.not.toThrow(/gateway\.exemplo\.com/)
  })

  it("tempo limite aborta em vez de pendurar a requisição do CRM", async () => {
    const buscar = vi.fn(
      (_url: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_, rejeitar) =>
          init?.signal?.addEventListener("abort", () => rejeitar(init.signal?.reason))
        )
    )

    const cliente = criarClienteGateway({
      baseUrl: BASE,
      serviceKey: CHAVE,
      fetch: buscar as unknown as typeof fetch,
      timeoutMs: 10,
    })

    await expect(cliente.comServico({ caminho: "/instances" })).rejects.toBeInstanceOf(
      GatewayIndisponivel
    )
  })

  it("resposta 200 que não é JSON vira GatewayIndisponivel", async () => {
    const buscar = vi.fn(async () => new Response("não é json", { status: 200 }))

    await expect(
      clienteCom(buscar as unknown as typeof fetch).comServico({ caminho: "/instances" })
    ).rejects.toBeInstanceOf(GatewayIndisponivel)
  })
})

describe("cliente a partir do ambiente", () => {
  it("falha nomeando a variável ausente", () => {
    expect(() => clienteGatewayDoAmbiente({} as NodeJS.ProcessEnv)).toThrowError(
      /GATEWAY_BASE_URL, GATEWAY_SERVICE_KEY/
    )
    expect(() =>
      clienteGatewayDoAmbiente({ GATEWAY_BASE_URL: BASE } as NodeJS.ProcessEnv)
    ).toThrowError(/GATEWAY_SERVICE_KEY/)
  })

  it("com as duas variáveis, devolve um cliente utilizável", async () => {
    const cliente = clienteGatewayDoAmbiente({
      GATEWAY_BASE_URL: BASE,
      GATEWAY_SERVICE_KEY: CHAVE,
    } as NodeJS.ProcessEnv)

    expect(typeof cliente.comServico).toBe("function")
    expect(typeof cliente.comInstancia).toBe("function")
  })
})
