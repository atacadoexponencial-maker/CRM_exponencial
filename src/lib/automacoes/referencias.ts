// O que um fluxo cita de fora dele: etiquetas, atendentes, números de WhatsApp,
// times, sequências, etapas de funil, mensagens rápidas e arquivos. O servidor
// confere tudo antes de gravar, porque o motor roda com o service client, que
// passa por cima da RLS: uma etiqueta de outra empresa gravada no fluxo seria
// aplicada sem ninguém barrar.

import { CLASSIFICACAO_LABEL, TIPO_LABEL } from "@/app/(auth)/contatos/mock-contatos"
import { ETAPAS_ENTRADA, ETAPAS_RECOMPRA } from "@/app/(auth)/pipeline/mock-pipeline"
import type { Fluxo } from "@/lib/fluxo-automacao"

export interface ReferenciasDoFluxo {
  etiquetas: string[]
  atendentes: string[]
  conexoes: string[]
  times: string[]
  sequencias: string[]
  etapas: Array<{ funil: string; etapa: string }>
  /** Campo e valor de cada "alterar dado do contato". */
  dadosDoContato: Array<{ campo: string; valor: string }>
  /** Valores das verificações "tipo do contato é" e "classificação do contato é". */
  tiposDeContato: string[]
  classificacoes: string[]
  /** Campo e valor do gatilho "dado do contato alterado" (B11-06). */
  gatilhosDeDado: Array<{ campo: string; valor: string }>
  /** B11-07 */
  mensagensRapidas: string[]
  arquivos: Array<{ url: string; tipo: string }>
}

const PREFIXO_NUMERO = "numero:"

export function referenciasDoFluxo(fluxo: Fluxo): ReferenciasDoFluxo {
  const etiquetas = new Set<string>()
  const atendentes = new Set<string>()
  const conexoes = new Set<string>()
  const times = new Set<string>()
  const sequencias = new Set<string>()
  const etapas: ReferenciasDoFluxo["etapas"] = []
  const dadosDoContato: ReferenciasDoFluxo["dadosDoContato"] = []
  const tiposDeContato: string[] = []
  const classificacoes: string[] = []
  const gatilhosDeDado: ReferenciasDoFluxo["gatilhosDeDado"] = []
  const mensagensRapidas = new Set<string>()
  const arquivos: ReferenciasDoFluxo["arquivos"] = []

  for (const bloco of fluxo.blocos) {
    if (bloco.tipo === "condicao") {
      for (const v of bloco.verificacoes) {
        if (v.tipo === "etiqueta_conversa" && v.valor) etiquetas.add(v.valor)
        if (v.tipo === "atendente" && v.operador === "e" && v.valor) atendentes.add(v.valor)
        if (v.tipo === "canal" && v.valor.startsWith(PREFIXO_NUMERO)) conexoes.add(v.valor.slice(PREFIXO_NUMERO.length))
        if (v.tipo === "card_etapa") {
          const [funil = "", etapa = ""] = v.valor.split(":")
          etapas.push({ funil, etapa })
        }
        if (v.tipo === "tipo_contato") tiposDeContato.push(v.valor)
        if (v.tipo === "classificacao") classificacoes.push(v.valor)
      }
      continue
    }

    const p = bloco.parametros
    if (p.label_id) etiquetas.add(p.label_id)
    if (p.atendente_id) atendentes.add(p.atendente_id)
    if (p.time_id) times.add(p.time_id)
    if (p.sequencia_id) sequencias.add(p.sequencia_id)
    // Funil sozinho também é conferido: o gatilho "card movido" aceita "qualquer etapa"
    if (p.funil) etapas.push({ funil: p.funil, etapa: p.etapa ?? "" })
    if (bloco.tipo === "acao" && bloco.acao === "alterar_dado_contato") {
      dadosDoContato.push({ campo: p.campo ?? "", valor: p.valor ?? "" })
    }
    if (bloco.tipo === "gatilho" && bloco.gatilho === "dado_contato_alterado") {
      gatilhosDeDado.push({ campo: p.campo ?? "", valor: p.valor ?? "" })
    }
    if (p.mensagem_rapida_id) mensagensRapidas.add(p.mensagem_rapida_id)
    if (bloco.tipo === "acao" && bloco.acao === "enviar_midia") arquivos.push({ url: p.arquivo ?? "", tipo: p.arquivo_tipo ?? "" })
  }

  return {
    etiquetas: [...etiquetas],
    atendentes: [...atendentes],
    conexoes: [...conexoes],
    times: [...times],
    sequencias: [...sequencias],
    etapas,
    dadosDoContato,
    tiposDeContato,
    classificacoes,
    gatilhosDeDado,
    mensagensRapidas: [...mensagensRapidas],
    arquivos,
  }
}

