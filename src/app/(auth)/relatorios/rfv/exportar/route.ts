// B33-02: baixa a lista de clientes por perfil RFV em Excel, com o filtro atual da tela.
// A ação já aplica a regra do atendente (o Atendente só exporta os próprios clientes).

import { sessaoAtual } from "@/lib/sessao"
import { gerarPlanilha, nomeDeArquivo, respostaPlanilha } from "@/lib/exportar-planilha"
import { COLUNAS_EXPORTACAO_RFV, filtrarClientesRfv, filtroDaUrl } from "@/lib/relatorios/exportar-rfv"
import { PERFIL_POR_ID } from "@/lib/relatorios/rfv"
import { buscarRfv } from "../../actions"

export async function GET(request: Request) {
  const { user } = await sessaoAtual()
  if (!user) return new Response("Sessão expirada.", { status: 401 })

  const q = new URL(request.url).searchParams
  const filtro = filtroDaUrl(q)
  if (!filtro) return new Response("Filtro inválido.", { status: 400 })
  const atendente = q.get("atendente")
  if (atendente && !/^[0-9a-f-]{36}$/i.test(atendente)) return new Response("Atendente inválido.", { status: 400 })

  const rfv = await buscarRfv({ atendenteId: atendente || null })
  if (!rfv) return new Response("Sessão expirada.", { status: 401 })

  const linhas = filtrarClientesRfv(rfv.clientes, filtro)
  const nome = filtro.perfil ? `rfv-${PERFIL_POR_ID[filtro.perfil].nome}` : filtro.celula ? `rfv-r${filtro.celula.r}-fv${filtro.celula.fv}` : "rfv-clientes"
  return respostaPlanilha(gerarPlanilha(COLUNAS_EXPORTACAO_RFV, linhas, "Clientes RFV"), nomeDeArquivo(`${nome}-${rfv.referencia}`))
}
