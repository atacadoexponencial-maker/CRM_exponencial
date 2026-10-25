// Histórico de execuções e proteção de repetição (B11-03).
//
// Toda regra que o evento dispara vira uma linha em `automation_runs`: concluída,
// com falha, ou ignorada pela proteção. A linha guarda cópias (nome da regra,
// evento, blocos percorridos), para a execução continuar legível depois que a
// regra muda ou é excluída.
// Decisões: pre-desenvolvimento/decisoes/B11-automacoes-em-fluxo.md, seção 8.

import type { Json } from "@/integrations/supabase/types"
import type { Bloco, CaminhoPercorrido, Fluxo, Repeticao, SaidaDaEspera } from "@/lib/fluxo-automacao"
import type { GatilhoAutomacao, ServiceClient } from "./contexto"

/**
 * `esperando`: parada num bloco "esperar", com a mesma linha seguindo depois;
 * `cancelada`: a espera não seguiu (contato na lixeira, regra mudou) (B28-02).
 */
export type ResultadoExecucao = "concluida" | "falhou" | "ignorada" | "esperando" | "cancelada"

export const RESULTADOS_DA_EXECUCAO: readonly ResultadoExecucao[] = [
  "concluida",
  "falhou",
  "ignorada",
  "esperando",
  "cancelada",
]

/** Um passo do caminho, como fica gravado: a cópia do bloco e o que aconteceu nele. */
export interface PassoGravado {
  bloco: Bloco
  /** Saída tomada, nas condições e no bloco "esperar" depois que a espera acaba. */
  saida?: "sim" | "nao" | SaidaDaEspera
  /** Nas ações: deu certo? Na condição que deu erro: `false`. */
  ok?: boolean
  motivo?: string
  /** No bloco "esperar": desde quando o contato espera. */
  desde?: string
  /** No bloco "esperar": quando a espera acabou, pela `saida`. */
  em?: string
}

export interface RegraDaExecucao {
  id: string
  nome: string
  repeticao: Repeticao
}

/**
 * Os passos na ordem do caminho, com a saída de cada condição e o resultado de
 * cada ação. O bloco "esperar" onde o caminho parou ganha `desde` (B28-02).
 */
export function passosDoCaminho(fluxo: Fluxo, caminho: CaminhoPercorrido, agora = new Date()): PassoGravado[] {
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
    if (caminho.espera === id) passo.desde = agora.toISOString()
    passos.push(passo)
  }
  return passos
}

/** Falhou se alguma ação falhou ou uma condição deu erro; senão, concluída. */
export function resultadoDoCaminho(caminho: CaminhoPercorrido): "concluida" | "falhou" {
  return caminho.falhas.length > 0 || caminho.erro ? "falhou" : "concluida"
}

/** O mesmo, sobre o caminho gravado, que junta o que veio antes e depois de uma espera (B28-02). */
export function resultadoDosPassos(passos: PassoGravado[]): "concluida" | "falhou" {
  return passos.some((p) => p.ok === false) ? "falhou" : "concluida"
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
    case "entrou_perfil_rfv":
      return { tipo: gatilho.tipo, de: gatilho.de, para: gatilho.para, mudancaId: gatilho.mudancaId }
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
 * Caminho com pelo menos uma ação que deu certo, no formato do `contains` do
 * PostgREST para jsonb (`caminho @> ...`). Ação que não mudou nada porque o
 * contato já estava como ela deixaria conta como feita (ver `acoes.ts`).
 */
const CAMINHO_COM_ACAO_FEITA = JSON.stringify([{ bloco: { tipo: "acao" }, ok: true }])

/** CA-B28-17: o motivo da regra que o contato não pode recomeçar. */
export const JA_ESPERANDO = "O contato já está esperando nesta regra"

/**
 * Por que a regra não deve rodar agora para o contato, ou `null` para rodar.
 * Só gasta a vez a execução em que alguma ação deu certo (B22-01, achado G1 do
 * QA de 09/10): sair pelo "não" sem ação, ou ter todas as ações falhando, não
 * conta. Sem contato no evento, não há o que proteger. Erro de banco sobe: quem
 * chama prefere não disparar a disparar em dobro.
 */
export async function motivoParaIgnorar(
  supabase: ServiceClient,
  regra: RegraDaExecucao,
  contactId: string | null
): Promise<string | null> {
  if (!contactId) return null

  // B28-02: contato esperando na regra não a começa de novo, qualquer que seja a repetição
  const { data: esperando, error: erroDaEspera } = await supabase
    .from("automation_runs")
    .select("id")
    .eq("regra_id", regra.id)
    .eq("contact_id", contactId)
    .eq("resultado", "esperando")
    .limit(1)
    .maybeSingle()
  if (erroDaEspera) throw erroDaEspera
  if (esperando) return JA_ESPERANDO

  const { repeticao } = regra
  if (repeticao.modo === "sempre") return null

  let consulta = supabase
    .from("automation_runs")
    .select("id")
    .eq("regra_id", regra.id)
    .eq("contact_id", contactId)
    // Ignorada não tem caminho, então não mudaria o resultado; fica porque é a
    // condição do índice parcial automation_runs_protecao
    .neq("resultado", "ignorada")
    .contains("caminho", CAMINHO_COM_ACAO_FEITA)
  if (repeticao.modo === "a_cada_horas") {
    consulta = consulta.gte("created_at", new Date(Date.now() - repeticao.horas * 3_600_000).toISOString())
  }
  const { data, error } = await consulta.limit(1).maybeSingle()
  if (error) throw error
  if (!data) return null

  if (repeticao.modo === "uma_vez_por_contato") return "Já rodou para este contato (proteção: uma vez por contato)"
  // B22-41: "na última hora", e não "nas últimas 1 horas"
  const quando = repeticao.horas === 1 ? "na última hora" : `nas últimas ${repeticao.horas} horas`
  return `Já rodou para este contato ${quando} (proteção de repetição)`
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
    /** Na execução esperando: quando o relógio a segue (nulo se ela não espera tempo). */
    retomarEm?: string | null
  }
): Promise<void> {
  try {
    const esperando = dados.resultado === "esperando"
    await supabase.from("automation_runs").insert({
      // B28-02: a execução esperando guarda o evento inteiro, para seguir com ele
      ...(esperando ? { gatilho: dados.gatilho as unknown as Json, retomar_em: dados.retomarEm ?? null } : {}),
      workspace_id: dados.gatilho.workspaceId,
      regra_id: dados.regra.id,
      // A coluna separava as regras da primeira versão (`'antiga'`), que saíram
      // na B11-13; ela continua obrigatória
      regra_origem: "fluxo",
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
