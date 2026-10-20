"use server"

import { createClient } from "@/integrations/supabase/server"
import { sessaoAtual } from "@/lib/sessao"
import { dispararAutomacoes } from "@/lib/automacoes/fila"
import { cardsDepoisDoMovimento, prepararGatilhoDeClassificacao } from "@/lib/automacoes/gatilhos-do-crm"
import { processarGatilhoSequencia } from "@/lib/sequencias"
import { createServiceClient } from "@/integrations/supabase/service"
import { buscarEGuardarFotoDoContato } from "@/lib/whatsapp/foto-de-perfil"
import { tirarDaLixeira } from "@/lib/lixeira"
import { normalizarWhatsapp, TELEFONE_INVALIDO } from "@/lib/telefone"
import { type CardLead, type EtapaEntrada, type CardCliente, type EtapaRecompra, type HistoricoEtapa, type NotaInterna, ETAPAS_ENTRADA, ETAPAS_RECOMPRA } from "./mock-pipeline"

// QA M4 (06/10): o histórico do painel mostrava "sondagem → catalogo_enviado".
const ROTULO_DA_ETAPA: Record<string, string> = Object.fromEntries(
  [...ETAPAS_ENTRADA, ...ETAPAS_RECOMPRA].map((e) => [e.id, e.label])
)
const rotuloDaEtapa = (etapa: string | null | undefined) => (etapa ? (ROTULO_DA_ETAPA[etapa] ?? etapa) : "")

function calcularTempoNaEtapa(etapaChangedAt: string): string {
  const agora = new Date()
  const mudou = new Date(etapaChangedAt)
  const diffMs = agora.getTime() - mudou.getTime()
  // O relógio do banco pode estar milissegundos à frente do servidor; card recém-criado é "Hoje", nunca "-1 dias".
  const diffDias = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))

  if (diffDias === 0) return "Hoje"
  if (diffDias === 1) return "1 dia"
  if (diffDias < 7) return `${diffDias} dias`
  const semanas = Math.floor(diffDias / 7)
  if (semanas === 1) return "1 semana"
  if (semanas < 4) return `${semanas} semanas`
  const meses = Math.floor(diffDias / 30)
  if (meses === 1) return "1 mês"
  return `${meses} meses`
}

// B10-05: um funil com mais de 500 cards mostra só os movimentados por último.
const LIMITE_CARDS = 500

export async function listarAtendentes(): Promise<{ id: string; nome: string }[]> {
  const { supabase, user, perfil: profile } = await sessaoAtual()
  if (!user || !profile) return []

  const { data } = await supabase
    .from("profiles")
    .select("id, name")
    .eq("workspace_id", profile.workspace_id)
    .eq("status", "active")
    .order("name")

  return (data ?? []).map((p) => ({ id: p.id, nome: p.name as string }))
}

export async function atribuirAtendente(cardId: string, atendenteId: string): Promise<void> {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error("Usuário não autenticado")

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, workspace_id")
    .eq("id", user.id)
    .single()

  if (profileError || !profile) throw new Error("Perfil não encontrado")
  if (!["admin", "gerente"].includes(profile.role)) throw new Error("Sem permissão para atribuir atendente")

  // B21-02: o atendente do card é sempre alguém da mesma empresa.
  const { data: alvo } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", atendenteId)
    .eq("workspace_id", profile.workspace_id)
    .maybeSingle()
  if (!alvo) throw new Error("Atendente não encontrado")

  const { data: cardAtualizado, error } = await supabase
    .from("pipeline_cards")
    .update({ atendente_id: atendenteId })
    .eq("id", cardId)
    .select("contact_id")
    .maybeSingle()

  if (error) throw new Error("Erro ao atribuir atendente")
  if (!cardAtualizado) throw new Error("Card não encontrado")

  // QA A5 (06/10): o atendente do card só ficava no card. Campanhas segmentam e a
  // lista de Contatos mostra `contacts.atendente_id`; sem isto, ficava "—" e 0.
  const { error: erroContato } = await supabase
    .from("contacts")
    .update({ atendente_id: atendenteId })
    .eq("id", cardAtualizado.contact_id)
    .eq("workspace_id", profile.workspace_id)
  if (erroContato) throw new Error("Erro ao atribuir atendente")
}

