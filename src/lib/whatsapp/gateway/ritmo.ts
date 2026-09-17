// Leitura e escrita do ritmo de envio de um número (B5-02).
//
// Regra que governa o arquivo: **o gateway é a última palavra.** Ele já aplica
// os limites do sistema por conta própria e aperta o que vier largo, e os tetos
// do aquecimento continuam valendo por cima do configurado. A validação daqui
// existe para dar mensagem boa ao administrador — não para substituir essa
// rede.
//
// Por isso os limites **não são escritos no CRM**: chegam em `system_limits`,
// na mesma resposta, e alimentam o formulário e a conferência.

import { GatewayIndisponivel, GatewayRecusou, type ClienteGateway } from "./cliente"
import type { RitmoDoNumero } from "./tipos"

/** Campos que o administrador pode alterar. Qualquer subconjunto. */
export type AlteracaoDeRitmo = Partial<{
  send_interval_seconds: number
  hourly_cap: number
  daily_cap: number
  send_window_start: string
  send_window_end: string
}>

export type ConexaoComRitmo = { instanceId: string; instanceToken: string }

export type LeituraDeRitmo = { ok: true; ritmo: RitmoDoNumero } | { ok: false; erro: string }
export type EscritaDeRitmo = { ok: true; ritmo: RitmoDoNumero } | { ok: false; erro: string }

const MENSAGEM_POR_CODIGO: Record<string, string> = {
  instance_not_found: "O gateway não encontra mais este número.",
  invalid_credentials:
    "O CRM não conseguiu se autenticar no gateway. Confira a configuração do servidor.",
  instance_forbidden:
    "A credencial guardada não pertence a este número. Reconecte o número para gerar outra.",
}

function minutos(horario: string): number {
  const casou = /^(\d{2}):(\d{2})/.exec(horario)
  return casou ? Number(casou[1]) * 60 + Number(casou[2]) : Number.NaN
}

/**
 * Confere a alteração contra os limites que o gateway informou.
 *
 * Devolve a mensagem pronta para o administrador, dizendo **o limite e o valor
 * pedido** — "acima do permitido" sozinho obriga a adivinhar. `null` quando
 * está tudo dentro.
 */
export function conferirAlteracao(
  alteracao: AlteracaoDeRitmo,
  limites: RitmoDoNumero["system_limits"],
  atual: RitmoDoNumero["configured"]
): string | null {
  const { send_interval_seconds: intervalo, hourly_cap: hora, daily_cap: dia } = alteracao

  if (intervalo !== undefined && intervalo < limites.send_interval_seconds_min) {
    return `O intervalo mínimo entre mensagens é ${limites.send_interval_seconds_min} segundos, e você pediu ${intervalo}.`
  }
  if (hora !== undefined && (hora > limites.hourly_cap_max || hora < 1)) {
    return `O teto por hora vai de 1 a ${limites.hourly_cap_max} mensagens, e você pediu ${hora}.`
  }
  if (dia !== undefined && (dia > limites.daily_cap_max || dia < 1)) {
    return `O teto por dia vai de 1 a ${limites.daily_cap_max} mensagens, e você pediu ${dia}.`
  }

  // A janela é conferida junta com o valor atual: alterar só uma ponta pode
  // invertê-la, e cada metade isolada parece válida.
  const inicio = minutos(alteracao.send_window_start ?? atual.send_window_start)
  const fim = minutos(alteracao.send_window_end ?? atual.send_window_end)

  if (Number.isNaN(inicio) || Number.isNaN(fim)) return "Informe os horários no formato HH:MM."

  if (inicio < minutos(limites.send_window_earliest)) {
    return `A janela de envio não pode começar antes de ${limites.send_window_earliest}.`
  }
  if (fim > minutos(limites.send_window_latest)) {
    return `A janela de envio não pode terminar depois de ${limites.send_window_latest}.`
  }
  if (inicio >= fim) return "O fim da janela de envio precisa ser depois do início."

  return null
}

function traduzirFalha(erro: unknown): string {
  if (erro instanceof GatewayRecusou) {
    // `rate_profile_out_of_range` traz o limite na própria mensagem do gateway:
    // repeti-la é melhor do que reescrevê-la e arriscar divergir.
    return MENSAGEM_POR_CODIGO[erro.code] ?? erro.message
  }
  if (erro instanceof GatewayIndisponivel) {
    return "O gateway não respondeu. O ritmo não foi alterado; tente de novo em instantes."
  }
  throw erro
}

/** Ritmo configurado, o efetivo e os limites do sistema. */
export async function lerRitmo({
  cliente,
  conexao,
}: {
  cliente: ClienteGateway
  conexao: ConexaoComRitmo
}): Promise<LeituraDeRitmo> {
  try {
    const ritmo = await cliente.comInstancia<RitmoDoNumero>(conexao.instanceToken, {
      caminho: `/instances/${conexao.instanceId}/rate-profile`,
    })
    return { ok: true, ritmo }
  } catch (erro) {
    return { ok: false, erro: traduzirFalha(erro) }
  }
}

/**
 * Grava o ritmo no gateway.
 *
 * Confere antes contra os limites que o próprio gateway informou, para a recusa
 * chegar sem ida e volta. Se passar daqui e o gateway recusar mesmo assim, a
 * mensagem dele é a que vale — ele é a última palavra.
 */
export async function salvarRitmoNoGateway({
  cliente,
  conexao,
  alteracao,
  limites,
  atual,
}: {
  cliente: ClienteGateway
  conexao: ConexaoComRitmo
  alteracao: AlteracaoDeRitmo
  limites: RitmoDoNumero["system_limits"]
  atual: RitmoDoNumero["configured"]
}): Promise<EscritaDeRitmo> {
  const problema = conferirAlteracao(alteracao, limites, atual)
  if (problema) return { ok: false, erro: problema }

  try {
    const ritmo = await cliente.comInstancia<RitmoDoNumero>(conexao.instanceToken, {
      caminho: `/instances/${conexao.instanceId}/rate-profile`,
      metodo: "PATCH",
      corpo: alteracao,
    })
    return { ok: true, ritmo }
  } catch (erro) {
    return { ok: false, erro: traduzirFalha(erro) }
  }
}
