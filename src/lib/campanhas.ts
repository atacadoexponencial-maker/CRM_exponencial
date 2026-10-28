// Motor de envio de campanhas (Módulo 7): processa campanhas agendadas
// vencidas e envia as mensagens individualmente para cada destinatário via
// WhatsApp API Oficial. Roda no backend com service client; o envio é em
// lotes para caber no tempo de execução de uma função serverless — o cron
// e o processamento oportunista continuam de onde parou.

import { createServiceClient } from "@/integrations/supabase/service"
import { anexoDaEmpresa } from "@/lib/anexo-da-campanha"
import { chaveDaVariavel, preencherVariaveis, variaveisSemReserva } from "@/lib/variaveis-mensagem"
import { formatarValor } from "@/lib/campos-personalizados"
import { camposDaEmpresa, valoresDosContatos } from "@/lib/campos-personalizados-servidor"
import { providerDaConexao, resolverProvider } from "@/lib/whatsapp"
import {
  MOTIVO_SEM_NUMERO,
  MOTIVO_SEM_RESPOSTA,
  motivoDaFalha,
} from "@/lib/whatsapp/motivo-da-falha"
import type { ConexaoParaProvider, ProviderWhatsApp, ResultadoEnvio } from "@/lib/whatsapp"

/**
 * Quantos destinatários um lote entrega ao canal.
 *
 * B8-03: o gateway **não** tem como esvaziar a fila de uma campanha — o que já
 * foi aceito por ele vai sair. Entregar tudo de uma vez faria "interromper" não
 * interromper nada, então o lote é pequeno de propósito: no pior caso, o que
 * escapa depois do pedido de parada são as mensagens deste lote.
 */
const TAMANHO_LOTE = 40

/** B44-05: quantas campanhas saem por rodada, para caber no tempo da função. */
const CAMPANHAS_POR_RODADA = 3

/** B44-05: reserva mais velha que isso é de execução que caiu no meio do lote. */
const RESERVA_VENCE_EM_MS = 10 * 60 * 1000

/** B44-05: motivos que o relatório mostra. */
export const MOTIVO_CONTATO_APAGADO = "Contato apagado"
export const MOTIVO_TEXTO_SEM_RESERVA =
  "A mensagem tem variável sem texto reserva. Ajuste o texto e retome a campanha."
/** B47-01: motivos de quem o envio barra ao conferir de novo o que está gravado. */
export const MOTIVO_ANEXO_DE_FORA = "O anexo da campanha não é um arquivo da empresa"
export const MOTIVO_FORA_DA_EMPRESA = "Não é contato da empresa"

type ServiceClient = ReturnType<typeof createServiceClient>

/**
 * B44-05: reserva o destinatário antes de enviar. Só grava quem o encontra livre
 * (pendente e sem reserva recente); duas execuções ao mesmo tempo não mandam a
 * mesma mensagem duas vezes, porque só uma consegue a reserva.
 */
async function reservarDestinatario(supabase: ServiceClient, destinatarioId: string): Promise<boolean> {
  const agora = new Date()
  const vencida = new Date(agora.getTime() - RESERVA_VENCE_EM_MS).toISOString()
  const { data } = await supabase
    .from("campaign_recipients")
    .update({ reservado_em: agora.toISOString() })
    .eq("id", destinatarioId)
    .eq("status", "pendente")
    .or(`reservado_em.is.null,reservado_em.lt.${vencida}`)
    .select("id")
    .maybeSingle()
  return Boolean(data)
}

type CampaignRow = {
  id: string
  workspace_id: string
  tipo_mensagem: "texto" | "imagem" | "documento"
  conteudo: string | null
  arquivo_url: string | null
  arquivo_nome: string | null
  /** B7-03: número de origem escolhido. Nulo na campanha criada antes dele. */
  whatsapp_connection_id?: string | null
}

/**
 * B7-03: toda mensagem de campanha se declara disparo em massa.
 *
 * No canal direto isso é o que mantém o cliente que está esperando resposta na
 * frente da fila. A API Oficial ignora.
 */
const COMO_CAMPANHA = { prioridade: "campanha" } as const

type RecipientRow = {
  id: string
  contact_id: string | null
  nome_snapshot: string | null
  telefone_snapshot: string
}

/**
 * As variáveis da mensagem da campanha. Morava no motor das sequências, que saiu
 * na B28-06; as campanhas continuam com as mesmas duas.
 */
