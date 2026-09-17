// Estado de uma conexão do canal direto (B2-04).
//
// O estado de verdade mora no gateway. O CRM guarda uma cópia para a tela não
// depender dele a cada carregamento — mas a cópia é sempre **reflexo**, nunca
// origem. É a lição da conexão Meta de julho, que ficou marcada como
// "connected" por meses depois de o acesso morrer.
//
// Dois caminhos escrevem aqui, e de propósito:
//  - durante o pareamento, o CRM **pergunta** (esta issue): a tela está aberta
//    e a resposta é imediata;
//  - depois, o gateway **avisa**, pelo evento `instance.state` (B6).
//
// Os dois gravam no mesmo lugar, por `aplicarEstadoDaInstancia`.

import { GatewayRecusou, type ClienteGateway } from "./cliente"
import type { EstadoInstanciaGateway, InstanciaNoGateway } from "./tipos"

/** Motivos de transição não solicitada, em português. Fonte: seção 3.3. */
export const TEXTO_DO_MOTIVO: Record<string, string> = {
  session_closed_on_device: "A sessão foi encerrada no aparelho.",
  banned_by_whatsapp: "O WhatsApp bloqueou este número.",
  connection_lost: "A conexão com o aparelho caiu.",
}

/** Motivo legível, ou o próprio valor quando o gateway mandar um novo. */
export function motivoEmPortugues(reason: string | null | undefined): string | null {
  if (!reason) return null
  return TEXTO_DO_MOTIVO[reason] ?? "A conexão mudou de estado."
}

/** Estados em que o pareamento ainda não terminou: vale continuar acompanhando. */
const EM_ANDAMENTO: EstadoInstanciaGateway[] = ["pairing", "connecting"]

export function pareamentoEmAndamento(estado: string): boolean {
  return EM_ANDAMENTO.includes(estado as EstadoInstanciaGateway)
}

export type EstadoDaConexao = {
  state: string
  phone_number: string | null
  display_name: string | null
  reason: string | null
}

export type ResultadoDoEstado =
  | { ok: true; estado: EstadoDaConexao }
  | { ok: false; erro: string }

const MENSAGEM_POR_CODIGO: Record<string, string> = {
  instance_not_found:
    "Esta conexão não existe mais no gateway. Remova-a do CRM e conecte o número de novo.",
  instance_forbidden: "Esta conexão pertence a outro workspace.",
  invalid_credentials:
    "O CRM não conseguiu se autenticar no gateway. Confira a configuração do servidor.",
}

/**
 * Pergunta ao gateway em que estado a instância está.
 *
 * `reason` não vem nesta resposta — o contrato o entrega no evento. Aqui ele
 * fica nulo, e nulo limpa o motivo velho em vez de deixá-lo grudado na tela.
 */
export async function consultarEstado(
  cliente: ClienteGateway,
  instanceId: string,
  instanceToken: string
): Promise<ResultadoDoEstado> {
  try {
    const instancia = await cliente.comInstancia<InstanciaNoGateway>(instanceToken, {
      caminho: `/instances/${instanceId}`,
    })

    return {
      ok: true,
      estado: {
        state: instancia.state,
        phone_number: instancia.phone_number ?? null,
        display_name: instancia.display_name ?? null,
        reason: null,
      },
    }
  } catch (erro) {
    if (erro instanceof GatewayRecusou) {
      return { ok: false, erro: MENSAGEM_POR_CODIGO[erro.code] ?? erro.message }
    }
    return { ok: false, erro: "O gateway não respondeu. Tente novamente em instantes." }
  }
}
