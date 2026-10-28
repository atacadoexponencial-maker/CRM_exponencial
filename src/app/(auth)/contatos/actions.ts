"use server"

import { enderecoDoFunil, lerNomesDosFunis } from "@/lib/funis"
import { createClient } from "@/integrations/supabase/server"
import { sessaoAtual } from "@/lib/sessao"
import type { Contato, ContatoPerfil, ClassificacaoContato, TipoContato, ICP } from "./mock-contatos"
import { TAMANHO_PAGINA_CONTATOS } from "./mock-contatos"
import type { Database, Json } from "@/integrations/supabase/types"
import {
  esquemaFiltro,
  esquemaRapidos,
  limparFiltro,
  ehCampoDeFunil,
  ehCampoPersonalizado,
  campoPersonalizado,
  type CampoParaFiltro,
  type FunilParaFiltro,
  FILTRO_VAZIO,
  type Condicao,
  type Filtro,
} from "@/lib/filtro-contatos"
import { calcularClassificacao } from "./classificacao"
import { createServiceClient } from "@/integrations/supabase/service"
import { tirarDaLixeira } from "@/lib/lixeira"
import { criarCardDeEntrada } from "@/lib/card-de-entrada"
import { buscarEGuardarFotoDoContato, urlAssinadaDaFoto } from "@/lib/whatsapp/foto-de-perfil"
import { dispararCamposAlterados, dispararDadosAlterados, dispararTagAdicionada } from "@/lib/automacoes/gatilhos-do-crm"
import { normalizarWhatsapp, TELEFONE_INVALIDO } from "@/lib/telefone"
import { perfilDoMapa, perfisRfvDosContatos } from "@/lib/perfil-rfv-do-contato"
import { esquemaCompra, type CompraEntrada, type FormaPagamento, type OrigemCompra } from "@/lib/compras"
import { normalizarUf, UF_INVALIDA } from "@/lib/uf"
import { canonicoDoValor, type EntradaDoCampo, type ValorGuardado } from "@/lib/campos-personalizados"
import { camposDaEmpresa, conferirEntradas, gravarValores, valoresDosContatos } from "@/lib/campos-personalizados-servidor"
import { conferirColunasOcultas } from "./colunas"

const CONTACT_SELECT = "id, name, phone_number, classificacao, tipo, cidade, uf, created_at, profiles!contacts_atendente_id_fkey(name)"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapContato(c: any): Contato {
  return {
    id: c.id,
    nome: c.name || c.phone_number,
    telefone: c.phone_number,
    classificacao: (c.classificacao ?? "sem_historico") as ClassificacaoContato,
    tipo: (c.tipo ?? null) as TipoContato | null,
    cidade: c.cidade ?? null,
    uf: c.uf ?? null,
    atendente: c.profiles?.name ?? null,
    created_at: c.created_at,
  }
}

export async function verificarNumeroDuplicado(telefoneDigitado: string): Promise<boolean> {
  const telefone = normalizarWhatsapp(telefoneDigitado)
  if (!telefone) return false

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data: profile } = await supabase
    .from("profiles")
    .select("workspace_id")
    .eq("id", user.id)
    .single()

  if (!profile) return false

  const { count } = await supabase
    .from("contacts")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", profile.workspace_id)
    .eq("phone_number", telefone)
    // B13-05: telefone de contato na lixeira não é "já cadastrado" — criar o restaura.
    .is("excluido_em", null)

  return (count ?? 0) > 0
}

