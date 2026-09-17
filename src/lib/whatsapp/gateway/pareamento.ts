// Pareamento de um número pelo canal direto (B2-03): pedir o código ao gateway
// e desenhá-lo.
//
// O gateway entrega o **conteúdo bruto** do QR, não uma imagem — quem desenha é
// o CRM. O desenho acontece no servidor, com a biblioteca `qrcode`, e o que vai
// para o navegador é a imagem pronta. Duas razões: o conteúdo bruto não precisa
// circular no cliente, e o navegador não carrega biblioteca nenhuma para isso.
//
// **Renovar é pedir de novo.** Vencido sem leitura, o gateway gera outro código
// sozinho; o CRM chama o endpoint novamente para pegar o atual. Não há push
// esperando.

import QRCode from "qrcode"
import { GatewayRecusou, type ClienteGateway } from "./cliente"
import type { PareamentoPorCodigo, PareamentoPorQr } from "./tipos"

/** O QR pronto para a tela: imagem em data URL e o instante de vencimento. */
export type QrParaExibir = { imagem: string; expiresAt: string }

export type ResultadoDoPareamento<T> = { ok: true; dados: T } | { ok: false; erro: string }

/** Mensagens por código do contrato; fora da lista, a do gateway já é legível. */
const MENSAGEM_POR_CODIGO: Record<string, string> = {
  instance_not_found:
    "Esta conexão não existe mais no gateway. Remova-a do CRM e conecte o número de novo.",
  instance_forbidden: "Esta conexão pertence a outro workspace.",
  invalid_credentials:
    "O CRM não conseguiu se autenticar no gateway. Confira a configuração do servidor.",
  invalid_payload: "Informe o número com código do país, apenas dígitos.",
}

function traduzir(erro: unknown): string {
  if (erro instanceof GatewayRecusou) return MENSAGEM_POR_CODIGO[erro.code] ?? erro.message
  return "O gateway não respondeu. Tente novamente em instantes."
}

/**
 * Desenha o conteúdo do QR como imagem PNG em data URL.
 *
 * `errorCorrectionLevel: "M"` é o padrão do WhatsApp Web: nível alto aumentaria
 * a densidade do código sem ganho de leitura na tela.
 */
export async function desenharQr(conteudo: string): Promise<string> {
  return QRCode.toDataURL(conteudo, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 320,
  })
}

/** Pede o código visual e devolve a imagem pronta. */
export async function pedirQrDoGateway(
  cliente: ClienteGateway,
  instanceId: string,
  instanceToken: string
): Promise<ResultadoDoPareamento<QrParaExibir>> {
  let resposta: PareamentoPorQr
  try {
    resposta = await cliente.comInstancia<PareamentoPorQr>(instanceToken, {
      caminho: `/instances/${instanceId}/pair/qr`,
      metodo: "POST",
    })
  } catch (erro) {
    return { ok: false, erro: traduzir(erro) }
  }

  return {
    ok: true,
    dados: { imagem: await desenharQr(resposta.qr), expiresAt: resposta.expires_at },
  }
}

/**
 * Pede o código digitado para um número.
 *
 * O número é conferido aqui antes de viajar: o gateway recusaria com
 * `invalid_payload`, e uma ida à rede para descobrir o que já se sabia não
 * ajuda ninguém.
 */
export async function pedirCodigoDoGateway(
  cliente: ClienteGateway,
  instanceId: string,
  instanceToken: string,
  numero: string
): Promise<ResultadoDoPareamento<PareamentoPorCodigo>> {
  const digitos = numero.replace(/\D/g, "")

  // E.164: 8 a 15 dígitos, com código do país.
  if (digitos.length < 10 || digitos.length > 15) {
    return { ok: false, erro: "Informe o número com código do país, apenas dígitos." }
  }

  try {
    const resposta = await cliente.comInstancia<PareamentoPorCodigo>(instanceToken, {
      caminho: `/instances/${instanceId}/pair/code`,
      metodo: "POST",
      corpo: { phone_number: digitos },
    })
    return { ok: true, dados: resposta }
  } catch (erro) {
    return { ok: false, erro: traduzir(erro) }
  }
}