/** Onde os arquivos das automações ficam (B11-07): o bucket das campanhas, numa pasta por empresa. */
export const BUCKET_DOS_ARQUIVOS = "chat-attachments"
export const pastaDosArquivos = (workspaceId: string) => `${workspaceId}/automacoes`
export const TIPOS_DE_ARQUIVO = ["imagem", "documento"] as const

/**
 * O arquivo de uma ação "enviar imagem ou documento" é um que o editor subiu
 * para esta empresa? O motor roda com o service client e entrega o endereço ao
 * WhatsApp, que vai buscá-lo: um endereço qualquer, gravado por fora do editor,
 * mandaria para o cliente o que estivesse lá.
 */
export function arquivoDaAutomacaoValido(
  { url, tipo }: { url: string; tipo: string },
  workspaceId: string,
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
): boolean {
  if (!(TIPOS_DE_ARQUIVO as readonly string[]).includes(tipo) || !supabaseUrl) return false
  const prefixo = `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${BUCKET_DOS_ARQUIVOS}/${pastaDosArquivos(workspaceId)}/`
  return url.startsWith(prefixo) && !url.slice(prefixo.length).includes("..") && url.length > prefixo.length
}

/** Valores que a tela do contato mostra como tipo e como classificação. */
export const tipoDeContatoValido = (tipo: string) => Object.hasOwn(TIPO_LABEL, tipo)
export const classificacaoValida = (classificacao: string) => Object.hasOwn(CLASSIFICACAO_LABEL, classificacao)

/**
 * Campos que a ação "alterar dado do contato" muda. A classificação fica de
 * fora: o CRM a calcula pela etapa dos cards (`calcularClassificacao`), e a
 * coluna `contacts.classificacao` não é lida por nenhuma tela (B11-11).
 */
const LIMITE_POR_CAMPO: Record<string, number> = { nicho: 100, cidade: 100, observacoes: 1000 }

export function dadoDoContatoValido(campo: string, valor: string): boolean {
  const texto = valor.trim()
  if (!texto) return false
  if (campo === "tipo") return tipoDeContatoValido(texto)
  const limite = LIMITE_POR_CAMPO[campo]
  return limite !== undefined && texto.length <= limite
}

const ETAPAS_DO_FUNIL: Record<string, readonly string[]> = {
  entrada: ETAPAS_ENTRADA.map((e) => e.id),
  recompra: ETAPAS_RECOMPRA.map((e) => e.id),
}

/** Funil que existe e etapa dele; etapa vazia vale como "qualquer etapa". */
export function etapaValida({ funil, etapa }: { funil: string; etapa: string }): boolean {
  const etapas = ETAPAS_DO_FUNIL[funil]
  return etapas !== undefined && (etapa === "" || etapas.includes(etapa))
}

/**
 * Gatilho "dado do contato alterado": o campo é um dos que têm de onde disparar
 * (o atendente não tem: B11-06), e o valor, quando preenchido, é um que o campo aceita.
 */
export function gatilhoDeDadoValido(campo: string, valor: string): boolean {
  const texto = valor.trim()
  switch (campo) {
    case "classificacao":
      return !texto || classificacaoValida(texto)
    case "tipo":
      return !texto || tipoDeContatoValido(texto)
    case "nicho":
    case "cidade":
      return texto.length <= 100
    default:
      return false
  }
}
