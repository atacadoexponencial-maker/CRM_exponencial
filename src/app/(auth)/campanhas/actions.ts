"use server"

import { createClient } from "@/integrations/supabase/server"
import { createServiceClient } from "@/integrations/supabase/service"
import { processarCampanhasPendentes } from "@/lib/campanhas"
import { calcularClassificacao } from "../contatos/classificacao"

export type Segmento = {
  classificacoes?: string[]
  tipos?: string[]
  nichos?: string[]
  cidade?: string
  tags?: string[]
  atendenteId?: string
  reenvioDe?: string // campanha de origem (reenvio para falhos — destinatários fixos)
}

export type CampanhaListada = {
  id: string
  nome: string
  status: string
  totalDestinatarios: number
  dataEnvio: string | null
  criador: string | null
}

export type CampanhaDetalhe = {
  id: string
  nome: string
  status: string
  segmento: Segmento
  tipoMensagem: "texto" | "imagem" | "documento"
  conteudo: string
  arquivoUrl: string | null
  arquivoNome: string | null
  agendadaPara: string | null
}

export type DestinatarioPreview = { id: string; nome: string; telefone: string }

export type DadosCampanha = {
  nome: string
  segmento: Segmento
  tipoMensagem: "texto" | "imagem" | "documento"
  conteudo: string
  arquivoUrl: string | null
  arquivoNome: string | null
}

async function perfilGestor() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, perfil: null }

  const { data: perfil } = await supabase
    .from("profiles")
    .select("role, workspace_id")
    .eq("id", user.id)
    .single()

  if (!perfil || !["admin", "gerente"].includes(perfil.role)) {
    return { supabase, user, perfil: null }
  }
  return { supabase, user, perfil }
}

// ── Segmentação ──────────────────────────────────────────────────────

async function buscarDestinatariosSegmento(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceId: string,
  segmento: Segmento
): Promise<DestinatarioPreview[]> {
  // Reenvio: destinatários fixos = os que falharam na campanha de origem
  if (segmento.reenvioDe) {
    const { data } = await supabase
      .from("campaign_recipients")
      .select("contact_id, nome_snapshot, telefone_snapshot")
      .eq("campaign_id", segmento.reenvioDe)
      .eq("status", "falhou")
    return (data ?? []).map((r) => ({
      id: r.contact_id ?? r.telefone_snapshot,
      nome: r.nome_snapshot ?? r.telefone_snapshot,
      telefone: r.telefone_snapshot,
    }))
  }

  let query = supabase
    .from("contacts")
    .select("id, name, phone_number, tipo, nicho, cidade, atendente_id")
    .eq("workspace_id", workspaceId)

  if (segmento.tipos?.length) query = query.in("tipo", segmento.tipos)
  if (segmento.nichos?.length) query = query.in("nicho", segmento.nichos)
  if (segmento.cidade?.trim()) query = query.ilike("cidade", `%${segmento.cidade.trim()}%`)
  if (segmento.atendenteId) query = query.eq("atendente_id", segmento.atendenteId)

  const { data: contatos } = await query
  let lista = (contatos ?? []).map((c) => ({
    id: c.id as string,
    nome: (c.name ?? c.phone_number) as string,
    telefone: c.phone_number as string,
  }))

  // Filtro por tag
  if (segmento.tags?.length) {
    const { data: tagsData } = await supabase
      .from("contact_tags")
      .select("contact_id")
      .eq("workspace_id", workspaceId)
      .in("tag", segmento.tags)
    const comTag = new Set((tagsData ?? []).map((t) => t.contact_id))
    lista = lista.filter((c) => comTag.has(c.id))
  }

  // Filtro por classificação (derivada do pipeline, igual ao perfil do contato)
  if (segmento.classificacoes?.length) {
    const ids = lista.map((c) => c.id)
    const cardsPorContato = new Map<string, Array<{ funil: string; etapa: string }>>()
    if (ids.length > 0) {
      const { data: cards } = await supabase
        .from("pipeline_cards")
        .select("contact_id, funil, etapa")
        .in("contact_id", ids)
      for (const card of cards ?? []) {
        if (!card.contact_id) continue
        const atual = cardsPorContato.get(card.contact_id) ?? []
        atual.push({ funil: card.funil, etapa: card.etapa })
        cardsPorContato.set(card.contact_id, atual)
      }
    }
    const selecionadas = new Set(segmento.classificacoes)
    lista = lista.filter((c) => selecionadas.has(calcularClassificacao(cardsPorContato.get(c.id) ?? [])))
  }

  return lista
}