export async function criarContato(dados: {
  nome: string
  telefone: string
  tipo?: string | null
  cidade?: string | null
  uf?: string | null
  /** B38-02: campos personalizados (id do campo → entrada), todos opcionais. */
  campos?: Record<string, EntradaDoCampo>
}): Promise<{ erro?: string; erros?: Record<string, string>; id?: string; restaurado?: boolean }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: "Não autenticado" }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, workspace_id")
    .eq("id", user.id)
    .single()

  if (!profile) return { erro: "Perfil não encontrado" }
  if (profile.role === "atendente") return { erro: "Sem permissão para criar contatos" }

  // QA M13/M14 (06/10): o servidor confere nome e telefone, não só a tela.
  const nome = dados.nome.trim()
  if (!nome) return { erro: "Informe o nome do contato." }
  if (nome.length > 120) return { erro: "O nome passa de 120 caracteres." }
  const telefone = normalizarWhatsapp(dados.telefone)
  if (!telefone) return { erro: TELEFONE_INVALIDO }
  // B32-02: UF só da lista das 27, ou vazia.
  const uf = normalizarUf(dados.uf)
  if (uf === undefined) return { erro: UF_INVALIDA }
  // B38-02: os campos são conferidos antes de criar; com erro, o contato não nasce.
  const camposDaEmpresaDoContato = await camposDaEmpresa(supabase, profile.workspace_id)
  const campos = conferirEntradas(camposDaEmpresaDoContato, dados.campos ?? {})
  if ("erro" in campos || "erros" in campos) return campos

  // B13-05: telefone de contato na lixeira restaura o contato antigo, com o
  // histórico (os dados antigos ficam), em vez de criar outro.
  const { data: naLixeira } = await supabase
    .from("contacts")
    .select("id")
    .eq("workspace_id", profile.workspace_id)
    .eq("phone_number", telefone)
    .not("excluido_em", "is", null)
    .maybeSingle()
  if (naLixeira) {
    try {
      await tirarDaLixeira(createServiceClient(), profile.workspace_id, naLixeira.id)
    } catch {
      return { erro: "Erro ao criar contato. Tente novamente." }
    }
    // QA M11 (06/10): a tela avisa que o nome digitado não valeu.
    return { id: naLixeira.id, restaurado: true }
  }

  const { data, error } = await supabase
    .from("contacts")
    .insert({
      workspace_id: profile.workspace_id,
      phone_number: telefone,
      name: nome,
      tipo: dados.tipo ?? null,
      cidade: dados.cidade ?? null,
      uf,
    })
    .select("id")
    .single()

  if (error) {
    if (error.code === "23505") return { erro: "Número já cadastrado neste workspace" }
    return { erro: "Erro ao criar contato. Tente novamente." }
  }

  // B45-01: todo contato nasce com card na Entrada
  const comCard = await criarCardDeEntrada(createServiceClient(), profile.workspace_id, data.id)

  // B38-02: o contato já existe; os campos conferidos são gravados nele.
  const gravado = await gravarValores(supabase, profile.workspace_id, data.id, campos)
  if (gravado.erro) return { id: data.id, erro: "Contato criado, mas os campos personalizados não foram salvos." }
  // B38-04: campo preenchido no cadastro também é "dado do contato alterado"
  await dispararCamposAlterados(
    profile.workspace_id,
    data.id,
    campos.gravar.flatMap(({ campoId, valor }) => {
      const campo = camposDaEmpresaDoContato.find((c) => c.id === campoId)
      return campo ? [{ campo: campoPersonalizado(campo), valor: canonicoDoValor(campo.tipo, valor) }] : []
    })
  )

  // B29-02: a foto vem pelo canal direto, depois de o contato existir. Nunca falha.
  await buscarEGuardarFotoDoContato({ workspaceId: profile.workspace_id, contactId: data.id, telefone })

  if (!comCard) return { id: data.id, erro: "Contato criado, mas o card no Funil de Entrada não foi criado." }
  return { id: data.id }
}

const ETAPA_RECOMPRA_LABEL: Record<string, string> = {
  onboarding: "Onboarding",
  reposicao: "Reposição",
  ativos: "Ativos",
  ativos_ri: "Ativos RI",
  inativos: "Inativos",
  inativos_rp: "Inativos RP",
  perdidos: "Perdidos",
}

const ETAPA_ENTRADA_LABEL: Record<string, string> = {
  lead: "Lead",
  sondagem: "Sondagem",
  catalogo_enviado: "Catálogo Enviado",
  follow_catalogo: "Follow do Catálogo",
  negociacao: "Negociação",
  nutricao: "Nutrição",
  ganho: "Ganho",
  perdido: "Perdido",
}


const PERFIL_SELECT = "id, workspace_id, name, phone_number, tipo, cidade, uf, icp, observacoes, created_at, atendente_id, photo_path"

function formatarDataEvento(iso: string): string {
  const d = new Date(iso)
  const dia = String(d.getDate()).padStart(2, "0")
  const mes = String(d.getMonth() + 1).padStart(2, "0")
  const ano = d.getFullYear()
  const hora = String(d.getHours()).padStart(2, "0")
  const min = String(d.getMinutes()).padStart(2, "0")
  return `${dia}/${mes}/${ano} ${hora}:${min}`
}

