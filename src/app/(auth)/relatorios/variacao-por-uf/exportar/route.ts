// B32-06: baixa a variação por UF em Excel, com o mesmo filtro da tela e a linha de total.

import { sessaoAtual } from "@/lib/sessao"
import { gerarPlanilha, nomeDeArquivo, respostaPlanilha } from "@/lib/exportar-planilha"
import { COLUNAS_EXPORTACAO_POR_UF, nomeDaExportacao, periodoDaUrl } from "@/lib/relatorios/exportar-vendas"
import { buscarVariacaoPorUf } from "../../actions"

export async function GET(request: Request) {
  const { user } = await sessaoAtual()
  if (!user) return new Response("Sessão expirada.", { status: 401 })

  const q = new URL(request.url).searchParams
  const periodo = periodoDaUrl(q)
  if (!periodo) return new Response("Período inválido.", { status: 400 })
  const atendente = q.get("atendente")
  if (atendente && !/^[0-9a-f-]{36}$/i.test(atendente)) return new Response("Atendente inválido.", { status: 400 })

  const variacao = await buscarVariacaoPorUf({ periodo, atendenteId: atendente || null })
  if (!variacao) return new Response("Sessão expirada.", { status: 401 })

  const linhas = [...variacao.linhas, variacao.total]
  const nome = nomeDaExportacao(periodo).replace("vendas-", "variacao-por-uf-")
  return respostaPlanilha(gerarPlanilha(COLUNAS_EXPORTACAO_POR_UF, linhas, "Variação por UF"), nomeDeArquivo(nome))
}