/** Devolve o contato do telefone (na lixeira ou não), criando se não existir. `null` quando o banco falha. */
async function localizarOuCriarContato(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceId: string,
  telefone: string,
  nome: string | null
): Promise<{ id: string } | null> {
  const { data: existente, error: erroBusca } = await supabase
    .from("contacts")
    .select("id, name")
    .eq("workspace_id", workspaceId)
    .eq("phone_number", telefone)
    .maybeSingle()
  if (erroBusca) return null

  if (existente) {
    const semNome = !existente.name || existente.name.trim() === ""
    if (semNome && nome && nome.trim() !== "") {
      const { error } = await supabase.from("contacts").update({ name: nome.trim() }).eq("id", existente.id)
      if (error) return null
    }
    return { id: existente.id }
  }

  const { data: novo, error: erroInsert } = await supabase
    .from("contacts")
    .insert({ workspace_id: workspaceId, phone_number: telefone, name: nome?.trim() || null })
    .select("id")
    .single()
  if (erroInsert?.code === "23505") {
    // Outro pedido criou o contato entre a busca e o insert: usar o que está lá.
    const { data: criadoJunto } = await supabase
      .from("contacts")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("phone_number", telefone)
      .maybeSingle()
    return criadoJunto ? { id: criadoJunto.id } : null
  }
  if (erroInsert || !novo) return null
  return { id: novo.id }
}

const JA_NO_FUNIL = "Este contato já está no Funil de Entrada."

/** `erro`: o contato já tem card no Funil de Entrada (B22-26). O resto continua lançando. */
export async function criarNovoLead(telefoneDigitado: string, nome: string | null): Promise<{ erro?: string }> {
  const supabase = await createClient()

  // QA M13 (06/10): telefone normalizado no servidor; "abcdef" e "1" não entram.
  const telefone = normalizarWhatsapp(telefoneDigitado)
  if (!telefone) return { erro: TELEFONE_INVALIDO }

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error("Usuário não autenticado")

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("workspace_id, role")
    .eq("id", user.id)
    .single()

  if (profileError || !profile) throw new Error("Perfil não encontrado")
  if (!["admin", "gerente"].includes(profile.role)) throw new Error("Sem permissão para criar leads")

  // QA C3 (06/10): o upsert antigo regravava o nome do contato que já existia
  // (inclusive com null). Contato existente mantém o nome; só ganha o digitado
  // se estiver sem nome. Contato novo nasce com o nome do formulário.
  const contato = await localizarOuCriarContato(supabase, profile.workspace_id, telefone, nome)
  if (!contato) throw new Error("Erro ao criar ou localizar contato")

  // B13-05: telefone de contato na lixeira traz o contato de volta, com o
  // histórico. Antes do card: card de contato na lixeira nasceria invisível.
  try {
    await tirarDaLixeira(createServiceClient(), profile.workspace_id, contato.id)
  } catch {
    throw new Error("Erro ao criar ou localizar contato")
  }

  // B22-26: um card por contato em cada funil. Dois cards no mesmo funil quebravam
  // "mover card" e a condição de etapa das automações. O índice único do banco
  // segura quem chegar junto; aqui fica a mensagem clara.
  const { data: jaTem } = await supabase
    .from("pipeline_cards")
    .select("id")
    .eq("workspace_id", profile.workspace_id)
    .eq("contact_id", contato.id)
    .eq("funil", "entrada")
    .limit(1)
    .maybeSingle()
  if (jaTem) return { erro: JA_NO_FUNIL }

  // B11-06: o lead novo pode mudar a classificação (de "sem histórico" para "lead")
  const dispararClassificacao = await prepararGatilhoDeClassificacao(profile.workspace_id, contato.id, (cards) => [
    ...cards,
    { funil: "entrada", etapa: "lead" },
  ])

  const { data: novoCard, error: cardError } = await supabase
    .from("pipeline_cards")
    .insert({
      workspace_id: profile.workspace_id,
      contact_id: contato.id,
      etapa: "lead",
    })
    .select("id")
    .single()

  if (cardError?.code === "23505") return { erro: JA_NO_FUNIL }
  if (cardError || !novoCard) throw new Error("Erro ao criar card no pipeline")

  await dispararAutomacoes({
    tipo: "card_movido",
    workspaceId: profile.workspace_id,
    contactId: contato.id,
    cardId: novoCard.id,
    funil: "entrada",
    etapa: "lead",
  })

  await processarGatilhoSequencia({
    workspaceId: profile.workspace_id,
    contactId: contato.id,
    atendenteId: null,
    gatilho: "card_lead",
  })

  await dispararClassificacao()

  // B29-02: a foto vem pelo canal direto, por último. Contato já conferido sai na hora.
  await buscarEGuardarFotoDoContato({ workspaceId: profile.workspace_id, contactId: contato.id, telefone })

  return {}
}