export async function contarDestinatarios(segmento: Segmento): Promise<{
  total: number
  amostra: DestinatarioPreview[]
}> {
  const { supabase, perfil } = await perfilGestor()
  if (!perfil) return { total: 0, amostra: [] }

  const lista = await buscarDestinatariosSegmento(supabase, perfil.workspace_id, segmento)
  return { total: lista.length, amostra: lista.slice(0, 50) }
}

export async function opcoesSegmentacao(): Promise<{
  nichos: string[]
  tags: string[]
  atendentes: Array<{ id: string; nome: string }>
}> {
  const { supabase, perfil } = await perfilGestor()
  if (!perfil) return { nichos: [], tags: [], atendentes: [] }

  const [{ data: contatos }, { data: tags }, { data: atendentes }] = await Promise.all([
    supabase.from("contacts").select("nicho").eq("workspace_id", perfil.workspace_id).not("nicho", "is", null),
    supabase.from("contact_tags").select("tag").eq("workspace_id", perfil.workspace_id),
    supabase
      .from("profiles")
      .select("id, name")
      .eq("workspace_id", perfil.workspace_id)
      .eq("status", "active")
      .order("name"),
  ])

  return {
    nichos: Array.from(new Set((contatos ?? []).map((c) => c.nicho as string).filter(Boolean))).sort(),
    tags: Array.from(new Set((tags ?? []).map((t) => t.tag as string))).sort(),
    atendentes: (atendentes ?? []).map((a) => ({ id: a.id, nome: a.name })),
  }
}

// ── CRUD ─────────────────────────────────────────────────────────────

export async function listarCampanhas(): Promise<CampanhaListada[]> {
  // Processa campanhas agendadas vencidas de forma oportunista
  await processarCampanhasPendentes().catch(() => {})

  const { supabase, perfil } = await perfilGestor()
  if (!perfil) return []

  const { data } = await supabase
    .from("campaigns")
    .select("id, nome, status, agendada_para, enviada_em, criador:profiles!criado_por(name), campaign_recipients(id)")
    .eq("workspace_id", perfil.workspace_id)
    .order("created_at", { ascending: false })

  type Row = {
    id: string
    nome: string
    status: string
    agendada_para: string | null
    enviada_em: string | null
    criador: { name: string } | null
    campaign_recipients: Array<{ id: string }>
  }

  return ((data ?? []) as unknown as Row[]).map((c) => ({
    id: c.id,
    nome: c.nome,
    status: c.status,
    totalDestinatarios: (c.campaign_recipients ?? []).length,
    dataEnvio: c.enviada_em ?? c.agendada_para,
    criador: c.criador?.name ?? null,
  }))
}

export async function buscarCampanha(id: string): Promise<CampanhaDetalhe | null> {
  const { supabase, perfil } = await perfilGestor()
  if (!perfil) return null

  const { data } = await supabase
    .from("campaigns")
    .select("id, nome, status, segmento, tipo_mensagem, conteudo, arquivo_url, arquivo_nome, agendada_para")
    .eq("id", id)
    .eq("workspace_id", perfil.workspace_id)
    .single()

  if (!data) return null

  return {
    id: data.id,
    nome: data.nome,
    status: data.status,
    segmento: (data.segmento ?? {}) as Segmento,
    tipoMensagem: data.tipo_mensagem,
    conteudo: data.conteudo ?? "",
    arquivoUrl: data.arquivo_url,
    arquivoNome: data.arquivo_nome,
    agendadaPara: data.agendada_para,
  }
}

