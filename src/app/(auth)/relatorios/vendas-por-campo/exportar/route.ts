// B38-08: baixa a tabela "Vendas por campo" em Excel, com o mesmo filtro da tela e a
// linha de total.

import { sessaoAtual } from "@/lib/sessao"
import { gerarPlanilha, nomeDeArquivo, respostaPlanilha } from "@/lib/exportar-planilha"
import { colunasExportacaoPorCampo, filtroPorCampoDaUrl, nomeDaExportacao, periodoDaUrl } from "@/lib/relatorios/exportar-vendas"
import { buscarVendasPorCampo } from "../../actions"

export async function GET(request: Request) {
  const { user } = await sessaoAtual()
  if (!user) return new Response("Sessão expirada.", { status: 401 })

  const q = new URL(request.url).searchParams
  const periodo = periodoDaUrl(q)
  if (!periodo) return new Response("Período inválido.", { status: 400 })
  const atendente = q.get("atendente")
  if (atendente && !/^[0-9a-f-]{36}$/i.test(atendente)) return new Response("Atendente inválido.", { status: 400 })
  const agrupar = q.get("agrupar") ?? ""
  if (!/^[0-9a-f-]{36}$/i.test(agrupar)) return new Response("Campo inválido.", { status: 400 })

  const resultado = await buscarVendasPorCampo({ periodo, atendenteId: atendente || null, campo: filtroPorCampoDaUrl(q), agrupar })
  if (!resultado) return new Response("Sessão expirada.", { status: 401 })
  if ("erro" in resultado) return new Response(resultado.erro, { status: 400 })

  const linhas = [...resultado.variacao.linhas, resultado.variacao.total]
  const nome = nomeDaExportacao(periodo).replace("vendas-", `vendas-por-${resultado.campo.nome.toLowerCase().replace(/\s+/g, "-")}-`)
  return respostaPlanilha(gerarPlanilha(colunasExportacaoPorCampo(resultado.campo.nome), linhas, "Vendas por campo"), nomeDeArquivo(nome))
}
