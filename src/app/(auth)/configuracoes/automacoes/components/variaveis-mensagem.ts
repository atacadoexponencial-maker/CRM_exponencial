// Botões de variável do campo "Mensagem" da ação "enviar mensagem" (B22-14, pedido
// U3 da Marcelle): inserem a variável onde está o cursor. As variáveis são as que o
// envio preenche (`textoComVariaveis`, em src/lib/automacoes/envio.ts).
// B38-05: cada botão pede o texto reserva, e os campos personalizados ganham botão.

import { chaveDaVariavel } from "@/lib/variaveis-mensagem"
import type { VariavelDoBotao } from "@/components/shared/texto-com-variaveis"
import type { OpcoesEditor } from "./catalogo"

export { inserirNoCursor } from "@/lib/variaveis-mensagem"

export const VARIAVEIS_DA_MENSAGEM: VariavelDoBotao[] = [
  { chave: "nome_contato", rotulo: "Nome do contato" },
  { chave: "primeiro_nome", rotulo: "Primeiro nome" },
  { chave: "nome_vendedor", rotulo: "Nome do vendedor" },
]

/** As fixas e uma por campo personalizado da empresa, na ordem dela (CA-B38-41). */
export function variaveisDaAutomacao(opcoes: OpcoesEditor): VariavelDoBotao[] {
  return [...VARIAVEIS_DA_MENSAGEM, ...(opcoes.camposPersonalizados ?? []).map((c) => ({ chave: chaveDaVariavel(c.nome), rotulo: c.nome }))]
}
