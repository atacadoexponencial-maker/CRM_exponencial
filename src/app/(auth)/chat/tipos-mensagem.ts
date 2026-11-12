export type TipoMensagem = "texto" | "imagem" | "audio" | "video" | "documento" | "figurinha" | "nota_interna"
export type DirecaoMensagem = "enviada" | "recebida"
/** `na_fila`: aceita pela fila do número do canal direto, ainda não saiu (B26-02). */
export type StatusMensagem = "na_fila" | "enviado" | "entregue" | "lido" | "falhou"

export interface Mensagem {
  id: string
  conversaId: string
  tipo: TipoMensagem
  direcao: DirecaoMensagem
  conteudo: string
  horario: string
  status?: StatusMensagem
  /** Por que o envio falhou, gravado junto da tentativa. */
  motivoFalha?: string
  replyDe?: { id: string; texto: string }
  /** B25-02: saiu do número pelo celular (ou WhatsApp Web), e não pelo CRM. */
  enviadaPeloCelular?: boolean
  /** B23-05: o contato editou a mensagem depois de mandar; `conteudo` já é o texto novo. */
  editada?: boolean
  /** B23-05: o contato apagou a mensagem; o balão mostra "Mensagem apagada". */
  apagada?: boolean
  /** Tipo do arquivo, com o codec quando é vídeo (ex.: "video/mp4; codecs=hvc1"). */
  tipoDoArquivo?: string
  /** Nome original do documento e a prévia dele, quando houver (20/10/2026). */
  nomeDoArquivo?: string
  miniatura?: string
}
