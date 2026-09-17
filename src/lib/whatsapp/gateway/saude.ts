// Leitura da saúde de um número do canal direto (B4-02) e a retomada do freio
// (B4-04).
//
// Regra que governa o arquivo: **o CRM não calcula nada disso.** Tempo
// conectado, volume enviado, tetos vigentes e dia de aquecimento são conta do
// gateway, já implementada e testada (A6 e A8-02/A8-06). Aqui se lê, se traduz
// para o vocabulário da tela e se exibe. Qualquer conta refeita aqui sai de
// sincronia no primeiro ajuste do gateway e passa a mentir para o cliente.
//
// A única coisa que o CRM decide é a classificação do risco — e ela mora em
// `src/lib/risco.ts`, por decisão registrada no contrato.

import { GatewayIndisponivel, GatewayRecusou, type ClienteGateway } from "./cliente"
import type { FreioLiberado, SaudeDoNumero as SaudeNoContrato } from "./tipos"

export type NivelDeRisco = "baixo" | "medio" | "alto"
export type MotivoDoFreio = "failure_rate" | "manual" | "banned"

/**
 * Saúde no vocabulário da tela (B4-01). Português, domínio do CRM: os nomes do
 * contrato ficam deste lado da fronteira e não vazam para os componentes.
 */
export type SaudeDoNumero = {
  numero: string | null
  nomeExibicao: string | null
  estado: "pairing" | "connecting" | "connected" | "disconnected" | "banned" | "removed"
  tempoConectado24hMs: number

  enviadasNaHora: number
  enviadasNoDia: number
  recebidasNaHora: number
  recebidasNoDia: number

  /** Tetos vigentes: já com aquecimento e limites do sistema aplicados. */
  tetoHora: number
  tetoDia: number

  aquecimento: {
    ativo: boolean
    dia: number
    /**
     * Último dia em que o aquecimento aperta os tetos.
     *
     * `null` porque **o contrato não expõe esse número** — ele é constante do
     * gateway (`ULTIMO_DIA_DE_AQUECIMENTO`). Escrevê-lo aqui duplicaria regra
     * da Parte A, e é exatamente o que a issue proíbe: a tela mostra o dia
     * atual e omite o total enquanto o gateway não o entregar.
     */
    ultimoDia: number | null
    tetoHora: number
    tetoDia: number
  }

  risco: { nivel: NivelDeRisco; razoes: string[] }

  freio: {
    freado: boolean
    motivo: MotivoDoFreio | null
    desde: string | null
    mensagensParadas: number
  }

  falhas: { falharam: number; enviadas: number; proporcao: number | null }
}

/** Dados da conexão que a leitura precisa. O token nunca sai do backend. */
export type ConexaoDoGateway = {
  instanceId: string
  instanceToken: string
  numero: string | null
  nomeExibicao: string | null
}

export type LeituraDeSaude =
  | { ok: true; saude: SaudeDoNumero }
  | { ok: false; erro: string }

/** Mensagens por código do contrato; fora da lista, a do gateway serve. */
const MENSAGEM_POR_CODIGO: Record<string, string> = {
  instance_not_found:
    "O gateway não encontra mais este número. Ele pode ter sido removido de lá.",
  invalid_credentials:
    "O CRM não conseguiu se autenticar no gateway. Confira a configuração do servidor.",
  instance_forbidden:
    "A credencial guardada não pertence a este número. Reconecte o número para gerar outra.",
}

/**
 * Traduz a resposta do contrato para o vocabulário da tela.
 *
 * Função separada da chamada HTTP de propósito: é ela que tem regra de
 * tradução, e é a que vale a pena testar caso a caso.
 *
 * `risco` sai daqui **sem classificação** — quem classifica é
 * `classificarRisco` (B4-03), a partir destes mesmos números. Aqui vai o valor
 * neutro para a tela nunca ficar sem objeto.
 */
