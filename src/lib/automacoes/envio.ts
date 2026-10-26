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
import { GatewayIndisponivel } from "@/lib/whatsapp/gateway/cliente"
import { enviarWhatsAppComMotivo, type ConteudoDoEnvio } from "@/lib/whatsapp-envio"
import { conversaDoEvento, type ContextoDaExecucao } from "./contexto"
import { chaveDaVariavel, preencherVariaveis as preencherVariaveisDoTexto, variaveisSemReserva } from "@/lib/variaveis-mensagem"
import { formatarValor } from "@/lib/campos-personalizados"
import { camposDaEmpresa, valoresDosContatos } from "@/lib/campos-personalizados-servidor"
import { arquivoDaAutomacaoValido } from "./referencias"

export interface VariaveisDaMensagem {
  /** Nome do contato; sem nome, vazio, e entra o texto reserva da variável (B38-05). */
  nomeContato: string
  /** Primeira palavra do nome. Sem nome, vazio: "Oi 5519…" soa pior que "Oi ,". */
  primeiroNome: string
  nomeVendedor: string
}

/**
 * {{nome_contato}}, {{primeiro_nome}} e {{nome_vendedor}}, com ou sem espaço dentro
 * das chaves. Uma troca só (B22-39): o que entra no lugar de uma variável não é lido
 * de novo, então um contato chamado "{{nome_vendedor}}" continua com esse nome.
 */
export function textoComVariaveis(texto: string, variaveis: VariaveisDaMensagem, campos: Record<string, string> = {}): string {
  // B38-05: com `{{chave|reserva}}`, o reserva entra quando o valor está vazio; os
  // campos personalizados entram pela chave da variável de cada um
  return preencherVariaveisDoTexto(texto, {
    ...campos,
    nome_contato: variaveis.nomeContato,
    primeiro_nome: variaveis.primeiroNome,
    nome_vendedor: variaveis.nomeVendedor,
  })
}

/** B38-05: o motivo da ação que não sai porque o texto tem variável sem reserva (SUP-B38-18). */
export function motivoSemReserva(texto: string): string | null {
  const sem = variaveisSemReserva(texto)
  return sem.length > 0 ? `Precisa de ajuste: ${sem.join(", ")} sem texto reserva` : null
}

export async function enviarTexto(contexto: ContextoDaExecucao, contactId: string, texto: string): Promise<ResultadoAcao> {
  // B38-05: texto salvo antes, com variável sem reserva, não sai até ganhar o reserva
  const semReserva = motivoSemReserva(texto)
  if (semReserva) return { ok: false, motivo: semReserva }
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

/** Falha de rede com o WhatsApp: o pedido pode ter saído ou não, e ninguém confirmou (B22-24). */
export const MOTIVO_FALHA_DE_REDE = "Sem conexão com o WhatsApp: o envio não foi confirmado"

async function enviar(contexto: ContextoDaExecucao, contactId: string, conteudo: ConteudoDoEnvio): Promise<ResultadoAcao> {
  const conversaId = await conversaDoEvento(contexto)
  try {
    return await enviarWhatsAppComMotivo(contexto.supabase, contexto.gatilho.workspaceId, contactId, conteudo, conversaId)
  } catch (erro) {
    // Os providers deixam a falha de rede subir (a Meta, como TypeError do fetch; o
    // gateway, como GatewayIndisponivel). Aqui ela vira o motivo do histórico, em vez
    // de "Erro inesperado ao executar a ação"
    if (erro instanceof TypeError || erro instanceof GatewayIndisponivel || (erro as Error)?.name === "TimeoutError") {
      return { ok: false, motivo: MOTIVO_FALHA_DE_REDE }
    }
    throw erro
  }
}

/** Só consulta o banco quando o texto tem alguma variável. */
/** Também usado pelo lembrete criado por automação (B28-01), com as mesmas variáveis. */
export async function preencherVariaveis(contexto: ContextoDaExecucao, contactId: string, texto: string): Promise<string> {
  if (!texto.includes("{{")) return texto
  return textoComVariaveis(texto, await variaveisDoContato(contexto, contactId), await variaveisDosCampos(contexto, contactId))
}

/** B38-05: o valor de cada campo personalizado do contato, no formato do tipo, pela chave da variável. */
async function variaveisDosCampos({ supabase, gatilho }: ContextoDaExecucao, contactId: string): Promise<Record<string, string>> {
  const campos = await camposDaEmpresa(supabase, gatilho.workspaceId)
  if (campos.length === 0) return {}
  const valores = (await valoresDosContatos(supabase, [contactId], campos.map((c) => c.id))).get(contactId) ?? {}
  return Object.fromEntries(
    campos.flatMap((c) => (valores[c.id] ? [[chaveDaVariavel(c.nome), formatarValor(c, valores[c.id])]] : []))
  )
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

  // B38-05: sem nome, entra o texto reserva da variável (CA-B38-60), e não mais o telefone
  return {
    nomeContato: nome,
    primeiroNome: nome.split(/\s+/)[0] ?? "",
    nomeVendedor,
  }
}
