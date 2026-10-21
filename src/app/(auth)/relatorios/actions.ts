"use server"

import { sessaoAtual } from "@/lib/sessao"
import { compraEhDoAtendente } from "@/lib/metricas-dashboard"
import { ROTULO_FORMA_PAGAMENTO } from "@/lib/compras"
import {
  calcularCartoes,
  calcularGraficos,
  hojeNoFuso,
  type FiltroRelatorio,
  type GraficosVisaoGeral,
  type VendaRow,
  type VisaoGeralCartoes,
} from "@/lib/relatorios/visao-geral"

export type { FiltroRelatorio, PeriodoRelatorio, VisaoGeralCartoes } from "@/lib/relatorios/visao-geral"

export type VisaoGeral = VisaoGeralCartoes & {
  /** B32-04: vendas diárias, projeção do mês e forma de pagamento. */
  graficos: GraficosVisaoGeral
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
    .select("contact_id, data, valor, desconto, pecas, atendente_id, forma_pagamento, contato:contacts!inner(excluido_em)")
    .eq("workspace_id", perfil.workspace_id)
    .is("contato.excluido_em", null)

  let vendas = (data ?? []).map((p) => ({
    contact_id: p.contact_id,
    data: p.data,
    valor: Number(p.valor),
    desconto: p.desconto === null ? null : Number(p.desconto),
    pecas: p.pecas,
    atendente_id: p.atendente_id,
    forma_pagamento: p.forma_pagamento,
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
    atendenteId,
  }
}
