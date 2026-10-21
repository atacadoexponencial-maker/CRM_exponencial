"use server"

import { sessaoAtual } from "@/lib/sessao"
import { compraEhDoAtendente } from "@/lib/metricas-dashboard"
import { ROTULO_FORMA_PAGAMENTO, ROTULO_ORIGEM_COMPRA } from "@/lib/compras"
import {
  calcularCartoes,
  calcularGraficos,
  historicoDe25Meses,
  hojeNoFuso,
  intervaloDoPeriodo,
  variacaoPorUf,
  vendasDoPeriodo,
  type FiltroRelatorio,
  type GraficosVisaoGeral,
  type MesDoHistorico,
  type VariacaoPorUf,
  type VendaDaTabela,
  type VendaRow,
  type VisaoGeralCartoes,
} from "@/lib/relatorios/visao-geral"

export type { FiltroRelatorio, PeriodoRelatorio, VisaoGeralCartoes } from "@/lib/relatorios/visao-geral"

export type VisaoGeral = VisaoGeralCartoes & {
  /** B32-04: vendas diárias, projeção do mês e forma de pagamento. */
  graficos: GraficosVisaoGeral
  /** B32-05: as vendas do período, da mais recente para a mais antiga. */
  tabela: VendaDaTabela[]
  /** B32-06: variação por UF e os últimos 25 meses. */
  porUf: VariacaoPorUf
  mesesHistorico: MesDoHistorico[]
  /** Atendente que de fato valeu (o Atendente só vê o próprio). */
  atendenteId: string | null
}

/**
 * B32-03: compras da empresa para a Visão Geral. Compra de contato na lixeira não
 * conta (B13-03). Com filtro de atendente, valem as compras dele e, das sem
 * atendente, as dos contatos dele (regra da B30-03, a mesma do Dashboard).
 */
async function carregarVendas(atendenteId: string | null) {
  const { supabase, user, perfil } = await sessaoAtual()
  if (!user || !perfil) return null

  const { data } = await supabase
    .from("contact_purchases")
    .select(
      "id, contact_id, data, valor, desconto, pecas, atendente_id, forma_pagamento, origem, created_at, contato:contacts!inner(name, phone_number, cidade, uf, excluido_em), vendedor:profiles!contact_purchases_atendente_id_fkey(name), pedido:catalog_orders!contact_purchases_catalog_order_id_fkey(number)"
    )
    .eq("workspace_id", perfil.workspace_id)
    .is("contato.excluido_em", null)

  const um = <T,>(x: T | T[] | null): T | null => (Array.isArray(x) ? (x[0] ?? null) : x)
  let vendas = (data ?? []).map((p) => ({
    id: p.id,
    contact_id: p.contact_id,
    data: p.data,
    valor: Number(p.valor),
    desconto: p.desconto === null ? null : Number(p.desconto),
    pecas: p.pecas,
    atendente_id: p.atendente_id,
    forma_pagamento: p.forma_pagamento,
    origem: p.origem,
    created_at: p.created_at,
    pedido_numero: um(p.pedido)?.number ?? null,
    atendente_nome: um(p.vendedor)?.name ?? null,
    contato_nome: um(p.contato)?.name ?? null,
    contato_telefone: um(p.contato)?.phone_number ?? null,
    contato_cidade: um(p.contato)?.cidade ?? null,
    contato_uf: um(p.contato)?.uf ?? null,
  })) as VendaRow[]

  if (atendenteId) {
    const { data: cards } = await supabase
      .from("pipeline_cards")
      .select("contact_id")
      .eq("workspace_id", perfil.workspace_id)
      .eq("atendente_id", atendenteId)
    const contatosDoAtendente = new Set((cards ?? []).map((c) => c.contact_id).filter(Boolean) as string[])
    vendas = vendas.filter((v) => compraEhDoAtendente(v, atendenteId, contatosDoAtendente))
  }

  return { perfil, user, vendas }
}

export async function buscarVisaoGeral(filtro: FiltroRelatorio): Promise<VisaoGeral | null> {
  const { user, perfil } = await sessaoAtual()
  if (!user || !perfil) return null

  // O Atendente vê só o que é dele, peça o que pedir.
  const atendenteId = perfil.role === "atendente" ? user.id : (filtro.atendenteId ?? null)
  const dados = await carregarVendas(atendenteId)
  if (!dados) return null

  const hoje = hojeNoFuso()
  return {
    ...calcularCartoes(dados.vendas, filtro.periodo, hoje),
    graficos: calcularGraficos(dados.vendas, filtro.periodo, hoje, ROTULO_FORMA_PAGAMENTO),
    tabela: vendasDoPeriodo(dados.vendas, intervaloDoPeriodo(filtro.periodo, hoje), ROTULOS_DA_TABELA),
    porUf: variacaoPorUf(dados.vendas, filtro.periodo, hoje),
    mesesHistorico: historicoDe25Meses(dados.vendas, hoje),
    atendenteId,
  }
}

/** B32-06: só a variação por UF, para a rota de exportação. Mesma regra do atendente. */
export async function buscarVariacaoPorUf(filtro: FiltroRelatorio): Promise<VariacaoPorUf | null> {
  const { user, perfil } = await sessaoAtual()
  if (!user || !perfil) return null
  const atendenteId = perfil.role === "atendente" ? user.id : (filtro.atendenteId ?? null)
  const dados = await carregarVendas(atendenteId)
  if (!dados) return null
  return variacaoPorUf(dados.vendas, filtro.periodo, hojeNoFuso())
}

const ROTULOS_DA_TABELA = { origem: ROTULO_ORIGEM_COMPRA, forma: ROTULO_FORMA_PAGAMENTO }

/** B32-05: só a tabela, para a rota de exportação. Mesma regra do atendente. */
export async function buscarVendasDoPeriodo(filtro: FiltroRelatorio): Promise<VendaDaTabela[] | null> {
  const { user, perfil } = await sessaoAtual()
  if (!user || !perfil) return null
  const atendenteId = perfil.role === "atendente" ? user.id : (filtro.atendenteId ?? null)
  const dados = await carregarVendas(atendenteId)
  if (!dados) return null
  return vendasDoPeriodo(dados.vendas, intervaloDoPeriodo(filtro.periodo, hojeNoFuso()), ROTULOS_DA_TABELA)
}
