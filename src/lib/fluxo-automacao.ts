// Formato do fluxo de uma automação (B11): blocos ligados, estilo N8N.
// Um gatilho abre o fluxo, condições saem por "sim" ou "não", ações fazem uma
// coisa cada. Código puro, sem banco: o editor usa para marcar os blocos, e o
// servidor (motor e validação ao salvar) usa para decidir de verdade.
// Decisões e limites da fase 1: pre-desenvolvimento/decisoes/B11-automacoes-em-fluxo.md

export type GatilhoTipo =
  | "mensagem_recebida"
  | "mensagem_enviada_time"
  | "conversa_criada"
  | "card_movido"
  | "tag_adicionada"
  | "etiqueta_aplicada"
  | "dado_contato_alterado"

export type VerificacaoTipo =
  | "texto_mensagem"
  | "tipo_mensagem"
  | "canal"
  | "tag_contato"
  | "classificacao"
  | "tipo_contato"
  | "etiqueta_conversa"
  | "atendente"
  | "card_etapa"
  | "horario_comercial"

export type AcaoTipo =
  | "enviar_mensagem"
  | "enviar_mensagem_rapida"
  | "enviar_midia"
  | "adicionar_tag"
  | "remover_tag"
  | "aplicar_etiqueta"
  | "remover_etiqueta"
  | "alterar_dado_contato"
  | "atribuir_atendente"
  | "atribuir_time"
  | "mover_card"
  | "iniciar_sequencia"
  | "resolver_conversa"
  | "reabrir_conversa"

/** Parâmetros de gatilho e de ação. As chaves seguem as de `automations.gatilho_config`/`acao_config`. */
export type Parametros = Record<string, string>

export interface Verificacao {
  id: string
  tipo: VerificacaoTipo
  operador: string
  valor: string
}

export type Posicao = { x: number; y: number }

export type BlocoGatilho = {
  id: string
  tipo: "gatilho"
  gatilho: GatilhoTipo
  parametros: Parametros
  posicao: Posicao
}

export type BlocoCondicao = {
  id: string
  tipo: "condicao"
  verificacoes: Verificacao[]
  posicao: Posicao
}

export type BlocoAcao = {
  id: string
  tipo: "acao"
  acao: AcaoTipo
  parametros: Parametros
  posicao: Posicao
}

export type Bloco = BlocoGatilho | BlocoCondicao | BlocoAcao

/** Gatilho e ação saem por "proximo"; condição sai por "sim" ou "nao". */
export type Saida = "proximo" | "sim" | "nao"

export interface Ligacao {
  de: string
  saida: Saida
  para: string
}

export interface Fluxo {
  blocos: Bloco[]
  ligacoes: Ligacao[]
}

export type Repeticao =
  | { modo: "uma_vez_por_contato" }
  | { modo: "a_cada_horas"; horas: number }
  | { modo: "sempre" }

/** O caminho que um contato percorreria, sem executar nada. */
export interface ResultadoSimulacao {
  /** Blocos percorridos, na ordem. */
  blocos: string[]
  /** Saída tomada em cada condição percorrida. */
  saidas: Record<string, "sim" | "nao">
}

export const GATILHOS_DE_MENSAGEM: readonly GatilhoTipo[] = ["mensagem_recebida", "mensagem_enviada_time"]

/** Verificações sobre a mensagem que disparou: só fazem sentido nos gatilhos de mensagem. */
export const VERIFICACOES_DE_MENSAGEM: readonly VerificacaoTipo[] = ["texto_mensagem", "tipo_mensagem"]

/** Operadores que não pedem valor ("conversa sem atendente", "fora do horário comercial"). */
export const OPERADORES_SEM_VALOR: readonly string[] = ["sem_atendente", "dentro", "fora"]

/** Parâmetros sem os quais o gatilho não funciona. Os que faltam aqui são opcionais ("qualquer etapa"). */
export const PARAMETROS_OBRIGATORIOS_GATILHO: Record<GatilhoTipo, readonly string[]> = {
  mensagem_recebida: [],
  mensagem_enviada_time: [],
  conversa_criada: [],
  card_movido: ["funil"],
  tag_adicionada: [],
  etiqueta_aplicada: [],
  dado_contato_alterado: ["campo"],
}

export const PARAMETROS_OBRIGATORIOS_ACAO: Record<AcaoTipo, readonly string[]> = {
  enviar_mensagem: ["texto"],
  enviar_mensagem_rapida: ["mensagem_rapida_id"],
  enviar_midia: ["arquivo"],
  adicionar_tag: ["tag"],
  remover_tag: ["tag"],
  aplicar_etiqueta: ["label_id"],
  remover_etiqueta: ["label_id"],
  alterar_dado_contato: ["campo", "valor"],
  atribuir_atendente: ["atendente_id"],
  atribuir_time: ["time_id"],
  mover_card: ["funil", "etapa"],
  iniciar_sequencia: ["sequencia_id"],
  resolver_conversa: [],
  reabrir_conversa: [],
}

const ACOES_QUE_ENVIAM: readonly AcaoTipo[] = ["enviar_mensagem", "enviar_mensagem_rapida", "enviar_midia"]

export function saidasDoBloco(bloco: Bloco): Saida[] {
  return bloco.tipo === "condicao" ? ["sim", "nao"] : ["proximo"]
}

export function gatilhoDoFluxo(fluxo: Fluxo): BlocoGatilho | undefined {
  return fluxo.blocos.find((b): b is BlocoGatilho => b.tipo === "gatilho")
}

/**
 * A ligação `de → para` faria o fluxo voltar a um bloco anterior? Laço é
 * recusado na fase 1: sem o bloco "esperar", ele rodaria para sempre.
 */