const ETAPA_LABEL_ALL: Record<string, string> = {
  lead: "Lead",
  sondagem: "Sondagem",
  catalogo_enviado: "Catálogo Enviado",
  follow_catalogo: "Follow do Catálogo",
  negociacao: "Negociação",
  nutricao: "Nutrição",
  ganho: "Ganho",
  onboarding: "Onboarding",
  reposicao: "Reposição",
  ativos: "Ativos",
  ativos_ri: "Ativos RI",
  inativos: "Inativos",
  inativos_rp: "Inativos RP",
  perdidos: "Perdidos",
  perdido: "Perdido",
}

export async function buscarDadosContato(id: string): Promise<ContatoPerfil | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data }, { data: cardsData }, { data: tagsData }, { data: comprasData }, { data: conversacoesData }, { data: pedidosData }] = await Promise.all([
    supabase
      .from("contacts")
      .select(PERFIL_SELECT)
      .eq("id", id)
      .is("excluido_em", null)
      .single(),
    supabase
      .from("pipeline_cards")
      .select("id, funil, etapa, created_at, atendente_id, profiles!pipeline_cards_atendente_id_fkey(name)")
      .eq("contact_id", id),
    supabase
      .from("contact_tags")
      .select("tag")
      .eq("contact_id", id)
      .order("created_at"),
    supabase
      .from("contact_purchases")
      // B30-01: campos dos relatórios e o nome de quem vendeu.
      .select("id, data, valor, created_at, pecas, desconto, forma_pagamento, origem, catalog_order_id, vendedor:profiles!contact_purchases_atendente_id_fkey(name), pedido:catalog_orders!contact_purchases_catalog_order_id_fkey(number)")
      .eq("contact_id", id)
      .order("data", { ascending: false }),
    supabase
      .from("conversations")
      .select("id, created_at, assigned_to, profiles!assigned_to(name)")
      .eq("contact_id", id)
      .order("last_message_at", { ascending: false }),
    // B16-10: pedidos feitos pela loja do catálogo.
    supabase
      .from("catalog_orders")
      .select("id, number, created_at, customer_name, customer_whatsapp, pieces, total, status")
      .eq("contact_id", id)
      .order("created_at", { ascending: false }),
  ])

  if (!data) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = data as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawCards = (cardsData ?? []) as Array<any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawConversas = (conversacoesData ?? []) as Array<any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawCompras = (comprasData ?? []) as Array<any>

  // B41-01/B41-03: card de funil da empresa guarda o id do funil e o id da etapa.
  const nomesNovos = await lerNomesDosFunis(supabase, rawCards.map((card) => card.funil as string))
  const nomesDosFunisNovos = nomesNovos.funis
  const nomesDasEtapasNovas = nomesNovos.etapas

  const cards = rawCards
    .filter((card) => card.funil === "entrada" || card.funil === "recompra" || nomesDosFunisNovos[card.funil])
    .map((card) =>
      card.funil === "entrada" || card.funil === "recompra"
        ? {
            funil: card.funil as string,
            etapaLabel: card.funil === "recompra" ? (ETAPA_RECOMPRA_LABEL[card.etapa] ?? card.etapa) : (ETAPA_ENTRADA_LABEL[card.etapa] ?? card.etapa),
            href: enderecoDoFunil(card.funil),
          }
        : { funil: card.funil as string, etapaLabel: nomesDasEtapasNovas[card.etapa] ?? card.etapa, nome: nomesDosFunisNovos[card.funil], href: enderecoDoFunil(card.funil) }
    )

  // Segunda rodada: histórico e notas dos cards
  const cardIds = rawCards.map((card) => card.id as string)
  const [{ data: historyData }, { data: notesData }] = await Promise.all([
    cardIds.length > 0
      ? supabase
          .from("pipeline_card_history")
          .select("id, created_at, card_id, de_etapa, para_etapa, profiles!alterado_por(name)")
          .in("card_id", cardIds)
      : Promise.resolve({ data: [] }),
    cardIds.length > 0
      ? supabase
          .from("pipeline_card_notes")
          .select("id, created_at, texto, profiles!autor_id(name)")
          .in("card_id", cardIds)
      : Promise.resolve({ data: [] }),
  ])

  // Montar timeline
  type RawEvento ={ id: string; created_at: string; tipo: string; descricao: string; responsavel: string }
  const eventos: RawEvento[] = []

  for (const conv of rawConversas) {
    eventos.push({
      id: conv.id,
      created_at: conv.created_at,
      tipo: "conversa_iniciada",
      descricao: "Nova conversa iniciada via WhatsApp",
      responsavel: conv.profiles?.name ?? "",
    })
  }

  for (const card of rawCards) {
    const funilNovo = card.funil !== "entrada" && card.funil !== "recompra"
    const funilLabel = card.funil === "recompra" ? "Recompra" : "Entrada"
    // QA M3 (06/10): a etapa em que o card nasceu é a "de" da primeira movimentação;
    // sem movimentação, é a atual. Antes mostrava sempre a atual ("criado em Perdido").
    const primeiraMovimentacao = (historyData ?? [])
      .filter((h) => h.card_id === card.id)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))[0]
    const etapaInicial = primeiraMovimentacao?.de_etapa ?? card.etapa
    const etapaLabel = ETAPA_LABEL_ALL[etapaInicial] ?? nomesDasEtapasNovas[etapaInicial] ?? etapaInicial
    eventos.push({
      id: card.id,
      created_at: card.created_at,
      tipo: "card_criado",
      descricao: funilNovo
        ? `Card criado no funil ${nomesDosFunisNovos[card.funil] ?? "apagado"} — etapa: ${etapaLabel}`
        : `Card criado no Funil de ${funilLabel} — etapa: ${etapaLabel}`,
      responsavel: card.profiles?.name ?? "",
    })
  }

  for (const h of (historyData ?? [])) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hh = h as any
    const de = hh.de_etapa ? (ETAPA_LABEL_ALL[hh.de_etapa] ?? nomesDasEtapasNovas[hh.de_etapa] ?? hh.de_etapa) : null
    const para = ETAPA_LABEL_ALL[hh.para_etapa] ?? nomesDasEtapasNovas[hh.para_etapa] ?? hh.para_etapa
    eventos.push({
      id: hh.id,
      created_at: hh.created_at,
      tipo: "mudanca_etapa",
      descricao: de ? `${de} → ${para}` : `Movido para ${para}`,
      responsavel: hh.profiles?.name ?? "",
    })
  }

  for (const n of (notesData ?? [])) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nn = n as any
    eventos.push({
      id: nn.id,
      created_at: nn.created_at,
      tipo: "nota_interna",
      descricao: `"${nn.texto}"`,
      responsavel: nn.profiles?.name ?? "",
    })
  }

  for (const p of rawCompras) {
    const valor = Number(p.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    eventos.push({
      id: `purchase-${p.id}`,
      created_at: p.created_at,
      tipo: "compra_registrada",
      // B30-02: compra do catálogo leva o número do pedido; aparece uma vez só.
      descricao: p.pedido?.number ? `Compra registrada — ${valor} — Pedido #${p.pedido.number}` : `Compra registrada — ${valor}`,
      responsavel: p.vendedor?.name ?? "",
    })
  }

  for (const o of pedidosData ?? []) {
    eventos.push({
      id: `pedido-${o.id}`,
      created_at: o.created_at,
      tipo: "pedido_catalogo",
      descricao: `Pedido #${o.number} recebido pelo catálogo — ${Number(o.total).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`,
      responsavel: "",
    })
  }

  eventos.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const timeline = eventos.map((e) => ({
    id: e.id,
    data: formatarDataEvento(e.created_at),
    tipo: e.tipo as import("./mock-contatos").TipoEvento,
    descricao: e.descricao,
    responsavel: e.responsavel,
  }))

  // B29: endereço assinado (1 h) da cópia da foto, no bucket privado.
  // B43-01: e o perfil RFV da hora.
  const [fotoUrl, perfis] = await Promise.all([
    // B47-02: só o caminho da foto do próprio contato vira link
    urlAssinadaDaFoto(createServiceClient(), c.workspace_id, c.id, c.photo_path).catch(() => null),
    perfisRfvDosContatos(supabase, [c.id]),
  ])

  return {
    id: c.id,
    nome: c.name || c.phone_number,
    telefone: c.phone_number,
    fotoUrl,
    classificacao: calcularClassificacao(rawCards),
    tipo: (c.tipo ?? null) as TipoContato | null,
    cidade: c.cidade ?? null,
    uf: c.uf ?? null,
    atendente: null,
    created_at: c.created_at,
    perfilRfv: perfilDoMapa(perfis, c.id),
    icp: (c.icp ?? null) as ICP | null,
    tags: (tagsData ?? []).map((t: { tag: string }) => t.tag),
    observacoes: c.observacoes ?? "",
    conversaId: rawConversas[0]?.id ?? null,
    cards,
    compras: rawCompras.map((p) => ({
      id: p.id,
      data: new Date(p.data + "T00:00:00").toLocaleDateString("pt-BR"),
      valor: Number(p.valor),
      pecas: p.pecas ?? null,
      desconto: p.desconto === null || p.desconto === undefined ? null : Number(p.desconto),
      formaPagamento: (p.forma_pagamento ?? null) as FormaPagamento | null,
      atendente: p.vendedor?.name ?? null,
      origem: (p.origem ?? "manual") as OrigemCompra,
      pedidoId: p.catalog_order_id ?? null,
      pedidoNumero: p.pedido?.number ?? null,
    })),
    atendenteId: c.atendente_id ?? null,
    timeline,
    pedidosCatalogo: (pedidosData ?? []).map((o) => ({
      id: o.id,
      numero: o.number,
      criadoEm: o.created_at,
      cliente: { nome: o.customer_name, whatsapp: o.customer_whatsapp },
      pecas: o.pieces,
      total: Number(o.total),
      situacao: o.status as import("../catalogo/components/situacao-pedido").SituacaoPedido,
    })),
  }
}

