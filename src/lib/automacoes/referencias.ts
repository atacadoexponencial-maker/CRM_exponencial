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
  /** Os que uma ação "atribuir atendente" vai pôr na conversa: estes precisam estar ativos (B22-02). */
  atendentesAtribuidos: string[]
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
  const atendentesAtribuidos = new Set<string>()
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
    if (p.atendente_id) {
      atendentes.add(p.atendente_id)
      atendentesAtribuidos.add(p.atendente_id)
    }
    // B28-01: quem recebe o lembrete também precisa estar ativo
    if (bloco.tipo === "acao" && bloco.acao === "criar_lembrete" && p.responsavel_id) {
      atendentes.add(p.responsavel_id)
      atendentesAtribuidos.add(p.responsavel_id)
    }
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
    atendentesAtribuidos: [...atendentesAtribuidos],
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
 * Teto do arquivo da ação. A requisição inteira tem até 4 MB (`bodySizeLimit` do
 * next.config); acima disso o próprio Next recusa com erro 500, antes da action.
 * A folga de 16 KB cobre o resto do formulário, e a tela confere antes de subir (B22-32).
 */
export const LIMITE_DO_ARQUIVO = 4 * 1024 * 1024 - 16 * 1024
export const ARQUIVO_GRANDE_DEMAIS = "Arquivo muito grande (máximo 4 MB)."

// Primeiros bytes de cada formato aceito. Word e Excel novos são ZIP; os antigos, OLE.
const ZIP = [0x50, 0x4b, 0x03, 0x04]
const OLE = [0xd0, 0xcf, 0x11, 0xe0]
const ASSINATURAS: Record<string, number[][]> = {
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png": [[0x89, 0x50, 0x4e, 0x47]],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]],
  "application/pdf": [[0x25, 0x50, 0x44, 0x46]],
  "application/msword": [OLE],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [ZIP],
  "application/vnd.ms-excel": [OLE],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [ZIP],
}

/**
 * O conteúdo é mesmo do tipo declarado? O navegador declara o tipo pela extensão,
 * e um arquivo renomeado passaria (B22-38). WebP confere também o "WEBP" do byte 8.
 */
export function conteudoDoTipo(tipo: string, inicio: Uint8Array): boolean {
  const comeca = (assinatura: number[]) => assinatura.every((byte, i) => inicio[i] === byte)
  if (!(ASSINATURAS[tipo] ?? []).some(comeca)) return false
  if (tipo === "image/webp") return String.fromCharCode(...inicio.slice(8, 12)) === "WEBP"
  return true
}


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
  if (!url.startsWith(prefixo)) return false
  // B22-28: depois da pasta, só um nome como o que o upload gera (`<hora>-<nome>`, com
  // letras, números, ponto, hífen e sublinhado). Barrar ".." não bastava: "%2e%2e/"
  // passava e o Storage decodificava, apontando para a pasta de outra empresa.
  const nome = url.slice(prefixo.length)
  return /^[A-Za-z0-9._-]+$/.test(nome) && !/^\.+$/.test(nome)
}

/** Valores que a tela do contato mostra como tipo e como classificação. */
export const tipoDeContatoValido = (tipo: string) => Object.hasOwn(TIPO_LABEL, tipo)
export const classificacaoValida = (classificacao: string) => Object.hasOwn(CLASSIFICACAO_LABEL, classificacao)

/**
 * Campos que a ação "alterar dado do contato" muda. A classificação fica de
 * fora: o CRM a calcula pela etapa dos cards (`calcularClassificacao`), e a
 * coluna `contacts.classificacao` não é lida por nenhuma tela (B11-11).
 */
const LIMITE_POR_CAMPO: Record<string, number> = { cidade: 100, observacoes: 1000 }

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
    case "cidade":
      return texto.length <= 100
    default:
      return false
  }
}
