// Ações de envio das automações (B11-07): texto com variáveis, mensagem rápida
// cadastrada e imagem ou documento escolhido no editor.
//
// A mensagem sai pela conversa do evento, quando ele tem uma (mensagem
// recebida, conversa criada…): com dois números, a resposta sai por onde o
// cliente escreveu, e fica gravada naquela conversa. Nos outros gatilhos, sai
// pela conversa aberta do contato (`enviarWhatsAppComMotivo`).
//
// O envio não chama o motor de novo: mensagem de automação não dispara a regra
// de "mensagem enviada pelo time" (B11-05).
// Decisões: pre-desenvolvimento/decisoes/B11-automacoes-em-fluxo.md, seção 14.

import type { ResultadoAcao } from "@/lib/fluxo-automacao"
import { substituirVariaveis } from "@/lib/sequencias"
import { enviarWhatsAppComMotivo, type ConteudoDoEnvio } from "@/lib/whatsapp-envio"
import { conversaDoEvento, type ContextoDaExecucao } from "./contexto"
import { arquivoDaAutomacaoValido } from "./referencias"

export interface VariaveisDaMensagem {
  /** Nome do contato ou, sem nome, o telefone: a regra das sequências e das campanhas. */
  nomeContato: string
  /** Primeira palavra do nome. Sem nome, vazio: "Oi 5519…" soa pior que "Oi ,". */
  primeiroNome: string
  nomeVendedor: string
}

/** {{nome_contato}}, {{primeiro_nome}} e {{nome_vendedor}}. As duas de fora são as das sequências. */
export function textoComVariaveis(texto: string, variaveis: VariaveisDaMensagem): string {
  return substituirVariaveis(texto.replaceAll("{{primeiro_nome}}", variaveis.primeiroNome), variaveis)
}

export async function enviarTexto(contexto: ContextoDaExecucao, contactId: string, texto: string): Promise<ResultadoAcao> {
  return enviar(contexto, contactId, { tipo: "texto", texto: await preencherVariaveis(contexto, contactId, texto) })
}

export async function enviarMensagemRapida(
  contexto: ContextoDaExecucao,
  contactId: string,
  mensagemRapidaId: string
): Promise<ResultadoAcao> {
  // O service client passa por cima da RLS: a empresa da mensagem é conferida aqui
  const { data: rapida, error } = await contexto.supabase
    .from("quick_replies")
    .select("content")
    .eq("id", mensagemRapidaId)
    .eq("workspace_id", contexto.gatilho.workspaceId)
    .maybeSingle()
  if (error) return { ok: false, motivo: "Erro ao consultar o banco" }
  if (!rapida) return { ok: false, motivo: "A mensagem rápida não existe mais" }
  return enviarTexto(contexto, contactId, rapida.content)
}

export async function enviarArquivo(
  contexto: ContextoDaExecucao,
  contactId: string,
  arquivo: { url: string; nome: string; tipo: string }
): Promise<ResultadoAcao> {
  if (!arquivoDaAutomacaoValido(arquivo, contexto.gatilho.workspaceId)) {
    return { ok: false, motivo: "O arquivo da ação não é válido. Escolha o arquivo de novo no editor." }
  }
  return enviar(contexto, contactId, {
    tipo: arquivo.tipo as "imagem" | "documento",
    url: arquivo.url,
    nomeArquivo: arquivo.nome || "arquivo",
  })
}

async function enviar(contexto: ContextoDaExecucao, contactId: string, conteudo: ConteudoDoEnvio): Promise<ResultadoAcao> {
  const conversaId = await conversaDoEvento(contexto)
  return enviarWhatsAppComMotivo(contexto.supabase, contexto.gatilho.workspaceId, contactId, conteudo, conversaId)
}

/** Só consulta o banco quando o texto tem alguma variável. */
async function preencherVariaveis(contexto: ContextoDaExecucao, contactId: string, texto: string): Promise<string> {
  if (!texto.includes("{{")) return texto
  return textoComVariaveis(texto, await variaveisDoContato(contexto, contactId))
}

/**
 * O vendedor é o atendente da conversa. Sem atendente, o do card principal do
 * contato: o da Recompra, se houver, senão o da Entrada, a mesma escolha do
 * "atribuir" (decisões, seção 10.5). Sem nenhum, vazio.
 */
async function variaveisDoContato(contexto: ContextoDaExecucao, contactId: string): Promise<VariaveisDaMensagem> {
  const { supabase, gatilho } = contexto
  const [{ data: contato }, conversaId] = await Promise.all([
    supabase.from("contacts").select("name, phone_number").eq("id", contactId).eq("workspace_id", gatilho.workspaceId).maybeSingle(),
    conversaDoEvento(contexto),
  ])
  const nome = contato?.name?.trim() ?? ""

  let vendedorId: string | null = null
  if (conversaId) {
    const { data: conversa } = await supabase.from("conversations").select("assigned_to").eq("id", conversaId).maybeSingle()
    vendedorId = conversa?.assigned_to ?? null
  }
  if (!vendedorId) {
    const { data: cards } = await supabase
      .from("pipeline_cards")
      .select("funil, atendente_id")
      .eq("workspace_id", gatilho.workspaceId)
      .eq("contact_id", contactId)
    const principal = cards?.find((c) => c.funil === "recompra") ?? cards?.find((c) => c.funil === "entrada")
    vendedorId = principal?.atendente_id ?? null
  }
  let nomeVendedor = ""
  if (vendedorId) {
    const { data: vendedor } = await supabase.from("profiles").select("name").eq("id", vendedorId).maybeSingle()
    nomeVendedor = vendedor?.name ?? ""
  }

  return {
    nomeContato: nome || contato?.phone_number || "",
    primeiroNome: nome.split(/\s+/)[0] ?? "",
    nomeVendedor,
  }
}