export async function atualizarDadosContato(
  id: string,
  dados: { nome: string; tipo?: string | null; cidade?: string | null; uf?: string | null; icp?: string | null }
): Promise<{ erro?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: "Não autenticado" }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile) return { erro: "Perfil não encontrado" }
  if (profile.role === "atendente") return { erro: "Sem permissão para editar contatos" }

  // QA M14 (06/10): nome só com espaços não vale.
  const nome = dados.nome.trim()
  if (!nome) return { erro: "Informe o nome do contato." }
  if (nome.length > 120) return { erro: "O nome passa de 120 caracteres." }
  // B32-02: UF só da lista das 27, ou vazia.
  const uf = normalizarUf(dados.uf)
  if (uf === undefined) return { erro: UF_INVALIDA }

  // B11-06: o antes, para o gatilho "dado do contato alterado" só disparar no que mudou
  const { data: antes } = await supabase.from("contacts").select("workspace_id, tipo, cidade").eq("id", id).maybeSingle()

  const depois = { tipo: dados.tipo ?? null, cidade: dados.cidade ?? null }
  const { error } = await supabase
    .from("contacts")
    .update({ name: nome, ...depois, uf, icp: dados.icp ?? null })
    .eq("id", id)

  if (error) return { erro: "Erro ao salvar. Tente novamente." }

  if (antes) await dispararDadosAlterados(antes.workspace_id, id, antes, depois)

  return {}
}

