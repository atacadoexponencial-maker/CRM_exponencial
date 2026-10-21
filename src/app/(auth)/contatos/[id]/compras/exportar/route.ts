// B30-04: baixa o histórico de compras do contato em Excel. Quem pode ver o perfil pode
// exportar: `buscarDadosContato` já passa pelo RLS e devolve null para quem não pode.

import { sessaoAtual } from "@/lib/sessao"
import { buscarDadosContato } from "../../../actions"
import { gerarPlanilha, nomeDeArquivo, respostaPlanilha } from "@/lib/exportar-planilha"
import { COLUNAS_EXPORTACAO_COMPRAS } from "@/lib/exportar-compras"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await sessaoAtual()
  if (!user) return new Response("Sessão expirada.", { status: 401 })

  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Contato não encontrado.", { status: 404 })

  const contato = await buscarDadosContato(id)
  if (!contato) return new Response("Contato não encontrado.", { status: 404 })

  const bytes = gerarPlanilha(COLUNAS_EXPORTACAO_COMPRAS, contato.compras, "Compras")
  return respostaPlanilha(bytes, nomeDeArquivo(`compras-${contato.nome}`))
}
