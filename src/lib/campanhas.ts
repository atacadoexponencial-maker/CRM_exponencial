// Motor de envio de campanhas (Módulo 7): processa campanhas agendadas
// vencidas e envia as mensagens individualmente para cada destinatário via
// WhatsApp API Oficial. Roda no backend com service client; o envio é em
// lotes para caber no tempo de execução de uma função serverless — o cron
// e o processamento oportunista continuam de onde parou.

import { createServiceClient } from "@/integrations/supabase/service"
import { substituirVariaveis } from "@/lib/sequencias"
import { resolverProvider } from "@/lib/whatsapp"
import type { ProviderWhatsApp, ResultadoEnvio } from "@/lib/whatsapp"

const TAMANHO_LOTE = 40

type ServiceClient = ReturnType<typeof createServiceClient>

type CampaignRow = {
  id: string
  workspace_id: string
  tipo_mensagem: "texto" | "imagem" | "documento"
  conteudo: string | null
  arquivo_url: string | null
  arquivo_nome: string | null
}

type RecipientRow = {
  id: string
  contact_id: string | null
  nome_snapshot: string | null
  telefone_snapshot: string
}

async function enviarParaDestinatario(
  provider: ProviderWhatsApp,
  campanha: CampaignRow,
  destinatario: RecipientRow,
  nomeVendedor: string
): Promise<{ ok: boolean; wamid: string | null }> {
  const texto = substituirVariaveis(campanha.conteudo ?? "", {
    nomeContato: destinatario.nome_snapshot ?? "",
    nomeVendedor,
  })

  // O try/catch continua aqui, e não dentro do provider: campanha trata falha
  // de rede como destinatário falho e segue o lote. Os outros chamadores
  // tratam diferente, por isso o provider não engole a exceção.
  try {
    let resultado: ResultadoEnvio

    if (campanha.tipo_mensagem === "imagem" && campanha.arquivo_url) {
      resultado = await provider.enviarMidia(destinatario.telefone_snapshot, {
        url: campanha.arquivo_url,
        tipo: "imagem",
        legenda: texto,
      })
    } else if (campanha.tipo_mensagem === "documento" && campanha.arquivo_url) {
      resultado = await provider.enviarMidia(destinatario.telefone_snapshot, {
        url: campanha.arquivo_url,
        tipo: "documento",
        legenda: texto,
        nomeArquivo: campanha.arquivo_nome ?? "documento",
      })
    } else {
      resultado = await provider.enviarTexto(destinatario.telefone_snapshot, texto)
    }

    if (!resultado.ok) return { ok: false, wamid: null }

    return { ok: true, wamid: resultado.mensagemId }
  } catch {
    return { ok: false, wamid: null }
  }
}

async function processarCampanha(supabase: ServiceClient, campanha: CampaignRow): Promise<number> {
  const provider = await resolverProvider(supabase, campanha.workspace_id)

  if (!provider) {
    // Sem conexão: marca todos os pendentes como falhos e encerra
    await supabase
      .from("campaign_recipients")
      .update({ status: "falhou", atualizado_em: new Date().toISOString() })
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
    .eq("status", "pendente")
    .limit(TAMANHO_LOTE)

  const lote = (pendentes ?? []) as RecipientRow[]

  // Nome do vendedor por contato (variável {{nome_vendedor}})
  const contactIds = lote.map((r) => r.contact_id).filter(Boolean) as string[]
  const vendedorPorContato: Record<string, string> = {}
  if (contactIds.length > 0) {
    const { data: contatos } = await supabase
      .from("contacts")
      .select("id, atendente:profiles!contacts_atendente_id_fkey(name)")
      .in("id", contactIds)
    for (const c of (contatos ?? []) as unknown as Array<{ id: string; atendente: { name: string } | null }>) {
      if (c.atendente?.name) vendedorPorContato[c.id] = c.atendente.name
    }
  }

  let enviados = 0
  for (const destinatario of lote) {
    const nomeVendedor = destinatario.contact_id
      ? (vendedorPorContato[destinatario.contact_id] ?? "")
      : ""
    const resultado = await enviarParaDestinatario(provider, campanha, destinatario, nomeVendedor)
    await supabase
      .from("campaign_recipients")
      .update({
        status: resultado.ok ? "enviado" : "falhou",
        wamid: resultado.wamid,
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

  // Campanhas agendadas vencidas passam para "enviando"
  await supabase
    .from("campaigns")
    .update({ status: "enviando" })
    .eq("status", "agendada")
    .lte("agendada_para", agora)

  const { data: enviando } = await supabase
    .from("campaigns")
    .select("id, workspace_id, tipo_mensagem, conteudo, arquivo_url, arquivo_nome")
    .eq("status", "enviando")
    .limit(3)

  let total = 0
  for (const campanha of (enviando ?? []) as CampaignRow[]) {
    try {
      total += await processarCampanha(supabase, campanha)
    } catch {
      // falha em uma campanha não interrompe as demais
    }
  }

  return total
}