export function substituirVariaveis(
  texto: string,
  contexto: { nomeContato: string; nomeVendedor: string; campos?: Record<string, string> }
): string {
  // B38-05: `{{chave|reserva}}`, com o reserva quando o valor está vazio, e os campos
  // personalizados pela chave da variável de cada um. A campanha não tem `primeiro_nome`.
  return preencherVariaveis(texto, { ...contexto.campos, nome_contato: contexto.nomeContato, nome_vendedor: contexto.nomeVendedor })
}

/** B38-05: campanha com variável sem texto reserva não começa nem continua o envio (SUP-B38-18). */
export function campanhaPodeEnviar(conteudo: string | null): boolean {
  return variaveisSemReserva(conteudo ?? "").length === 0
}

/** B38-05: o valor de cada campo personalizado dos contatos, no formato do tipo, pela chave da variável. */
export async function variaveisDosCamposDosContatos(
  supabase: ServiceClient,
  workspaceId: string,
  contactIds: string[]
): Promise<Map<string, Record<string, string>>> {
  const porContato = new Map<string, Record<string, string>>()
  const campos = await camposDaEmpresa(supabase, workspaceId)
  if (campos.length === 0 || contactIds.length === 0) return porContato
  const valores = await valoresDosContatos(supabase, contactIds, campos.map((c) => c.id))
  for (const [contato, doContato] of valores) {
    porContato.set(
      contato,
      Object.fromEntries(campos.flatMap((c) => (doContato[c.id] ? [[chaveDaVariavel(c.nome), formatarValor(c, doContato[c.id])]] : [])))
    )
  }
  return porContato
}

async function enviarParaDestinatario(
  provider: ProviderWhatsApp,
  campanha: CampaignRow,
  destinatario: RecipientRow,
  nomeVendedor: string,
  campos: Record<string, string> = {}
): Promise<{ ok: boolean; wamid: string | null; motivo: string | null }> {
  const texto = substituirVariaveis(campanha.conteudo ?? "", {
    nomeContato: destinatario.nome_snapshot ?? "",
    nomeVendedor,
    campos,
  })

  // O try/catch continua aqui, e não dentro do provider: campanha trata falha
  // de rede como destinatário falho e segue o lote. Os outros chamadores
  // tratam diferente, por isso o provider não engole a exceção.
  try {
    let resultado: ResultadoEnvio

    if (campanha.tipo_mensagem === "imagem" && campanha.arquivo_url) {
      resultado = await provider.enviarMidia(
        destinatario.telefone_snapshot,
        { url: campanha.arquivo_url, tipo: "imagem", legenda: texto },
        COMO_CAMPANHA
      )
    } else if (campanha.tipo_mensagem === "documento" && campanha.arquivo_url) {
      resultado = await provider.enviarMidia(
        destinatario.telefone_snapshot,
        {
          url: campanha.arquivo_url,
          tipo: "documento",
          legenda: texto,
          nomeArquivo: campanha.arquivo_nome ?? "documento",
        },
        COMO_CAMPANHA
      )
    } else {
      resultado = await provider.enviarTexto(destinatario.telefone_snapshot, texto, COMO_CAMPANHA)
    }

    // B8-04: o motivo da recusa para de ser descartado. Mil "falhou" iguais no
    // relatório não dizem se o problema é o número do destinatário, o número de
    // envio ou o arquivo — e cada um pede uma reação diferente.
    if (!resultado.ok) {
      return { ok: false, wamid: null, motivo: motivoDaFalha({ mensagem: resultado.motivo }) }
    }

    return { ok: true, wamid: resultado.mensagemId, motivo: null }
  } catch {
    // Exceção aqui é rede ou canal fora do ar: a mensagem não chegou a ser
    // aceita, e isso é diferente de ter sido recusada.
    return { ok: false, wamid: null, motivo: MOTIVO_SEM_RESPOSTA }
  }
}

/**
 * O provider do número escolhido na campanha (B7-03).
 *
 * Sem número escolhido — campanha criada antes desta issue — cai no número
 * conectado do workspace, que é o comportamento de antes.
 *
 * Número escolhido que não está mais conectado devolve `null`, e quem chama já
 * sabe o que fazer: marcar os pendentes como falhos. É melhor do que disparar
 * mil mensagens por um número que o cliente não escolheu.
 */
