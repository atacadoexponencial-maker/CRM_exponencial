export type StatusConversa = "em_espera" | "em_atendimento" | "resolvida"
export type FiltroVisibilidade = "minhas" | "meu_time" | "todas"
export type FiltroStatus = "todas" | StatusConversa

/**
 * Canal e número que atendem a conversa (B7-02).
 *
 * `recursos` vem calculado do backend: a interface não decide o que um canal
 * faz, ela exibe o que recebeu. `nome` é nulo na conversa antiga que não tem
 * número gravado — o envio cai no número do workspace, e a tela diz isso.
 */
export interface CanalDaConversa {
  /** Conexão dona da conversa. É por ela que o filtro por número agrupa. */
  id: string | null
  nome: string | null
  numero: string | null
  recursos: { templates: boolean; midia: boolean; marcar_lida: boolean }
}

export interface Conversa {
  id: string
  /** `fotoUrl`: endereço assinado da foto de perfil (B29), ou null. */
  contato: { nome: string | null; telefone: string; contactId: string | null; fotoUrl?: string | null }
  ultimaMensagem: { texto: string; horario: string }
  naoLidas: number
  status: StatusConversa
  etiquetas: Array<{ id: string; nome: string; cor: string }>
  atribuidaA: string | null
  dataPrimeiroContato: string
  canal: CanalDaConversa
  /** `last_message_at` em ISO: cursor da paginação da caixa (B10-04). */
  atividadeEm?: string
}
