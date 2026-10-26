// B39-02: baixa os pedidos em Excel (abas Pedidos e Itens) ou em CSV (pedidos ou itens).
// Todos os papéis exportam (PER-B39-04); a action só lê pedidos da empresa de quem pede.
// "filtrados" usa os filtros da tela que vieram na URL; "todos" ignora os filtros.

import { gerarCsv, gerarPlanilhaComAbas, respostaCsv, respostaPlanilha } from "@/lib/exportar-planilha"
import {
  COLUNAS_ITENS,
  COLUNAS_PEDIDOS,
  filtrosDaUrl,
  nomeDaExportacao,
  type EscopoExportacao,
  type FormatoExportacao,
} from "@/lib/catalogo/exportar-pedidos"
import { pedidosParaExportar } from "../actions"
import { sessaoAtual } from "@/lib/sessao"
import { camposParaExportar, colunasDosCampos } from "@/lib/relatorios/colunas-dos-campos"
import type { PedidoResumo } from "../../components/lista-pedidos"

const FORMATOS: FormatoExportacao[] = ["xlsx", "csv-pedidos", "csv-itens"]
const ESCOPOS: EscopoExportacao[] = ["filtrados", "todos"]

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams
  const formato = q.get("formato") as FormatoExportacao
  const escopo = (q.get("escopo") ?? "filtrados") as EscopoExportacao
  if (!FORMATOS.includes(formato)) return new Response("Formato inválido.", { status: 400 })
  if (!ESCOPOS.includes(escopo)) return new Response("Escolha inválida.", { status: 400 })

  const filtros = filtrosDaUrl(q)
  const dados = await pedidosParaExportar(escopo === "todos" ? null : filtros)
  if ("erro" in dados) return new Response(dados.erro, { status: dados.status })

  // B38-08: uma coluna por campo personalizado, na ordem da empresa, pelo contato do pedido
  const { supabase } = await sessaoAtual()
  const campos = await camposParaExportar(supabase, dados.workspaceId, Object.values(dados.contatoDoPedido).filter((c): c is string => !!c))
  const colunasPedidos = [...COLUNAS_PEDIDOS, ...colunasDosCampos(campos, (p: PedidoResumo) => dados.contatoDoPedido[p.id])]

  const nome = nomeDaExportacao(formato, escopo, filtros)
  if (formato === "csv-pedidos") return respostaCsv(gerarCsv(colunasPedidos, dados.pedidos), nome)
  if (formato === "csv-itens") return respostaCsv(gerarCsv(COLUNAS_ITENS, dados.itens), nome)
  return respostaPlanilha(
    gerarPlanilhaComAbas([
      { nome: "Pedidos", colunas: colunasPedidos, linhas: dados.pedidos },
      { nome: "Itens", colunas: COLUNAS_ITENS, linhas: dados.itens },
    ]),
    nome
  )
}
