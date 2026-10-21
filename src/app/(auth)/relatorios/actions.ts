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
import { calcularRfv, type ResultadoRfv } from "@/lib/relatorios/rfv"
import { calcularCoortes, type ResultadoCoorte } from "@/lib/relatorios/coorte"
import { calcularFunilClientes, type ResultadoFunilClientes } from "@/lib/relatorios/funil-clientes"
import { calcularPainelDeCarteiras, type PainelDeCarteiras } from "@/lib/relatorios/carteiras"
import { registrarMudancasDeCarteira, type MotivoDaCarteira } from "@/lib/carteira"

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
      "id, contact_id, data, valor, desconto, pecas, atendente_id, forma_pagamento, origem, created_at, contato:contacts!inner(name, phone_number, cidade, uf, excluido_em, atendente:profiles!contacts_atendente_id_fkey(name)), vendedor:profiles!contact_purchases_atendente_id_fkey(name), pedido:catalog_orders!contact_purchases_catalog_order_id_fkey(number)"
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
    contato_atendente_nome: um(um(p.contato)?.atendente ?? null)?.name ?? null,
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

/** B33-01: RFV de hoje. Ativos = card da Recompra em etapa ativa; lembrete recente = criado nos últimos 15 dias. */
export async function buscarRfv(filtro: { atendenteId?: string | null }): Promise<ResultadoRfv | null> {
  const { supabase, user, perfil } = await sessaoAtual()
  if (!user || !perfil) return null
  const atendenteId = perfil.role === "atendente" ? user.id : (filtro.atendenteId ?? null)
  const dados = await carregarVendas(atendenteId)
  if (!dados) return null

  const ha15Dias = new Date(Date.now() - 15 * 86_400_000).toISOString()
  const [{ data: cards }, { data: lembretes }] = await Promise.all([
    supabase.from("pipeline_cards").select("contact_id").eq("workspace_id", perfil.workspace_id).eq("funil", "recompra").in("etapa", ETAPAS_RECOMPRA_ATIVAS),
    supabase.from("reminders").select("contact_id").eq("workspace_id", perfil.workspace_id).gte("created_at", ha15Dias),
  ])
  const atendenteDoContato = new Map<string, string | null>()
  for (const v of dados.vendas) if (!atendenteDoContato.has(v.contact_id)) atendenteDoContato.set(v.contact_id, v.contato_atendente_nome ?? null)

  return calcularRfv(dados.vendas, hojeNoFuso(), {
    ativos: new Set((cards ?? []).map((c) => c.contact_id).filter(Boolean) as string[]),
    comLembreteRecente: new Set((lembretes ?? []).map((l) => l.contact_id)),
    atendenteDoContato,
  })
}

const ETAPAS_RECOMPRA_ATIVAS = ["onboarding", "reposicao", "ativos"]

/** B34-01: coortes pelo mês da primeira venda, as 12 mais recentes. Mesma regra do atendente. */
export async function buscarCoorte(filtro: { atendenteId?: string | null }): Promise<ResultadoCoorte | null> {
  const { user, perfil } = await sessaoAtual()
  if (!user || !perfil) return null
  const atendenteId = perfil.role === "atendente" ? user.id : (filtro.atendenteId ?? null)
  const dados = await carregarVendas(atendenteId)
  if (!dados) return null
  return calcularCoortes(dados.vendas, hojeNoFuso())
}

/** B34-03: funil "1+ a 7+ compras" em toda a história. Mesma regra do atendente. */
export async function buscarFunilClientes(filtro: { atendenteId?: string | null }): Promise<ResultadoFunilClientes | null> {
  const { user, perfil } = await sessaoAtual()
  if (!user || !perfil) return null
  const atendenteId = perfil.role === "atendente" ? user.id : (filtro.atendenteId ?? null)
  const dados = await carregarVendas(atendenteId)
  if (!dados) return null
  return calcularFunilClientes(dados.vendas, hojeNoFuso())
}

export type LinhaDoHistoricoDeCarteira = {
  id: string
  quando: string
  contato: string
  de: string | null
  para: string | null
  motivo: MotivoDaCarteira
  por: string | null
}

export type ResultadoCarteiras = {
  papel: "admin" | "gerente" | "atendente"
  painel: PainelDeCarteiras
  /** Nulo para o Atendente. */
  historico: LinhaDoHistoricoDeCarteira[] | null
}

const ETAPAS_ATIVAS = ["onboarding", "reposicao", "ativos"]

/**
 * B35-01: painel de carteiras. Admin e Gerente veem a empresa inteira e o histórico; o
 * Atendente só o próprio cartão (a RLS já limita os contatos dele).
 */
