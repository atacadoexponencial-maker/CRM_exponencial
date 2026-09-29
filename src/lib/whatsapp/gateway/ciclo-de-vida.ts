// Ciclo de vida de um número do canal direto (B2-05): desconectar, encerrar no
// aparelho e remover.
//
// As três não são a mesma coisa, e a diferença é o que o cliente precisa
// entender antes de clicar:
//
//  - **desconectar** pausa e **guarda** a sessão: volta sem ler QR de novo;
//  - **encerrar no aparelho** derruba a sessão do celular: voltar exige QR novo;
//  - **remover** apaga sessão, mídias e fila no gateway, e é irreversível.
//
// Desconectar fecha o socket de verdade desde a A10-01, e a volta é a operação
// `reconectarInstancia` (A10-02/B9-02): sem QR, com a sessão guardada.

import { GatewayRecusou, type ClienteGateway } from "./cliente"
import type { EstadoInstanciaGateway } from "./tipos"

export type OperacaoDeCicloDeVida = "desconectar" | "encerrar_no_aparelho" | "remover"

type Rota = { caminho: (id: string) => string; metodo: "POST" | "DELETE" }

const ROTA: Record<OperacaoDeCicloDeVida, Rota> = {
  desconectar: { caminho: (id) => `/instances/${id}/disconnect`, metodo: "POST" },
  encerrar_no_aparelho: { caminho: (id) => `/instances/${id}/logout`, metodo: "POST" },
  remover: { caminho: (id) => `/instances/${id}`, metodo: "DELETE" },
}

/** Efeito de cada operação, em português, para a tela não ter que descrever. */
export const EFEITO: Record<OperacaoDeCicloDeVida, string> = {
  desconectar:
    "O número para de enviar e receber na hora, e o celular deixa de mostrar o CRM como ativo. A sessão fica guardada: para voltar, basta reconectar — sem ler o QR Code de novo.",
  encerrar_no_aparelho:
    "A sessão é encerrada no celular e o CRM sai de “Aparelhos conectados”. Para voltar, será preciso ler um novo QR Code.",
  remover:
    "O número sai do CRM e a conexão é apagada, junto com a sessão, as mídias guardadas e as mensagens que ainda estavam na fila. As conversas continuam no histórico. Não tem volta.",
}

const MENSAGEM_POR_CODIGO: Record<string, string> = {
  // Removida no gateway e ainda no CRM: a operação pedida já está feita do lado
  // de lá, e o CRM só precisa acertar a sua cópia.
  instance_not_found: "Esta conexão já não existe no gateway.",
  instance_forbidden: "Esta conexão pertence a outro workspace.",
  invalid_credentials:
    "O CRM não conseguiu se autenticar no gateway. Confira a configuração do servidor.",
}

export type ResultadoDaOperacao =
  | { ok: true; estado: EstadoInstanciaGateway }
  /** `jaNaoExiste`: o gateway não tem mais a instância; o CRM pode limpar a sua cópia. */
  | { ok: false; erro: string; jaNaoExiste: boolean }

/**
 * Executa a operação no gateway e devolve o estado resultante.
 *
 * Não grava nada: quem grava é a action, para o CRM e o gateway não ficarem em
 * estados diferentes sem ninguém perceber.
 */
export async function operarInstancia(
  cliente: ClienteGateway,
  instanceId: string,
  instanceToken: string,
  operacao: OperacaoDeCicloDeVida
): Promise<ResultadoDaOperacao> {
  const rota = ROTA[operacao]

  try {
    const resposta = await cliente.comInstancia<{ state: EstadoInstanciaGateway }>(instanceToken, {
      caminho: rota.caminho(instanceId),
      metodo: rota.metodo,
    })

    return { ok: true, estado: resposta.state }
  } catch (erro) {
    if (erro instanceof GatewayRecusou) {
      return {
        ok: false,
        erro: MENSAGEM_POR_CODIGO[erro.code] ?? erro.message,
        // Nas rotas de instância o token vai sempre, então 401 quer dizer que a
        // instância foi removida: o gateway responde assim de propósito, para
        // não confirmar a quem adivinha quais ids existem (`auth/hooks.ts` lá).
        jaNaoExiste: erro.code === "instance_not_found" || erro.code === "invalid_credentials",
      }
    }

    return {
      ok: false,
      erro: "O gateway não respondeu. Nada foi alterado; tente novamente em instantes.",
      jaNaoExiste: false,
    }
  }
}

export type ResultadoDaReconexao =
  | { ok: true; estado: EstadoInstanciaGateway }
  | {
      ok: false
      erro: string
      /** A sessão guardada acabou: o caminho é ler um QR novo para o mesmo número. */
      precisaQr: boolean
      jaNaoExiste: boolean
    }

const MENSAGEM_DA_RECONEXAO: Record<string, string> = {
  ...MENSAGEM_POR_CODIGO,
  no_saved_session:
    "Não foi possível reconectar: a sessão foi encerrada no aparelho. Para voltar, leia um QR Code novo — o número continua o mesmo.",
  instance_banned:
    "O WhatsApp bloqueou este número. Ler o código de novo não desfaz o bloqueio: é preciso conectar outro número.",
}

const SEM_RESPOSTA = "O gateway não respondeu. Nada foi alterado; tente novamente em instantes."

/**
 * Reconecta com a sessão guardada (A10-02): `POST /instances/{id}/reconnect`.
 *
 * O gateway responde `connecting` na hora e o desfecho chega depois, pelo
 * estado da instância. Como nas outras operações, nada é gravado aqui.
 */
export async function reconectarInstancia(
  cliente: ClienteGateway,
  instanceId: string,
  instanceToken: string
): Promise<ResultadoDaReconexao> {
  try {
    const resposta = await cliente.comInstancia<{ state: EstadoInstanciaGateway }>(instanceToken, {
      caminho: `/instances/${instanceId}/reconnect`,
      metodo: "POST",
    })
    return { ok: true, estado: resposta.state }
  } catch (erro) {
    if (erro instanceof GatewayRecusou) {
      return {
        ok: false,
        erro: MENSAGEM_DA_RECONEXAO[erro.code] ?? erro.message,
        precisaQr: erro.code === "no_saved_session",
        jaNaoExiste: erro.code === "instance_not_found" || erro.code === "invalid_credentials",
      }
    }
    return { ok: false, erro: SEM_RESPOSTA, precisaQr: false, jaNaoExiste: false }
  }
}

/**
 * Depois de desconectar, dá para voltar sem QR novo?
 *
 * Só quando a sessão foi preservada. Encerrada no aparelho ou removida, o
 * caminho é o pareamento (B2-03).
 */
export function reconectaSemQr(ultimaOperacao: OperacaoDeCicloDeVida | null): boolean {
  return ultimaOperacao === "desconectar"
}