export function formaLaco(ligacoes: Ligacao[], de: string, para: string): boolean {
  if (de === para) return true
  const visitados = new Set<string>()
  const pilha = [para]
  while (pilha.length > 0) {
    const atual = pilha.pop()!
    if (atual === de) return true
    if (visitados.has(atual)) continue
    visitados.add(atual)
    for (const l of ligacoes) if (l.de === atual) pilha.push(l.para)
  }
  return false
}

/** Blocos que dá para alcançar a partir do gatilho. Os outros estão soltos. */
export function blocosAlcancaveis(fluxo: Fluxo): Set<string> {
  const alcancados = new Set<string>()
  const gatilho = gatilhoDoFluxo(fluxo)
  if (!gatilho) return alcancados
  const pilha = [gatilho.id]
  while (pilha.length > 0) {
    const atual = pilha.pop()!
    if (alcancados.has(atual)) continue
    alcancados.add(atual)
    for (const l of fluxo.ligacoes) if (l.de === atual) pilha.push(l.para)
  }
  return alcancados
}

function verificacaoCompleta(v: Verificacao): boolean {
  if (!v.operador) return false
  if (OPERADORES_SEM_VALOR.includes(v.operador)) return true
  // "Card do contato está em": valor `funil:etapa`, com as duas partes
  if (v.tipo === "card_etapa") return /^[^:]+:[^:]+$/.test(v.valor)
  return v.valor.trim() !== ""
}

export interface PendenciasFluxo {
  /** O que falta em cada bloco, por id. Só aparecem blocos com pendência. */
  porBloco: Record<string, string[]>
  /** O que falta no fluxo como um todo. */
  gerais: string[]
}

/** Tudo que impede o fluxo de ser salvo. Vazio = pode salvar. */
export function pendenciasDoFluxo(fluxo: Fluxo): PendenciasFluxo {
  const porBloco: Record<string, string[]> = {}
  const gerais: string[] = []
  const anotar = (id: string, motivo: string) => {
    ;(porBloco[id] ??= []).push(motivo)
  }

  const gatilhos = fluxo.blocos.filter((b) => b.tipo === "gatilho")
  if (gatilhos.length !== 1) gerais.push("O fluxo precisa de exatamente um gatilho")
  const gatilho = gatilhoDoFluxo(fluxo)
  const deMensagem = gatilho ? GATILHOS_DE_MENSAGEM.includes(gatilho.gatilho) : false

  const porId = new Map(fluxo.blocos.map((b) => [b.id, b]))
  const saidasUsadas = new Set<string>()
  let ligacaoInvalida = false
  for (const l of fluxo.ligacoes) {
    const origem = porId.get(l.de)
    const destino = porId.get(l.para)
    const chave = `${l.de}:${l.saida}`
    if (
      !origem ||
      !destino ||
      destino.tipo === "gatilho" ||
      !saidasDoBloco(origem).includes(l.saida) ||
      saidasUsadas.has(chave)
    ) {
      ligacaoInvalida = true
    }
    saidasUsadas.add(chave)
  }
  if (ligacaoInvalida) gerais.push("O fluxo tem ligações inválidas")
  if (fluxo.ligacoes.some((l) => formaLaco(fluxo.ligacoes.filter((x) => x !== l), l.de, l.para))) {
    gerais.push("O fluxo tem um laço: um caminho volta a um bloco anterior")
  }

  const alcancaveis = blocosAlcancaveis(fluxo)
  for (const bloco of fluxo.blocos) {
    if (bloco.tipo !== "gatilho" && !alcancaveis.has(bloco.id)) {
      anotar(bloco.id, "Bloco solto: ligue a um caminho")
    }

    if (bloco.tipo === "gatilho") {
      if (PARAMETROS_OBRIGATORIOS_GATILHO[bloco.gatilho].some((p) => !bloco.parametros[p]?.trim())) {
        anotar(bloco.id, "Complete a configuração do gatilho")
      }
    } else if (bloco.tipo === "acao") {
      if (PARAMETROS_OBRIGATORIOS_ACAO[bloco.acao].some((p) => !bloco.parametros[p]?.trim())) {
        anotar(bloco.id, "Complete a configuração da ação")
      }
    } else {
      if (bloco.verificacoes.length === 0) anotar(bloco.id, "Adicione ao menos uma verificação")
      if (!deMensagem && bloco.verificacoes.some((v) => VERIFICACOES_DE_MENSAGEM.includes(v.tipo))) {
        anotar(bloco.id, "Verificação de mensagem não vale para este gatilho")
      }
      if (bloco.verificacoes.some((v) => !verificacaoCompleta(v))) {
        anotar(bloco.id, "Complete as verificações")
      }
    }
  }

  const temAcaoNoCaminho = fluxo.blocos.some((b) => b.tipo === "acao" && alcancaveis.has(b.id))
  if (!temAcaoNoCaminho) gerais.push("Ligue pelo menos uma ação ao caminho")

  return { porBloco, gerais }
}

/**
 * Regra que responde toda mensagem do contato: gatilho "mensagem recebida",
 * alguma ação de envio no caminho e nenhuma proteção de repetição.
 */
export function respondeTodaMensagem(fluxo: Fluxo, repeticao: Repeticao): boolean {
  if (repeticao.modo !== "sempre") return false
  if (gatilhoDoFluxo(fluxo)?.gatilho !== "mensagem_recebida") return false
  const alcancaveis = blocosAlcancaveis(fluxo)
  return fluxo.blocos.some(
    (b) => b.tipo === "acao" && alcancaveis.has(b.id) && ACOES_QUE_ENVIAM.includes(b.acao)
  )
}