export async function buscarCarteiras(): Promise<ResultadoCarteiras | null> {
  const { supabase, user, perfil } = await sessaoAtual()
  if (!user || !perfil) return null
  const atendente = perfil.role === "atendente"

  const [{ data: contatos }, { data: compras }, { data: cards }, { data: perfis }] = await Promise.all([
    supabase.from("contacts").select("id, atendente_id").eq("workspace_id", perfil.workspace_id).is("excluido_em", null),
    supabase.from("contact_purchases").select("contact_id").eq("workspace_id", perfil.workspace_id),
    supabase.from("pipeline_cards").select("contact_id").eq("workspace_id", perfil.workspace_id).eq("funil", "recompra").in("etapa", ETAPAS_ATIVAS),
    atendente
      ? supabase.from("profiles").select("id, name").eq("id", user.id)
      : supabase.from("profiles").select("id, name").eq("workspace_id", perfil.workspace_id).eq("status", "active").order("name"),
  ])
  const comCompra = new Set((compras ?? []).map((c) => c.contact_id))
  const ativos = new Set((cards ?? []).map((c) => c.contact_id).filter(Boolean) as string[])
  const lista = (contatos ?? [])
    .filter((c) => !atendente || c.atendente_id === user.id)
    .map((c) => ({ id: c.id, atendenteId: c.atendente_id, temCompra: comCompra.has(c.id), ativo: ativos.has(c.id) }))
  const vendedores = (perfis ?? []).map((p) => ({ id: p.id, nome: p.name as string }))
  const painel = calcularPainelDeCarteiras(lista, vendedores)

  let historico: LinhaDoHistoricoDeCarteira[] | null = null
  if (!atendente) {
    const { data } = await supabase
      .from("carteira_historico")
      .select("id, created_at, motivo, contato:contacts(name, phone_number), de:profiles!carteira_historico_de_atendente_id_fkey(name), para:profiles!carteira_historico_para_atendente_id_fkey(name), por:profiles!carteira_historico_alterado_por_fkey(name)")
      .eq("workspace_id", perfil.workspace_id)
      .order("created_at", { ascending: false })
      .limit(50)
    const um = <T,>(x: T | T[] | null): T | null => (Array.isArray(x) ? (x[0] ?? null) : x)
    historico = (data ?? []).map((h) => ({
      id: h.id,
      quando: h.created_at,
      contato: um(h.contato)?.name || um(h.contato)?.phone_number || "—",
      de: um(h.de)?.name ?? null,
      para: um(h.para)?.name ?? null,
      motivo: h.motivo as MotivoDaCarteira,
      por: um(h.por)?.name ?? null,
    }))
  }
  return { papel: perfil.role as ResultadoCarteiras["papel"], painel, historico }
}

/**
 * B35-02: muda o dono de todos os contatos de `de` para `para` (nulo = remover), com os
 * cards deles, e grava no histórico. Só Admin e Gerente. Devolve quantos mudaram.
 */
async function mudarCarteira(de: string, para: string | null, motivo: MotivoDaCarteira): Promise<{ erro?: string; quantidade?: number }> {
  const { supabase, user, perfil } = await sessaoAtual()
  if (!user || !perfil) return { erro: "Não autenticado" }
  if (!["admin", "gerente"].includes(perfil.role)) return { erro: "Sem permissão" }

  for (const id of [de, para]) {
    if (!id) continue
    const { data } = await supabase.from("profiles").select("id").eq("id", id).eq("workspace_id", perfil.workspace_id).maybeSingle()
    if (!data) return { erro: "Vendedor não encontrado" }
  }

  const { data: contatos, error: erroLista } = await supabase
    .from("contacts")
    .select("id")
    .eq("workspace_id", perfil.workspace_id)
    .eq("atendente_id", de)
    .is("excluido_em", null)
  if (erroLista) return { erro: "Não foi possível carregar a carteira. Tente novamente." }
  const ids = (contatos ?? []).map((c) => c.id)
  if (ids.length === 0) return { quantidade: 0 }

  const [{ error: e1 }, { error: e2 }] = await Promise.all([
    supabase.from("contacts").update({ atendente_id: para }).in("id", ids).eq("workspace_id", perfil.workspace_id),
    supabase.from("pipeline_cards").update({ atendente_id: para }).in("contact_id", ids).eq("workspace_id", perfil.workspace_id),
  ])
  if (e1 || e2) return { erro: para ? "Não foi possível transferir. Tente novamente." : "Não foi possível remover. Tente novamente." }

  await registrarMudancasDeCarteira(
    supabase,
    ids.map((contactId) => ({ workspaceId: perfil.workspace_id, contactId, de, para, motivo, por: user.id }))
  )
  return { quantidade: ids.length }
}

export async function transferirCarteira(de: string, para: string): Promise<{ erro?: string; quantidade?: number }> {
  if (!para || de === para) return { erro: "Escolha outro vendedor." }
  return mudarCarteira(de, para, "transferencia")
}

export async function removerCarteira(de: string): Promise<{ erro?: string; quantidade?: number }> {
  return mudarCarteira(de, null, "remocao")
}