type OpcoesListagemContatos = {
  /** Quantos trazer. Sem limite quando ausente (compatível com o uso antigo). */
  limite?: number
  /** Quantos pular: página seguinte. */
  offset?: number
  /** Trecho de nome ou telefone; procura em todos os contatos visíveis. */
  busca?: string
}

/**
 * Aplica busca, ordem e página. Paginado, a ordem é "mais recente primeiro",
 * a mesma da tela; sem limite, mantém a ordem por nome de antes.
 */
function aplicarOpcoes<Q extends {
  or: (f: string) => Q
  order: (c: string, o?: { ascending: boolean }) => Q
  range: (a: number, b: number) => Q
}>(query: Q, { limite, offset = 0, busca }: OpcoesListagemContatos): Q {
  let q = query
  // QA M29 (06/10): "(11) 98888" acha "5511988880001": no telefone, só os dígitos contam.
  // (Acento no nome continua literal aqui: o banco não tem unaccent; as telas ignoram.)
  const termo = busca?.trim().replace(/[%,()]/g, "")
  const digitos = busca?.replace(/\D/g, "") ?? ""
  if (termo) {
    const porTelefone = digitos.length >= 3 ? `,phone_number.ilike.%${digitos}%` : ""
    q = q.or(`name.ilike.%${termo}%${porTelefone}`)
  }
  if (limite) {
    q = q.order("created_at", { ascending: false }).range(offset, offset + limite - 1)
  } else {
    q = q.order("name")
  }
  return q
}