export async function moverCard(cardId: string, novaEtapa: string): Promise<void> {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error("Usuário não autenticado")

  const { data: card, error: cardError } = await supabase
    .from("pipeline_cards")
    .select("etapa, contact_id, workspace_id, funil, atendente_id")
    .eq("id", cardId)
    .single()

  if (cardError || !card) throw new Error("Card não encontrado")

  // B11-06: a classificação vem da etapa dos cards; o gatilho dispara no fim, se ela mudou
  const dispararClassificacao = await prepararGatilhoDeClassificacao(card.workspace_id, card.contact_id, (cards) =>
    cardsDepoisDoMovimento(cards, cardId, novaEtapa)
  )

  // `select` devolve a linha alterada: sem ela, a RLS barrou sem erro (B22-22)
  const { data: movido, error: updateError } = await supabase
    .from("pipeline_cards")
    .update({ etapa: novaEtapa, etapa_changed_at: new Date().toISOString() })
    .eq("id", cardId)
    .select("id")
    .maybeSingle()

  if (updateError) throw new Error("Erro ao mover card")
  if (!movido) throw new Error("Sem permissão para mover este card")

  await supabase
    .from("pipeline_card_history")
    .insert({
      card_id: cardId,
      de_etapa: card.etapa,
      para_etapa: novaEtapa,
      alterado_por: user.id,
    })

  // B22-43: o card movido primeiro; no Ganho, as regras do card da Recompra rodavam
  // antes das do card da Entrada, porque ele era disparado antes
  await dispararAutomacoes({
    tipo: "card_movido",
    workspaceId: card.workspace_id,
    contactId: card.contact_id,
    cardId,
    funil: (card.funil ?? "entrada") as "entrada" | "recompra",
    etapa: novaEtapa,
  })

  // QA M2 (06/10, decisão dela em 20/10): o card da Entrada que sai de Ganho desfaz
  // a venda; o card da Recompra que nasceu dela é apagado (histórico e notas vão
  // junto, pela cascata). Ganhar de novo cria outro.
  if (card.funil === "entrada" && card.etapa === "ganho" && novaEtapa !== "ganho" && card.contact_id && card.workspace_id) {
    await createServiceClient()
      .from("pipeline_cards")
      .delete()
      .eq("funil", "recompra")
      .eq("contact_id", card.contact_id)
      .eq("workspace_id", card.workspace_id)
  }

  if (novaEtapa === "ganho" && card.contact_id && card.workspace_id) {
    // B22-22: o card de Recompra é criado pelo servidor. Pela RLS, só admin e gerente
    // criam card, e o atendente que marcava Ganho ficava sem card, sem gatilho e sem
    // onboarding, em silêncio. Quem pode mover este card já foi conferido acima (o
    // card veio pela RLS e a etapa mudou de fato); a chave de serviço só cria o par dele.
    const servico = createServiceClient()
    const { data: existente } = await servico
      .from("pipeline_cards")
      .select("id")
      .eq("funil", "recompra")
      .eq("contact_id", card.contact_id)
      .eq("workspace_id", card.workspace_id)
      .maybeSingle()

    if (!existente) {
      const { data: cardRecompra } = await servico
        .from("pipeline_cards")
        .insert({
          funil: "recompra",
          etapa: "onboarding",
          contact_id: card.contact_id,
          workspace_id: card.workspace_id,
          // QA A4 (06/10): sem copiar, o card nascia sem atendente e o vendedor
          // perdia o cliente em "Clientes ativos" e no Funil de Recompra dele.
          atendente_id: card.atendente_id,
        })
        .select("id")
        .single()

      if (cardRecompra) {
        await dispararAutomacoes({
          tipo: "card_movido",
          workspaceId: card.workspace_id,
          contactId: card.contact_id,
          cardId: cardRecompra.id,
          funil: "recompra",
          etapa: "onboarding",
        })

        await processarGatilhoSequencia({
          workspaceId: card.workspace_id,
          contactId: card.contact_id,
          atendenteId: card.atendente_id,
          gatilho: "onboarding",
        })
      }
    }
  }

  // Gatilhos automáticos de sequência do método
  if (novaEtapa === "catalogo_enviado" || novaEtapa === "inativos") {
    await processarGatilhoSequencia({
      workspaceId: card.workspace_id,
      contactId: card.contact_id,
      atendenteId: card.atendente_id,
      gatilho: novaEtapa === "catalogo_enviado" ? "catalogo_enviado" : "inativo",
    })
  }

  await dispararClassificacao()
}

