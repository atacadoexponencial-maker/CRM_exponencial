// B32-05: baixa as vendas do período em Excel, com o mesmo filtro da tela. A ação já
// aplica a regra do atendente (o Atendente só exporta as próprias vendas).

import { sessaoAtual } from "@/lib/sessao"
import { gerarPlanilha, nomeDeArquivo, respostaPlanilha } from "@/lib/exportar-planilha"
import { COLUNAS_EXPORTACAO_VENDAS, nomeDaExportacao, periodoDaUrl } from "@/lib/relatorios/exportar-vendas"
import { buscarVendasDoPeriodo } from "../../actions"

export async function GET(request: Request) {
  const { user } = await sessaoAtual()
  if (!user) return new Response("Sessão expirada.", { status: 401 })

  const q = new URL(request.url).searchParams
  const periodo = periodoDaUrl(q)
  if (!periodo) return new Response("Período inválido.", { status: 400 })
  const atendente = q.get("atendente")
  if (atendente && !/^[0-9a-f-]{36}$/i.test(atendente)) return new Response("Atendente inválido.", { status: 400 })

  const vendas = await buscarVendasDoPeriodo({ periodo, atendenteId: atendente || null })
  if (!vendas) return new Response("Sessão expirada.", { status: 401 })

  return respostaPlanilha(gerarPlanilha(COLUNAS_EXPORTACAO_VENDAS, vendas, "Vendas"), nomeDeArquivo(nomeDaExportacao(periodo)))
}