export async function listarContatos(opcoes: OpcoesListagemContatos = {}): Promise<Contato[]> {
  const { supabase, user, perfil: profile } = await sessaoAtual()
  if (!user || !profile) return []

  // B45-03: Admin e Gerente veem a empresa toda; o atendente, os contatos dele e os sem
  // dono. Quem decide é o banco (pode_ver_contato), a mesma regra do perfil e do resto.
  const { data } = await aplicarOpcoes(
    supabase.from("contacts").select(CONTACT_SELECT).eq("workspace_id", profile.workspace_id).is("excluido_em", null),
    opcoes
  )

  return (data ?? []).map(mapContato)
}

export type OrdemDaLista = "recente" | "nome" | "classificacao"

export type OpcoesDoFiltro = {
  filtro?: Filtro
  /** Botões fixos da lista: valem com E junto do filtro. */
  rapidos?: Condicao[]
  busca?: string
  ordem?: OrdemDaLista
  limite?: number
  offset?: number
}

/**
 * B37-01: uma página da lista de contatos com o filtro avançado, a busca e os
 * botões fixos aplicados no banco, sobre a base inteira, e o total do resultado.
 * A RLS de contacts decide o que cada papel vê (o Atendente, só os dele).
 */
export async function filtrarContatos(
  opcoes: OpcoesDoFiltro = {}
): Promise<{ contatos: Contato[]; total: number } | { erro: string }> {
  const { supabase, user, perfil } = await sessaoAtual()
  if (!user || !perfil) return { contatos: [], total: 0 }

  const filtro = esquemaFiltro.safeParse(opcoes.filtro ?? FILTRO_VAZIO)
  const rapidos = esquemaRapidos.safeParse(opcoes.rapidos ?? [])
  if (!filtro.success || !rapidos.success) return { erro: "Filtro inválido." }

  const ordem: OrdemDaLista = opcoes.ordem === "nome" || opcoes.ordem === "classificacao" ? opcoes.ordem : "recente"
  // B37-03: filtro salvo pode citar etiqueta ou atendente que não existe mais.
  // B41-06: e funil ou etapa de funil da empresa que foi apagado.
  // B38-03: e opção de campo personalizado que não existe mais.
  const citaValorDaEmpresa = (filtro.data as Filtro).grupos.some((g) =>
    g.condicoes.some((c) => c.campo === "etiqueta" || c.campo === "atendente" || ehCampoDeFunil(c.campo) || ehCampoPersonalizado(c.campo))
  )
  const daEmpresa = citaValorDaEmpresa
    ? await valoresDoFiltro().then((v) => ({ ...v, atendentes: v.atendentes.map((a) => a.id) }))
    : undefined
  const { data, error } = await supabase.rpc("filtrar_contatos", {
    p_filtro: limparFiltro(filtro.data as Filtro, daEmpresa) as unknown as Json,
    p_rapidos: rapidos.data as unknown as Json,
    p_busca: opcoes.busca?.trim() ?? "",
    p_ordem: ordem,
    p_limite: opcoes.limite ?? TAMANHO_PAGINA_CONTATOS,
    p_offset: opcoes.offset ?? 0,
  })
  if (error) return { erro: "Não foi possível aplicar o filtro." }

  const linhas = (data ?? []) as Database["public"]["Functions"]["filtrar_contatos"]["Returns"]
  // B43-01: o perfil RFV da hora de cada contato da página, numa leitura só.
  const perfis = await perfisRfvDosContatos(supabase, linhas.map((c) => c.id))
  // B38-02: valores dos campos personalizados (B38-09: todos viram coluna). Como o perfil
  // RFV, é um extra: se a leitura falhar, a lista (e a contagem da campanha) sai sem ele.
  let valores = new Map<string, Record<string, ValorGuardado>>()
  try {
    const campos = (await camposDaEmpresa(supabase, perfil.workspace_id)).map((c) => c.id)
    valores = await valoresDosContatos(supabase, linhas.map((c) => c.id), campos)
  } catch {
    // segue sem as colunas dos campos personalizados
  }
  return {
    contatos: linhas.map((c) => ({
      ...mapContato({ ...c, profiles: c.atendente_nome ? { name: c.atendente_nome } : null }),
      perfilRfv: perfilDoMapa(perfis, c.id),
      campos: valores.get(c.id) ?? {},
    })),
    // Página além do fim vem vazia e sem total: aí o total é o que já se sabia.
    total: linhas.length > 0 ? Number(linhas[0].total) : (opcoes.offset ?? 0),
  }
}