export async function adicionarNota(cardId: string, texto: string): Promise<void> {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error("Usuário não autenticado")

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("workspace_id")
    .eq("id", user.id)
    .single()

  if (profileError || !profile) throw new Error("Perfil não encontrado")

  const { error } = await supabase
    .from("pipeline_card_notes")
    .insert({
      card_id: cardId,
      workspace_id: profile.workspace_id,
      texto: texto.trim(),
      autor_id: user.id,
    })

  if (error) throw new Error("Erro ao salvar nota")
}

export async function buscarDadosPainel(cardId: string): Promise<{ historico: HistoricoEtapa[]; notas: NotaInterna[] }> {
  const supabase = await createClient()

  const [historicoResult, notasResult] = await Promise.all([
    supabase
      .from("pipeline_card_history")
      .select(`
        de_etapa,
        para_etapa,
        created_at,
        alterado_por:profiles!alterado_por (name)
      `)
      .eq("card_id", cardId)
      .order("created_at", { ascending: true }),
    supabase
      .from("pipeline_card_notes")
      .select(`
        id,
        texto,
        created_at,
        autor:profiles!autor_id (name)
      `)
      .eq("card_id", cardId)
      .order("created_at", { ascending: true }),
  ])

  const historico: HistoricoEtapa[] = (historicoResult.data ?? []).map((row) => ({
    deEtapa: rotuloDaEtapa(row.de_etapa),
    etapa: rotuloDaEtapa(row.para_etapa),
    data: new Date(row.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }),
    responsavel: (row.alterado_por as unknown as { name: string } | null)?.name,
  }))

  const notas: NotaInterna[] = (notasResult.data ?? []).map((row) => ({
    id: row.id,
    autor: (row.autor as unknown as { name: string } | null)?.name ?? "Desconhecido",
    texto: row.texto,
    data: new Date(row.created_at).toLocaleDateString("pt-BR"),
  }))

  return { historico, notas }
}