/** Aplica um dono a cada contato (e aos cards dele) e grava no histórico. */
async function aplicarDonos(
  supabase: Awaited<ReturnType<typeof sessaoAtual>>["supabase"],
  workspaceId: string,
  por: string,
  atribuicoes: Array<{ contactId: string; para: string }>,
  motivo: MotivoDaCarteira
): Promise<boolean> {
  const porDono = new Map<string, string[]>()
  for (const a of atribuicoes) porDono.set(a.para, [...(porDono.get(a.para) ?? []), a.contactId])
  for (const [para, ids] of porDono) {
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from("contacts").update({ atendente_id: para }).in("id", ids).eq("workspace_id", workspaceId),
      supabase.from("pipeline_cards").update({ atendente_id: para }).in("contact_id", ids).eq("workspace_id", workspaceId),
    ])
    if (e1 || e2) return false
  }
  await registrarMudancasDeCarteira(
    supabase,
    atribuicoes.map((a) => ({ workspaceId, contactId: a.contactId, de: null, para: a.para, motivo, por }))
  )
  return true
}

/**
 * B35-03: contatos sem vendedor (na ordem de cadastro) divididos em rodízio entre os
 * vendedores marcados. `soComCompra` deixa os leads de fora. Só Admin e Gerente.
 */
export async function distribuirSemVendedor(vendedorIds: string[], soComCompra: boolean): Promise<{ erro?: string; quantidade?: number }> {
  const { supabase, user, perfil } = await sessaoAtual()
  if (!user || !perfil) return { erro: "Não autenticado" }
  if (!["admin", "gerente"].includes(perfil.role)) return { erro: "Sem permissão" }
  const ids = [...new Set(vendedorIds)]
  if (ids.length === 0) return { erro: "Escolha ao menos um vendedor." }

  const { data: perfis } = await supabase.from("profiles").select("id").in("id", ids).eq("workspace_id", perfil.workspace_id).eq("status", "active")
  if ((perfis ?? []).length !== ids.length) return { erro: "Vendedor não encontrado" }

  const [{ data: contatos, error: erroLista }, { data: compras }] = await Promise.all([
    supabase.from("contacts").select("id").eq("workspace_id", perfil.workspace_id).is("atendente_id", null).is("excluido_em", null).order("created_at"),
    supabase.from("contact_purchases").select("contact_id").eq("workspace_id", perfil.workspace_id),
  ])
  if (erroLista) return { erro: "Não foi possível carregar os contatos. Tente novamente." }
  const comCompra = new Set((compras ?? []).map((c) => c.contact_id))
  const elegiveis = (contatos ?? []).filter((c) => !soComCompra || comCompra.has(c.id))
  if (elegiveis.length === 0) return { quantidade: 0 }

  const atribuicoes = elegiveis.map((c, i) => ({ contactId: c.id, para: ids[i % ids.length] }))
  const ok = await aplicarDonos(supabase, perfil.workspace_id, user.id, atribuicoes, "distribuicao")
  return ok ? { quantidade: atribuicoes.length } : { erro: "Não foi possível distribuir. Tente novamente." }
}

/**
 * B35-03: cada contato sem vendedor passa a ser do atendente da última venda dele, quando
 * houver. Só Admin e Gerente.
 */
export async function reprocessarPelaUltimaVenda(): Promise<{ erro?: string; quantidade?: number }> {
  const { supabase, user, perfil } = await sessaoAtual()
  if (!user || !perfil) return { erro: "Não autenticado" }
  if (!["admin", "gerente"].includes(perfil.role)) return { erro: "Sem permissão" }

  const { data: contatos, error: erroLista } = await supabase
    .from("contacts").select("id").eq("workspace_id", perfil.workspace_id).is("atendente_id", null).is("excluido_em", null)
  if (erroLista) return { erro: "Não foi possível carregar os contatos. Tente novamente." }
  const semDono = new Set((contatos ?? []).map((c) => c.id))
  if (semDono.size === 0) return { quantidade: 0 }

  const { data: vendas } = await supabase
    .from("contact_purchases")
    .select("contact_id, atendente_id, data, created_at")
    .eq("workspace_id", perfil.workspace_id)
    .in("contact_id", [...semDono])
    .order("data", { ascending: false })
    .order("created_at", { ascending: false })
  // A primeira venda de cada contato na lista é a última no tempo; só vale se tem atendente.
  const ultima = new Map<string, string | null>()
  for (const v of vendas ?? []) if (!ultima.has(v.contact_id)) ultima.set(v.contact_id, v.atendente_id)
  const atribuicoes = [...ultima.entries()].filter((e): e is [string, string] => e[1] !== null).map(([contactId, para]) => ({ contactId, para }))
  if (atribuicoes.length === 0) return { quantidade: 0 }

  const ok = await aplicarDonos(supabase, perfil.workspace_id, user.id, atribuicoes, "ultima_venda")
  return ok ? { quantidade: atribuicoes.length } : { erro: "Não foi possível reprocessar. Tente novamente." }
}