function validarDados(dados: DadosCampanha, paraEnvio: boolean): string | null {
  if (!dados.nome.trim()) return "Informe o nome da campanha"
  if (paraEnvio) {
    if (!dados.conteudo.trim()) return "Escreva a mensagem da campanha"
    if (dados.tipoMensagem !== "texto" && !dados.arquivoUrl) return "Anexe o arquivo da campanha"
  }
  return null
}

export async function salvarRascunho(
  id: string | null,
  dados: DadosCampanha
): Promise<{ id?: string; erro?: string }> {
  const { supabase, user, perfil } = await perfilGestor()
  if (!perfil) return { erro: "Sem permissão" }

  const erro = validarDados(dados, false)
  if (erro) return { erro }

  const payload = {
    nome: dados.nome.trim(),
    segmento: dados.segmento,
    tipo_mensagem: dados.tipoMensagem,
    conteudo: dados.conteudo,
    arquivo_url: dados.arquivoUrl,
    arquivo_nome: dados.arquivoNome,
  }

  if (id) {
    const { error } = await supabase
      .from("campaigns")
      .update(payload)
      .eq("id", id)
      .eq("workspace_id", perfil.workspace_id)
      .in("status", ["rascunho", "agendada"])
    if (error) return { erro: "Não foi possível salvar a campanha" }
    return { id }
  }

  const { data, error } = await supabase
    .from("campaigns")
    .insert({ ...payload, workspace_id: perfil.workspace_id, criado_por: user!.id })
    .select("id")
    .single()

  if (error || !data) return { erro: "Não foi possível criar a campanha" }
  return { id: data.id }
}

export async function confirmarCampanha(
  id: string | null,
  dados: DadosCampanha,
  agendadaPara: string | null // null = enviar agora
): Promise<{ erro?: string }> {
  const { supabase, perfil } = await perfilGestor()
  if (!perfil) return { erro: "Sem permissão" }

  const erroValidacao = validarDados(dados, true)
  if (erroValidacao) return { erro: erroValidacao }

  if (agendadaPara && new Date(agendadaPara) <= new Date()) {
    return { erro: "A data de agendamento precisa estar no futuro" }
  }

  // Resolve a lista de destinatários no momento da confirmação (snapshot)
  const destinatarios = await buscarDestinatariosSegmento(supabase, perfil.workspace_id, dados.segmento)
  if (destinatarios.length === 0) return { erro: "Nenhum destinatário corresponde aos filtros" }

  const salvo = await salvarRascunho(id, dados)
  if (salvo.erro || !salvo.id) return { erro: salvo.erro ?? "Não foi possível salvar" }

  const service = createServiceClient()

  // Recria o snapshot de destinatários
  await service.from("campaign_recipients").delete().eq("campaign_id", salvo.id)
  const { error: recipientsError } = await service.from("campaign_recipients").insert(
    destinatarios.map((d) => ({
      campaign_id: salvo.id,
      workspace_id: perfil.workspace_id,
      contact_id: d.id.includes("-") ? d.id : null,
      nome_snapshot: d.nome,
      telefone_snapshot: d.telefone,
    }))
  )
  if (recipientsError) return { erro: "Não foi possível registrar os destinatários" }

  const { error } = await supabase
    .from("campaigns")
    .update(
      agendadaPara
        ? { status: "agendada", agendada_para: agendadaPara }
        : { status: "enviando", agendada_para: null }
    )
    .eq("id", salvo.id)
    .eq("workspace_id", perfil.workspace_id)

  if (error) return { erro: "Não foi possível confirmar a campanha" }

  // Envio imediato: dispara o primeiro lote já nesta requisição
  if (!agendadaPara) {
    await processarCampanhasPendentes().catch(() => {})
  }

  return {}
}

export async function cancelarCampanha(id: string): Promise<{ erro?: string }> {
  const { supabase, perfil } = await perfilGestor()
  if (!perfil) return { erro: "Sem permissão" }

  const { data, error } = await supabase
    .from("campaigns")
    .update({ status: "cancelada" })
    .eq("id", id)
    .eq("workspace_id", perfil.workspace_id)
    .eq("status", "agendada")
    .select("id")

  if (error || !data?.length) return { erro: "Só é possível cancelar campanhas agendadas" }
  return {}
}