export async function listarCardsEntrada(): Promise<CardLead[]> {
  const { supabase } = await sessaoAtual()

  const { data, error } = await supabase
    .from("pipeline_cards")
    .select(`
      id,
      etapa,
      etapa_changed_at,
      created_at,
      contact_id,
      atendente:profiles!atendente_id (name),
      contato:contacts!contact_id (name, phone_number),
      pipeline_card_labels (
        label:labels!label_id (id, name, color)
      )
    `)
    .eq("funil", "entrada")
    .order("etapa_changed_at", { ascending: false })
    .limit(LIMITE_CARDS)

  if (error) throw new Error("Erro ao carregar cards do pipeline")

  const contactIds = (data ?? []).map((row) => row.contact_id).filter(Boolean) as string[]
  const conversasPorContato: Record<string, string> = {}

  if (contactIds.length > 0) {
    const { data: conversas } = await supabase
      .from("conversations")
      .select("id, contact_id")
      .in("contact_id", contactIds)

    for (const c of conversas ?? []) {
      if (c.contact_id) conversasPorContato[c.contact_id] = c.id
    }
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    contactId: row.contact_id,
    etapa: row.etapa as EtapaEntrada,
    tempoNaEtapa: calcularTempoNaEtapa(row.etapa_changed_at),
    dataEntradaEtapa: new Date(row.etapa_changed_at).toLocaleDateString("pt-BR"),
    tempoNoFunil: calcularTempoNaEtapa(row.created_at),
    atendente: (row.atendente as unknown as { name: string } | null)?.name ?? null,
    contato: {
      nome: (row.contato as unknown as { name: string | null; phone_number: string }).name ?? "Sem nome",
      telefone: (row.contato as unknown as { name: string | null; phone_number: string }).phone_number,
    },
    etiquetas: (row.pipeline_card_labels as unknown as Array<{ label: { id: string; name: string; color: string } }>).map(
      ({ label }) => ({ id: label.id, nome: label.name, cor: label.color })
    ),
    conversaId: row.contact_id ? (conversasPorContato[row.contact_id] ?? null) : null,
  }))
}

export async function listarCardsRecompra(): Promise<CardCliente[]> {
  const { supabase, user } = await sessaoAtual()
  if (!user) return []

  const { data, error } = await supabase
    .from("pipeline_cards")
    .select(`
      id,
      etapa,
      etapa_changed_at,
      created_at,
      contact_id,
      atendente:profiles!atendente_id (name),
      contato:contacts!contact_id (name, phone_number),
      pipeline_card_labels (
        label:labels!label_id (id, name, color)
      )
    `)
    .eq("funil", "recompra")
    .order("etapa_changed_at", { ascending: false })
    .limit(LIMITE_CARDS)

  if (error) throw new Error("Erro ao carregar cards do funil de recompra")

  const contactIds = (data ?? []).map((row) => row.contact_id).filter(Boolean) as string[]
  const conversasPorContato: Record<string, string> = {}

  if (contactIds.length > 0) {
    const { data: conversas } = await supabase
      .from("conversations")
      .select("id, contact_id")
      .in("contact_id", contactIds)

    for (const c of conversas ?? []) {
      if (c.contact_id) conversasPorContato[c.contact_id] = c.id
    }
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    contactId: row.contact_id,
    etapa: row.etapa as EtapaRecompra,
    tempoNaEtapa: calcularTempoNaEtapa(row.etapa_changed_at),
    dataEntradaEtapa: new Date(row.etapa_changed_at).toLocaleDateString("pt-BR"),
    tempoNoFunil: calcularTempoNaEtapa(row.created_at),
    atendente: (row.atendente as unknown as { name: string } | null)?.name ?? null,
    contato: {
      nome: (row.contato as unknown as { name: string | null; phone_number: string }).name ?? "Sem nome",
      telefone: (row.contato as unknown as { name: string | null; phone_number: string }).phone_number,
    },
    etiquetas: (row.pipeline_card_labels as unknown as Array<{ label: { id: string; name: string; color: string } }>).map(
      ({ label }) => ({ id: label.id, nome: label.name, cor: label.color })
    ),
    conversaId: row.contact_id ? (conversasPorContato[row.contact_id] ?? null) : null,
  }))
}