/** B38-09: colunas da lista de Contatos que quem está logado escondeu. */
export async function colunasOcultasDoUsuario(): Promise<string[]> {
  const { supabase, user } = await sessaoAtual()
  if (!user) return []
  const { data } = await supabase.from("profiles").select("colunas_ocultas_contatos").eq("id", user.id).single()
  return data?.colunas_ocultas_contatos ?? []
}

/** B38-09: grava as colunas que quem está logado escondeu; vale só para ele. */
export async function salvarColunasOcultas(colunas: string[]): Promise<{ erro?: string }> {
  const conferidas = conferirColunasOcultas(colunas)
  if (!conferidas) return { erro: "Colunas inválidas." }
  const { supabase, user } = await sessaoAtual()
  if (!user) return { erro: "Não autorizado" }
  const { error } = await supabase.from("profiles").update({ colunas_ocultas_contatos: conferidas }).eq("id", user.id)
  if (error) return { erro: "Não foi possível guardar as colunas." }
  return {}
}

/** B37-01: valores dos campos de lista que vêm da empresa (atendente). */
export async function valoresDoFiltro(): Promise<{
  atendentes: Array<{ id: string; nome: string }>
  /** B37-02: etiquetas usadas nos contatos da empresa. */
  etiquetas: string[]
  /** B41-06: funis da empresa, com as etapas na ordem. */
  funis: FunilParaFiltro[]
  /** B38-03: campos personalizados da empresa, na ordem dela. */
  campos: CampoParaFiltro[]
}> {
  const { supabase, perfil } = await sessaoAtual()
  if (!perfil) return { atendentes: [], etiquetas: [], funis: [], campos: [] }
  const [atendentes, { data: etiquetas }, { data: funis }, campos] = await Promise.all([
    listarAtendentesAtivos(),
    supabase.from("contact_tags").select("tag").eq("workspace_id", perfil.workspace_id),
    supabase.from("funis").select("id, nome, created_at, funil_etapas (id, nome, ordem)").eq("workspace_id", perfil.workspace_id).order("created_at"),
    camposDaEmpresa(supabase, perfil.workspace_id),
  ])
  const unicos = (valores: string[]) =>
    Array.from(new Set(valores.map((v) => v.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, "pt-BR"))
  return {
    atendentes,
    etiquetas: unicos((etiquetas ?? []).map((t) => t.tag)),
    funis: (funis ?? []).map((f) => ({
      id: f.id,
      nome: f.nome,
      etapas: [...(f.funil_etapas ?? [])].sort((a, b) => a.ordem - b.ordem).map((e) => ({ valor: e.id, rotulo: e.nome })),
    })),
    campos: campos.map(({ id, nome, tipo, opcoes }) => ({ id, nome, tipo, opcoes })),
  }
}

export async function adicionarTagContato(
  contactId: string,
  tag: string
): Promise<{ erro?: string }> {
  const tagNorm = tag.trim().toLowerCase()
  if (!tagNorm) return { erro: "Tag não pode ser vazia" }
  if (tagNorm.length > 50) return { erro: "Tag muito longa (máx. 50 caracteres)" }
  if (/\s/.test(tagNorm)) return { erro: "Tag não pode conter espaços" }

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: "Não autenticado" }

  const { data: profile } = await supabase
    .from("profiles")
    .select("workspace_id")
    .eq("id", user.id)
    .single()

  if (!profile) return { erro: "Perfil não encontrado" }

  // Verifica que o contato pertence ao workspace do usuário
  const { data: contato } = await supabase
    .from("contacts")
    .select("workspace_id")
    .eq("id", contactId)
    .single()

  if (!contato || contato.workspace_id !== profile.workspace_id) {
    return { erro: "Contato não encontrado" }
  }

  const { error } = await supabase
    .from("contact_tags")
    .insert({ contact_id: contactId, workspace_id: profile.workspace_id, tag: tagNorm })

  if (error) {
    // 23505: o contato já tinha a tag; não é tag nova, então não dispara automação
    if (error.code === "23505") return {}
    return { erro: "Erro ao adicionar tag. Tente novamente." }
  }

  await dispararTagAdicionada(profile.workspace_id, contactId, tagNorm)

  return {}
}

