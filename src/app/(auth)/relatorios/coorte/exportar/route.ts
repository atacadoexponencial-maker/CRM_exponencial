// B34-01: baixa a tabela de coorte (retenção ou valor médio) em Excel, no padrão da B30-04.

import { sessaoAtual } from "@/lib/sessao"
import { gerarPlanilha, nomeDeArquivo, respostaPlanilha } from "@/lib/exportar-planilha"
import { colunasExportacaoCoorte, type TabelaCoorte } from "@/lib/relatorios/exportar-coorte"
import { buscarCoorte } from "../../actions"

export async function GET(request: Request) {
  const { user } = await sessaoAtual()
  if (!user) return new Response("Sessão expirada.", { status: 401 })

  const q = new URL(request.url).searchParams
  const tabela = q.get("tabela")
  if (tabela !== "retencao" && tabela !== "valor") return new Response("Tabela inválida.", { status: 400 })
  const atendente = q.get("atendente")
  if (atendente && !/^[0-9a-f-]{36}$/i.test(atendente)) return new Response("Atendente inválido.", { status: 400 })

  const r = await buscarCoorte({ atendenteId: atendente || null })
  if (!r) return new Response("Sessão expirada.", { status: 401 })

  const nome = tabela === "retencao" ? "coorte-recompra" : "coorte-valor-medio"
  const aba = tabela === "retencao" ? "Recompra" : "Valor médio"
  return respostaPlanilha(gerarPlanilha(colunasExportacaoCoorte(tabela as TabelaCoorte), r.coortes, aba), nomeDeArquivo(`${nome}-${r.referencia}`))
}
