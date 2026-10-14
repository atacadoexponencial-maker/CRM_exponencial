// Botões de variável do campo "Mensagem" da ação "enviar mensagem" (B22-14, pedido
// U3 da Marcelle): inserem a variável onde está o cursor. As variáveis são as que o
// envio preenche (`textoComVariaveis`, em src/lib/automacoes/envio.ts).

export const VARIAVEIS_DA_MENSAGEM = [
  { variavel: "{{nome_contato}}", rotulo: "Nome do contato" },
  { variavel: "{{primeiro_nome}}", rotulo: "Primeiro nome" },
  { variavel: "{{nome_vendedor}}", rotulo: "Nome do vendedor" },
] as const

/** Põe o trecho no lugar da seleção (ou no cursor) e diz onde o cursor fica depois dele. */
export function inserirNoCursor(
  texto: string,
  inicio: number,
  fim: number,
  trecho: string
): { texto: string; cursor: number } {
  return { texto: texto.slice(0, inicio) + trecho + texto.slice(fim), cursor: inicio + trecho.length }
}
