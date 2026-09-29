// Situação de um número desconectado do canal direto (B9-03).
//
// O cartão precisa distinguir três coisas que o banco guarda em dois campos:
//
//  - **pausa**: desconectado a pedido (`state_reason` nulo). Tem `disconnected_at`
//    e mostra "Desconectado há N dias"; a partir de `DIAS_PARA_AVISO` vem o aviso
//    de pausa longa;
//  - **queda**: `connection_lost`. O gateway tenta voltar sozinho; o cartão diz isso;
//  - **sessão encerrada / banido**: já têm aviso próprio, fora daqui.
//
// Só cálculo, sem I/O: quem lê o banco é a página, quem desenha é o cartão.

/** Dias de pausa a partir dos quais o cartão recomenda reconectar. */
export const DIAS_PARA_AVISO = 10
/** Dias sem uso do WhatsApp no celular após os quais o WhatsApp pode desfazer a conexão. */
export const DIAS_ATE_O_WHATSAPP_DESFAZER = 14

const DIA_MS = 24 * 60 * 60 * 1000

export type SituacaoDaPausa = {
  tipo: "pausa" | "queda" | null
  /** "Desconectado há 3 dias", ou nulo quando não é pausa. */
  desdeQuando: string | null
  dias: number
  pausaLonga: boolean
}

export function situacaoDaPausa(
  conexao: { status: string; stateReason: string | null; disconnectedAt: string | null },
  agora: Date = new Date()
): SituacaoDaPausa {
  const nada: SituacaoDaPausa = { tipo: null, desdeQuando: null, dias: 0, pausaLonga: false }
  if (conexao.status !== "disconnected") return nada

  if (conexao.stateReason === "connection_lost") {
    return { ...nada, tipo: "queda" }
  }

  // Pausa a pedido: sem motivo. Sem data (pausa anterior à coluna) mostra só o estado.
  if (conexao.stateReason || !conexao.disconnectedAt) return nada

  const inicio = new Date(conexao.disconnectedAt).getTime()
  if (Number.isNaN(inicio)) return nada

  const dias = Math.max(0, Math.floor((agora.getTime() - inicio) / DIA_MS))
  return {
    tipo: "pausa",
    desdeQuando: textoDesdeQuando(dias),
    dias,
    pausaLonga: dias >= DIAS_PARA_AVISO,
  }
}

function textoDesdeQuando(dias: number): string {
  if (dias === 0) return "Desconectado hoje"
  if (dias === 1) return "Desconectado há 1 dia"
  return `Desconectado há ${dias} dias`
}

/** Texto do aviso de pausa longa, aprovado na B9-01. */
export function textoDePausaLonga(dias: number): string {
  return `Este número está desconectado há ${dias} dias. Se o celular dele ficar mais de ${DIAS_ATE_O_WHATSAPP_DESFAZER} dias sem usar o WhatsApp, o WhatsApp pode desfazer a conexão, e aí será preciso ler um QR Code novo. Reconecte para evitar.`
}

/** Texto do aviso de queda, aprovado na B9-01. */
export const TEXTO_DE_QUEDA = "A conexão com o aparelho caiu. O canal está tentando voltar sozinho."