export async function uploadArquivoCampanha(
  formData: FormData
): Promise<{ url?: string; nome?: string; erro?: string }> {
  const { perfil } = await perfilGestor()
  if (!perfil) return { erro: "Sem permissão" }

  const arquivo = formData.get("arquivo") as File
  if (!arquivo) return { erro: "Arquivo inválido" }
  if (arquivo.size > 10 * 1024 * 1024) return { erro: "Arquivo muito grande (máximo 10 MB)" }

  const service = createServiceClient()
  const ext = arquivo.name.split(".").pop() ?? "bin"
  const path = `${perfil.workspace_id}/campanhas/${Date.now()}.${ext}`

  const { error } = await service.storage
    .from("chat-attachments")
    .upload(path, arquivo, { contentType: arquivo.type })

  if (error) return { erro: "Erro no upload do arquivo" }

  const { data: { publicUrl } } = service.storage.from("chat-attachments").getPublicUrl(path)
  return { url: publicUrl, nome: arquivo.name }
}

// ── Relatório ────────────────────────────────────────────────────────

export type RelatorioCampanha = {
  id: string
  nome: string
  status: string
  enviadaEm: string | null
  total: number
  enviados: number
  entregues: number
  lidos: number
  falhos: number
  pendentes: number
  destinatarios: Array<{
    nome: string
    telefone: string
    status: string
    atualizadoEm: string | null
  }>
}

export async function relatorioCampanha(id: string): Promise<RelatorioCampanha | null> {
  const { supabase, perfil } = await perfilGestor()
  if (!perfil) return null

  const { data } = await supabase
    .from("campaigns")
    .select("id, nome, status, enviada_em, campaign_recipients(nome_snapshot, telefone_snapshot, status, atualizado_em)")
    .eq("id", id)
    .eq("workspace_id", perfil.workspace_id)
    .single()

  if (!data) return null

  type Recipient = {
    nome_snapshot: string | null
    telefone_snapshot: string
    status: string
    atualizado_em: string | null
  }
  const recipients = ((data.campaign_recipients ?? []) as Recipient[])

  const porStatus = (s: string) => recipients.filter((r) => r.status === s).length

  return {
    id: data.id,
    nome: data.nome,
    status: data.status,
    enviadaEm: data.enviada_em,
    total: recipients.length,
    // "entregue" e "lido" também contam como enviados
    enviados: recipients.filter((r) => ["enviado", "entregue", "lido"].includes(r.status)).length,
    entregues: recipients.filter((r) => ["entregue", "lido"].includes(r.status)).length,
    lidos: porStatus("lido"),
    falhos: porStatus("falhou"),
    pendentes: porStatus("pendente"),
    destinatarios: recipients.map((r) => ({
      nome: r.nome_snapshot ?? r.telefone_snapshot,
      telefone: r.telefone_snapshot,
      status: r.status,
      atualizadoEm: r.atualizado_em,
    })),
  }
}

export async function criarReenvioParaFalhos(campanhaId: string): Promise<{ id?: string; erro?: string }> {
  const { supabase, user, perfil } = await perfilGestor()
  if (!perfil) return { erro: "Sem permissão" }

  const { data: origem } = await supabase
    .from("campaigns")
    .select("nome, tipo_mensagem, conteudo, arquivo_url, arquivo_nome")
    .eq("id", campanhaId)
    .eq("workspace_id", perfil.workspace_id)
    .single()

  if (!origem) return { erro: "Campanha não encontrada" }

  const { count } = await supabase
    .from("campaign_recipients")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campanhaId)
    .eq("status", "falhou")

  if ((count ?? 0) === 0) return { erro: "Nenhum destinatário com falha nesta campanha" }

  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      workspace_id: perfil.workspace_id,
      nome: `${origem.nome} (reenvio)`,
      segmento: { reenvioDe: campanhaId },
      tipo_mensagem: origem.tipo_mensagem,
      conteudo: origem.conteudo,
      arquivo_url: origem.arquivo_url,
      arquivo_nome: origem.arquivo_nome,
      criado_por: user!.id,
    })
    .select("id")
    .single()

  if (error || !data) return { erro: "Não foi possível criar o reenvio" }
  return { id: data.id }
}