export async function removerTagContato(
  contactId: string,
  tag: string
): Promise<{ erro?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: "Não autenticado" }

  const { error } = await supabase
    .from("contact_tags")
    .delete()
    .eq("contact_id", contactId)
    .eq("tag", tag)

  if (error) return { erro: "Erro ao remover tag. Tente novamente." }

  return {}
}

/** Tags do contato, na ordem em que entraram. Usado pelo painel do card no funil (B11-12). */
export async function listarTagsContato(contactId: string): Promise<string[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // A RLS de contact_tags limita à empresa de quem está logado
  const { data } = await supabase
    .from("contact_tags")
    .select("tag")
    .eq("contact_id", contactId)
    .order("created_at")

  return (data ?? []).map((t) => t.tag)
}

export async function atualizarObservacoesContato(
  contactId: string,
  observacoes: string
): Promise<{ erro?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: "Não autenticado" }

  const { data: profile } = await supabase
    .from("profiles")
    .select("workspace_id")
    .eq("id", user.id)
    .single()

  if (!profile) return { erro: "Perfil não encontrado" }

  // A leitura passa pela RLS: admin e gerente veem todos; o atendente, só os dele (B21).
  const { data: contato } = await supabase
    .from("contacts")
    .select("workspace_id")
    .eq("id", contactId)
    .is("excluido_em", null)
    .single()

  if (!contato || contato.workspace_id !== profile.workspace_id) {
    return { erro: "Contato não encontrado" }
  }

  if (observacoes.length > 5000) return { erro: "As observações passam de 5.000 caracteres." }

  // QA M7 (06/10): a RLS só deixa admin e gerente atualizarem contatos; o atendente
  // não conseguia salvar observações nem no próprio contato. Quem chegou aqui
  // vê o contato; a chave de serviço grava só este campo.
  const { error } = await createServiceClient()
    .from("contacts")
    .update({ observacoes: observacoes || null })
    .eq("id", contactId)
    .eq("workspace_id", profile.workspace_id)

  if (error) return { erro: "Erro ao salvar. Tente novamente." }

  return {}
}

/** B30-01: usuários ativos da empresa, para o seletor de atendente da compra. */
export async function listarAtendentesAtivos(): Promise<Array<{ id: string; nome: string }>> {
  const { supabase, perfil } = await sessaoAtual()
  if (!perfil) return []
  const { data } = await supabase
    .from("profiles")
    .select("id, name")
    .eq("workspace_id", perfil.workspace_id)
    .eq("status", "active")
    .order("name")
  return (data ?? []).map((p) => ({ id: p.id, nome: p.name }))
}

export async function registrarCompra(
  contactId: string,
  entrada: CompraEntrada
): Promise<{ erro?: string }> {
  // B30-01: a mesma validação da tela, feita de verdade aqui.
  const validado = esquemaCompra.safeParse(entrada)
  if (!validado.success) {
    return { erro: validado.error.issues[0]?.message ?? "Dados da compra inválidos" }
  }
  const dados = validado.data

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: "Não autenticado" }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, workspace_id")
    .eq("id", user.id)
    .single()

  if (!profile) return { erro: "Perfil não encontrado" }
  if (profile.role === "atendente") return { erro: "Sem permissão para registrar compras" }

  const { data: contato } = await supabase
    .from("contacts")
    .select("workspace_id")
    .eq("id", contactId)
    .single()

  if (!contato || contato.workspace_id !== profile.workspace_id) {
    return { erro: "Contato não encontrado" }
  }

  // B30-01: o atendente da venda precisa ser um usuário ativo desta empresa.
  if (dados.atendenteId) {
    const { data: atendente } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", dados.atendenteId)
      .eq("workspace_id", profile.workspace_id)
      .eq("status", "active")
      .maybeSingle()
    if (!atendente) return { erro: "Atendente inválido" }
  }

  const { error } = await supabase
    .from("contact_purchases")
    .insert({
      contact_id: contactId,
      workspace_id: profile.workspace_id,
      data: dados.data,
      valor: dados.valor,
      pecas: dados.pecas,
      desconto: dados.desconto,
      forma_pagamento: dados.formaPagamento,
      atendente_id: dados.atendenteId,
      origem: "manual",
    })

  if (error) return { erro: "Erro ao registrar compra. Tente novamente." }

  return {}
}
