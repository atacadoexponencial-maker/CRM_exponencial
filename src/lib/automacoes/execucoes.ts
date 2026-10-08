// Histórico de execuções e proteção de repetição (B11-03).
//
// Toda regra que o evento dispara vira uma linha em `automation_runs`: concluída,
// com falha, ou ignorada pela proteção. A linha guarda cópias (nome da regra,
// evento, blocos percorridos), para a execução continuar legível depois que a
// regra muda ou é excluída.
// Decisões: pre-desenvolvimento/decisoes/B11-automacoes-em-fluxo.md, seção 8.

import type { Json } from "@/integrations/supabase/types"
import type { Bloco, CaminhoPercorrido, Fluxo, Repeticao } from "@/lib/fluxo-automacao"
import type { GatilhoAutomacao, ServiceClient } from "./contexto"

export type ResultadoExecucao = "concluida" | "falhou" | "ignorada"

/** Um passo do caminho, como fica gravado: a cópia do bloco e o que aconteceu nele. */
export interface PassoGravado {
  bloco: Bloco
  /** Saída tomada, nas condições. */
  saida?: "sim" | "nao"
  /** Nas ações: deu certo? Na condição que deu erro: `false`. */
  ok?: boolean
  motivo?: string
}

export interface RegraDaExecucao {
  id: string
  origem: "fluxo" | "antiga"
  nome: string
  repeticao: Repeticao
}

/** Os passos na ordem do caminho, com a saída de cada condição e o resultado de cada ação. */
export function passosDoCaminho(fluxo: Fluxo, caminho: CaminhoPercorrido): PassoGravado[] {
  const porId = new Map(fluxo.blocos.map((b) => [b.id, b]))
  const passos: PassoGravado[] = []
  for (const id of caminho.blocos) {
    const bloco = porId.get(id)
    if (!bloco) continue
    const passo: PassoGravado = { bloco }
    const saida = caminho.saidas[id]
    if (saida === "sim" || saida === "nao") passo.saida = saida
    if (bloco.tipo === "acao") {
      passo.ok = !caminho.falhas.includes(id)
      if (caminho.motivos[id]) passo.motivo = caminho.motivos[id]
    }
    if (caminho.erro?.bloco === id) {
      passo.ok = false
      passo.motivo = caminho.erro.motivo
    }
    passos.push(passo)
  }
  return passos
}

/** Falhou se alguma ação falhou ou uma condição deu erro; senão, concluída. */
export function resultadoDoCaminho(caminho: CaminhoPercorrido): "concluida" | "falhou" {
  return caminho.falhas.length > 0 || caminho.erro ? "falhou" : "concluida"
}

/** Trecho da mensagem guardado no histórico: o bastante para reconhecer qual foi. */
const TEXTO_MAXIMO_NO_HISTORICO = 200

/** O evento sem a empresa e o contato, que ficam em colunas próprias. */
export function eventoGravado(gatilho: GatilhoAutomacao): Record<string, string> {
  switch (gatilho.tipo) {
    case "card_movido":
      return { tipo: gatilho.tipo, funil: gatilho.funil, etapa: gatilho.etapa, cardId: gatilho.cardId }
    case "conversa_criada":
      return { tipo: gatilho.tipo, conversationId: gatilho.conversationId }
    case "tag_adicionada":
      return { tipo: gatilho.tipo, tag: gatilho.tag }
    case "etiqueta_aplicada":
      return { tipo: gatilho.tipo, conversationId: gatilho.conversationId, labelId: gatilho.labelId }
    case "dado_contato_alterado":
      return { tipo: gatilho.tipo, campo: gatilho.campo, valor: gatilho.valor }
    case "mensagem_recebida":
    case "mensagem_enviada_time":
      return {
        tipo: gatilho.tipo,
        conversationId: gatilho.conversationId,
        messageId: gatilho.messageId,
        tipoMensagem: gatilho.tipoMensagem,
        texto: gatilho.texto.slice(0, TEXTO_MAXIMO_NO_HISTORICO),
      }
  }
}

/**
 * Por que a regra não deve rodar agora para o contato, ou `null` para rodar.
 * Conta as execuções concluídas e com falha: uma ignorada não "gasta" a vez.
 * Sem contato no evento, não há o que proteger. Erro de banco sobe: quem chama
 * prefere não disparar a disparar em dobro.
 */
export async function motivoParaIgnorar(
  supabase: ServiceClient,
  regra: RegraDaExecucao,
  contactId: string | null
): Promise<string | null> {
  const { repeticao } = regra
  if (repeticao.modo === "sempre" || !contactId) return null

  let consulta = supabase
    .from("automation_runs")
    .select("id")
    .eq("regra_id", regra.id)
    .eq("contact_id", contactId)
    .neq("resultado", "ignorada")
  if (repeticao.modo === "a_cada_horas") {
    consulta = consulta.gte("created_at", new Date(Date.now() - repeticao.horas * 3_600_000).toISOString())
  }
  const { data, error } = await consulta.limit(1).maybeSingle()
  if (error) throw error
  if (!data) return null

  return repeticao.modo === "uma_vez_por_contato"
    ? "Já rodou para este contato (proteção: uma vez por contato)"
    : `Já rodou para este contato nas últimas ${repeticao.horas} horas (proteção de repetição)`
}

/** Grava a execução. Nunca lança: o histórico falhar não pode derrubar o motor. */
export async function registrarExecucao(
  supabase: ServiceClient,
  dados: {
    gatilho: GatilhoAutomacao
    regra: RegraDaExecucao
    resultado: ResultadoExecucao
    motivo?: string | null
    passos?: PassoGravado[]
  }
): Promise<void> {
  try {
    await supabase.from("automation_runs").insert({
      workspace_id: dados.gatilho.workspaceId,
      regra_id: dados.regra.id,
      regra_origem: dados.regra.origem,
      regra_nome: dados.regra.nome,
      contact_id: dados.gatilho.contactId,
      evento: eventoGravado(dados.gatilho),
      resultado: dados.resultado,
      motivo: dados.motivo ?? null,
      caminho: (dados.passos ?? []) as unknown as Json,
    })
  } catch {
    // Sem histórico desta execução, mas as ações já rodaram
  }
}
