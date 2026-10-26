// B32-05: baixa as vendas do período em Excel, com o mesmo filtro da tela. A ação já
// aplica a regra do atendente (o Atendente só exporta as próprias vendas).

import { sessaoAtual } from "@/lib/sessao"
import { gerarPlanilha, nomeDeArquivo, respostaPlanilha } from "@/lib/exportar-planilha"
import { COLUNAS_EXPORTACAO_VENDAS, nomeDaExportacao, periodoDaUrl } from "@/lib/relatorios/exportar-vendas"
import { buscarVendasDoPeriodo } from "../../actions"
import { camposParaExportar, colunasDosCampos } from "@/lib/relatorios/colunas-dos-campos"
import type { VendaDaTabela } from "@/lib/relatorios/visao-geral"

export async function GET(request: Request) {
  const { supabase, user, perfil } = await sessaoAtual()
  if (!user) return new Response("Sessão expirada.", { status: 401 })

  const q = new URL(request.url).searchParams
  const periodo = periodoDaUrl(q)
  if (!periodo) return new Response("Período inválido.", { status: 400 })
  const atendente = q.get("atendente")
  if (atendente && !/^[0-9a-f-]{36}$/i.test(atendente)) return new Response("Atendente inválido.", { status: 400 })

  const vendas = await buscarVendasDoPeriodo({ periodo, atendenteId: atendente || null })
  if (!vendas) return new Response("Sessão expirada.", { status: 401 })

  // B38-08: uma coluna por campo personalizado, na ordem da empresa
  const campos = perfil ? await camposParaExportar(supabase, perfil.workspace_id, vendas.map((v) => v.contatoId)) : { campos: [], valores: new Map() }
  const colunas = [...COLUNAS_EXPORTACAO_VENDAS, ...colunasDosCampos(campos, (v: VendaDaTabela) => v.contatoId)]
  return respostaPlanilha(gerarPlanilha(colunas, vendas, "Vendas"), nomeDeArquivo(nomeDaExportacao(periodo)))
}