export function saudeNaTela(
  contrato: SaudeNoContrato,
  conexao: Pick<ConexaoDoGateway, "numero" | "nomeExibicao">
): SaudeDoNumero {
  return {
    numero: conexao.numero,
    nomeExibicao: conexao.nomeExibicao,
    estado: contrato.state,
    tempoConectado24hMs: contrato.connected_24h_ms,

    enviadasNaHora: contrato.sent.last_hour,
    enviadasNoDia: contrato.sent.last_24h,
    recebidasNaHora: contrato.received.last_hour,
    recebidasNoDia: contrato.received.last_24h,

    tetoHora: contrato.caps.hourly,
    tetoDia: contrato.caps.daily,

    aquecimento: {
      ativo: contrato.warmup.active,
      dia: contrato.warmup.day_of_life,
      ultimoDia: null,
      tetoHora: contrato.warmup.hourly_cap,
      tetoDia: contrato.warmup.daily_cap,
    },

    risco: { nivel: "baixo", razoes: [] },

    freio: {
      freado: contrato.brake.braked,
      motivo: contrato.brake.reason,
      desde: contrato.brake.braked_at,
      mensagensParadas: contrato.queue.queued_count,
    },

    falhas: {
      falharam: contrato.failures.failed,
      enviadas: contrato.failures.sent,
      proporcao: contrato.failures.ratio,
    },
  }
}

/**
 * Lê a saúde do número no gateway.
 *
 * Falha **nunca** vira zero: "nenhum envio" e "não consegui ler" são coisas
 * diferentes, e confundi-las faz o cliente achar que o número está parado. Por
 * isso o retorno é explícito, com o erro legível.
 */
export async function lerSaudeDoNumero({
  cliente,
  conexao,
}: {
  cliente: ClienteGateway
  conexao: ConexaoDoGateway
}): Promise<LeituraDeSaude> {
  try {
    const contrato = await cliente.comInstancia<SaudeNoContrato>(conexao.instanceToken, {
      caminho: `/instances/${conexao.instanceId}/health`,
    })
    return { ok: true, saude: saudeNaTela(contrato, conexao) }
  } catch (erro) {
    if (erro instanceof GatewayRecusou) {
      return { ok: false, erro: MENSAGEM_POR_CODIGO[erro.code] ?? erro.message }
    }
    if (erro instanceof GatewayIndisponivel) {
      return {
        ok: false,
        erro: "O gateway não respondeu. Os números abaixo não puderam ser lidos agora.",
      }
    }
    throw erro
  }
}

export type RetomadaDeEnvios =
  | { ok: true; motivoLiberado: FreioLiberado["released_reason"] }
  | { ok: false; erro: string }

/** Recusas previstas na retomada, seção 4.5 e 5 do contrato. */
const MENSAGEM_DA_RETOMADA: Record<string, string> = {
  brake_not_releasable:
    "Este número está banido pelo WhatsApp: os envios não podem ser retomados. Conecte outro número.",
  instance_not_braked: "Os envios deste número já estavam liberados.",
  instance_not_found: "O gateway não encontra mais este número.",
}

/**
 * Pede a retomada dos envios de um número freado (B4-04).
 *
 * A regra de quem pode pedir é da action; a regra do que é retomável é do
 * gateway — e é ele que recusa banimento, porque o bloqueio é do WhatsApp.
 */
export async function retomarEnvios({
  cliente,
  conexao,
}: {
  cliente: ClienteGateway
  conexao: Pick<ConexaoDoGateway, "instanceId" | "instanceToken">
}): Promise<RetomadaDeEnvios> {
  try {
    const resposta = await cliente.comInstancia<FreioLiberado>(conexao.instanceToken, {
      caminho: `/instances/${conexao.instanceId}/brake/release`,
      metodo: "POST",
    })
    return { ok: true, motivoLiberado: resposta.released_reason }
  } catch (erro) {
    if (erro instanceof GatewayRecusou) {
      return { ok: false, erro: MENSAGEM_DA_RETOMADA[erro.code] ?? erro.message }
    }
    if (erro instanceof GatewayIndisponivel) {
      return {
        ok: false,
        erro: "O gateway não respondeu. Os envios continuam interrompidos; tente de novo em instantes.",
      }
    }
    throw erro
  }
}
