// Transporte até o gateway WhatsApp próprio: monta a URL, manda a credencial
// certa, aplica tempo limite e traduz a recusa do contrato.
//
// É o equivalente do `provider-meta.ts` para o transporte, não para o
// comportamento: aqui não há regra de negócio nenhuma. Quem decide o que fazer
// com `instance_not_connected` é quem chamou.
//
// **Só backend.** As duas credenciais e o segredo da assinatura moram em
// variável de ambiente sem `NEXT_PUBLIC_`; nada disto pode alcançar o
// navegador.

import { type CodigoDeErroGateway } from "./tipos"

/** Mesmo tempo limite da entrega de eventos do gateway (WEBHOOK_TIMEOUT_MS lá). */
export const TEMPO_LIMITE_PADRAO_MS = 10_000

/**
 * O gateway respondeu recusando, no formato `{ error: { code, message } }` da
 * seção 5 do contrato.
 *
 * `code` é estável e serve para decidir; `message` é legível e pode ser
 * mostrada ao atendente.
 */
export class GatewayRecusou extends Error {
  constructor(
    readonly code: CodigoDeErroGateway | string,
    mensagem: string,
    readonly status: number
  ) {
    super(mensagem)
    this.name = "GatewayRecusou"
  }
}

/** Não houve resposta: rede, tempo limite ou corpo que não é o do contrato. */
export class GatewayIndisponivel extends Error {
  constructor(mensagem: string, readonly causa?: unknown) {
    super(mensagem)
    this.name = "GatewayIndisponivel"
  }
}

export type OpcoesDoCliente = {
  /** Base da API, incluindo `/v1`. */
  baseUrl: string
  /** Credencial de serviço: cria e lista instâncias. Não envia, não pareia. */
  serviceKey: string
  timeoutMs?: number
  fetch?: typeof fetch
}

type Pedido = {
  caminho: string
  metodo?: "GET" | "POST" | "PATCH" | "DELETE"
  corpo?: unknown
}

export type ClienteGateway = {
  /** Chamada com a credencial de serviço: criar instância, listar por workspace. */
  comServico<T>(pedido: Pedido): Promise<T>
  /** Chamada com a credencial da instância: tudo que se refere a um número. */
  comInstancia<T>(instanceToken: string, pedido: Pedido): Promise<T>
}

/**
 * Cria o cliente. Recebe as credenciais prontas em vez de ler o ambiente:
 * assim os testes rodam sem `process.env` e sem rede.
 */
export function criarClienteGateway({
  baseUrl,
  serviceKey,
  timeoutMs = TEMPO_LIMITE_PADRAO_MS,
  fetch: buscar = fetch,
}: OpcoesDoCliente): ClienteGateway {
  const base = baseUrl.replace(/\/+$/, "")

  async function chamar<T>(pedido: Pedido, credencial: Record<string, string>): Promise<T> {
    const { caminho, metodo = "GET", corpo } = pedido

    let resposta: Response
    try {
      resposta = await buscar(`${base}${caminho}`, {
        method: metodo,
        headers: {
          ...credencial,
          ...(corpo === undefined ? {} : { "Content-Type": "application/json" }),
        },
        body: corpo === undefined ? undefined : JSON.stringify(corpo),
        signal: AbortSignal.timeout(timeoutMs),
      })
    } catch (erro) {
      // Nunca repete a URL na mensagem: ela não carrega segredo, mas a
      // credencial viaja ao lado e mensagem de erro circula em log e em tela.
      throw new GatewayIndisponivel("O gateway não respondeu.", erro)
    }

    if (!resposta.ok) {
      const corpoErro = (await resposta.json().catch(() => null)) as
        | { error?: { code?: string; message?: string } }
        | null

      // Recusa fora do formato do contrato ainda é recusa: preserva o status e
      // deixa claro que o código é desconhecido.
      throw new GatewayRecusou(
        corpoErro?.error?.code ?? "unknown_error",
        corpoErro?.error?.message ?? `O gateway recusou a operação (HTTP ${resposta.status}).`,
        resposta.status
      )
    }

    // 204 e corpo vazio são respostas válidas para operação sem retorno.
    if (resposta.status === 204) return undefined as T

    try {
      return (await resposta.json()) as T
    } catch (erro) {
      throw new GatewayIndisponivel("O gateway respondeu em formato inesperado.", erro)
    }
  }

  return {
    comServico<T>(pedido: Pedido) {
      return chamar<T>(pedido, { "X-Gateway-Service-Key": serviceKey })
    },

    comInstancia<T>(instanceToken: string, pedido: Pedido) {
      // A credencial de serviço NÃO vai junto: ela cria e lista, e mandar as
      // duas esconderia um erro de autorização até virar incidente.
      return chamar<T>(pedido, { "X-Instance-Token": instanceToken })
    },
  }
}

/**
 * Cliente a partir do ambiente. Falha nomeando a variável ausente: melhor errar
 * aqui do que descobrir no meio de um envio.
 *
 * Chamar isto de componente de cliente é erro de programação — as variáveis não
 * existem no navegador, e a falta delas apareceria como "gateway não
 * configurado" em vez de como o vazamento que seria.
 */
export function clienteGatewayDoAmbiente(ambiente: NodeJS.ProcessEnv = process.env): ClienteGateway {
  const baseUrl = ambiente.GATEWAY_BASE_URL
  const serviceKey = ambiente.GATEWAY_SERVICE_KEY

  const ausentes = [
    ["GATEWAY_BASE_URL", baseUrl],
    ["GATEWAY_SERVICE_KEY", serviceKey],
  ]
    .filter(([, valor]) => !valor)
    .map(([nome]) => nome)

  if (ausentes.length > 0) {
    throw new Error(`Configuração do gateway incompleta: ${ausentes.join(", ")}`)
  }

  return criarClienteGateway({ baseUrl: baseUrl!, serviceKey: serviceKey! })
}