async function providerDaCampanha(
  supabase: ServiceClient,
  campanha: CampaignRow
): Promise<ProviderWhatsApp | null> {
  if (!campanha.whatsapp_connection_id) {
    return resolverProvider(supabase, campanha.workspace_id)
  }

  const { data: conexao } = await supabase
    .from("whatsapp_connections")
    .select("canal, phone_number_id, access_token, instance_id, instance_token, status")
    .eq("id", campanha.whatsapp_connection_id)
    // B20-03: número de outra empresa não é número desta campanha.
    .eq("workspace_id", campanha.workspace_id)
    .maybeSingle()

  if (!conexao || conexao.status !== "connected") return null

  return providerDaConexao(conexao as ConexaoParaProvider)
}

async function processarCampanha(supabase: ServiceClient, campanha: CampaignRow): Promise<number> {
  // B38-05: texto salvo antes, com variável sem reserva, não envia até ganhar o reserva
  if (!campanhaPodeEnviar(campanha.conteudo)) return 0
  const provider = await providerDaCampanha(supabase, campanha)

  if (!provider) {
    // Sem conexão: marca todos os pendentes como falhos e encerra
    await supabase
      .from("campaign_recipients")
      .update({
        status: "falhou",
        motivo: MOTIVO_SEM_NUMERO,
        atualizado_em: new Date().toISOString(),
      })
      .eq("campaign_id", campanha.id)
      .eq("status", "pendente")
    await supabase
      .from("campaigns")
      .update({ status: "enviada", enviada_em: new Date().toISOString() })
      .eq("id", campanha.id)
    return 0
  }

  const { data: pendentes } = await supabase
    .from("campaign_recipients")
    .select("id, contact_id, nome_snapshot, telefone_snapshot")
    .eq("campaign_id", campanha.id)
    .eq("workspace_id", campanha.workspace_id)
    .eq("status", "pendente")
    .limit(TAMANHO_LOTE)

  const lote = (pendentes ?? []) as RecipientRow[]

  // Nome do vendedor por contato (variável {{nome_vendedor}})
  const contactIds = lote.map((r) => r.contact_id).filter(Boolean) as string[]
  const vendedorPorContato: Record<string, string> = {}
  // B13-03: contato que foi para a lixeira depois da confirmação não recebe.
  const naLixeira = new Set<string>()
  // B47-01: só contato da empresa da campanha, e a mensagem vai para o telefone atual dele
  const telefoneAtual = new Map<string, string>()
  if (contactIds.length > 0) {
    const { data: contatos } = await supabase
      .from("contacts")
      .select("id, phone_number, excluido_em, atendente:profiles!contacts_atendente_id_fkey(name)")
      .in("id", contactIds)
      .eq("workspace_id", campanha.workspace_id)
    for (const c of (contatos ?? []) as unknown as Array<{ id: string; phone_number: string; excluido_em: string | null; atendente: { name: string } | null }>) {
      telefoneAtual.set(c.id, c.phone_number)
      if (c.atendente?.name) vendedorPorContato[c.id] = c.atendente.name
      if (c.excluido_em) naLixeira.add(c.id)
    }
  }

  // B38-05: os campos personalizados do lote, para as variáveis
  const camposPorContato = await variaveisDosCamposDosContatos(supabase, campanha.workspace_id, contactIds)

  let enviados = 0
  for (const destinatario of lote) {
    // B8-03: a parada é conferida no meio do lote, e não só entre lotes. Com
    // ritmo de 40s, um lote de 40 leva quase meia hora: esperar o fim dele
    // seria pedir para parar e ver a campanha continuar por meia hora.
    const { data: atual } = await supabase
      .from("campaigns")
      .select("status")
      .eq("id", campanha.id)
      .maybeSingle()

    if (atual?.status !== "enviando") return enviados

    // B44-05: o contato apagado de vez deixa o destinatário sem contato ligado
    // (a lista é sempre montada a partir de contatos). Ele não recebe mais nada.
    if (!destinatario.contact_id) {
      await supabase
        .from("campaign_recipients")
        .update({ status: "excluido", motivo: MOTIVO_CONTATO_APAGADO, atualizado_em: new Date().toISOString() })
        .eq("id", destinatario.id)
        .eq("status", "pendente")
      continue
    }

    if (!(await reservarDestinatario(supabase, destinatario.id))) continue

    const telefone = telefoneAtual.get(destinatario.contact_id)
    if (!telefone) {
      await supabase
        .from("campaign_recipients")
        .update({ status: "excluido", motivo: MOTIVO_FORA_DA_EMPRESA, atualizado_em: new Date().toISOString() })
        .eq("id", destinatario.id)
      continue
    }

    if (naLixeira.has(destinatario.contact_id)) {
      await supabase
        .from("campaign_recipients")
        .update({ status: "excluido", atualizado_em: new Date().toISOString() })
        .eq("id", destinatario.id)
      continue
    }

    const nomeVendedor = destinatario.contact_id
      ? (vendedorPorContato[destinatario.contact_id] ?? "")
      : ""
    const campos = destinatario.contact_id ? (camposPorContato.get(destinatario.contact_id) ?? {}) : {}
    const resultado = await enviarParaDestinatario(provider, campanha, { ...destinatario, telefone_snapshot: telefone }, nomeVendedor, campos)
    await supabase
      .from("campaign_recipients")
      .update({
        // B47-01: o relatório mostra para onde foi, mesmo que o guardado fosse outro
        telefone_snapshot: telefone,
        // B8-02: pelo canal direto a resposta significa *aceita*, não
        // *enviada* — toda mensagem é enfileirada e respeita ritmo, tetos e
        // janela. Quem confirma o envio é o evento `message.status` com `sent`.
        // Pela API Oficial a resposta já é o envio.
        status: resultado.ok ? (provider.canal === "gateway" ? "na_fila" : "enviado") : "falhou",
        wamid: resultado.wamid,
        motivo: resultado.motivo,
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", destinatario.id)
    if (resultado.ok) enviados++
  }

  // Sem mais pendentes? Campanha concluída.
  const { count } = await supabase
    .from("campaign_recipients")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campanha.id)
    .eq("status", "pendente")

  if ((count ?? 0) === 0) {
    await supabase
      .from("campaigns")
      .update({ status: "enviada", enviada_em: new Date().toISOString() })
      .eq("id", campanha.id)
  }

  return enviados
}

export async function processarCampanhasPendentes(): Promise<number> {
  const supabase = createServiceClient()
  const agora = new Date().toISOString()

  // Campanhas agendadas vencidas passam para "enviando". B38-05: a que tem variável
  // sem texto reserva continua agendada, marcada "precisa de ajuste", até ganhar o reserva.
  const { data: vencidas } = await supabase
    .from("campaigns")
    .select("id, conteudo")
    .eq("status", "agendada")
    .lte("agendada_para", agora)
  const prontas = (vencidas ?? []).filter((c) => campanhaPodeEnviar(c.conteudo)).map((c) => c.id)
  if (prontas.length > 0) {
    await supabase.from("campaigns").update({ status: "enviando" }).in("id", prontas).eq("status", "agendada")
  }

  // B44-05: a fila é de todas as empresas. Em ordem de chegada, e a campanha que
  // não tem como sair vira "Interrompida" e sai da fila, para não ocupar a vaga
  // de quem pode sair (antes, três travadas de uma empresa seguravam as demais).
  const { data: enviando } = await supabase
    .from("campaigns")
    .select("id, workspace_id, tipo_mensagem, conteudo, arquivo_url, arquivo_nome, whatsapp_connection_id")
    .eq("status", "enviando")
    .order("agendada_para", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: true })

  const fila = (enviando ?? []) as CampaignRow[]
  const travadas = fila.filter((c) => !campanhaPodeEnviar(c.conteudo)).map((c) => c.id)
  if (travadas.length > 0) {
    await supabase
      .from("campaigns")
      .update({ status: "interrompida", interrompida_motivo: MOTIVO_TEXTO_SEM_RESERVA, interrompida_em: agora })
      .in("id", travadas)
      .eq("status", "enviando")
  }
  // B47-01: anexo que não é da empresa só chega aqui gravado direto no banco
  const anexoDeFora = (c: CampaignRow) => Boolean(c.arquivo_url) && !anexoDaEmpresa(c.arquivo_url!, c.workspace_id)
  const adulteradas = fila.filter(anexoDeFora).map((c) => c.id)
  if (adulteradas.length > 0) {
    await supabase
      .from("campaigns")
      .update({ status: "interrompida", interrompida_motivo: MOTIVO_ANEXO_DE_FORA, interrompida_em: agora })
      .in("id", adulteradas)
      .eq("status", "enviando")
  }
  const daVez = fila.filter((c) => campanhaPodeEnviar(c.conteudo) && !anexoDeFora(c)).slice(0, CAMPANHAS_POR_RODADA)

  let total = 0
  for (const campanha of daVez) {
    try {
      total += await processarCampanha(supabase, campanha)
    } catch {
      // falha em uma campanha não interrompe as demais
    }
  }

  return total
}
