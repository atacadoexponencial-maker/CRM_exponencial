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

/** Até um ano entre execuções para o mesmo contato. */
const HORAS_MAXIMAS = 24 * 365

/**
 * Proteção de repetição lida do banco ou recebida do editor. Fora do formato
 * vira "sempre", que é como as regras rodavam antes da proteção existir.
 */
export function lerRepeticao(valor: unknown): Repeticao {
  const r = (valor ?? {}) as { modo?: unknown; horas?: unknown }
  if (r.modo === "uma_vez_por_contato") return { modo: "uma_vez_por_contato" }
  if (r.modo === "a_cada_horas" && Number.isInteger(r.horas) && (r.horas as number) >= 1 && (r.horas as number) <= HORAS_MAXIMAS) {
    return { modo: "a_cada_horas", horas: r.horas as number }
  }
  return { modo: "sempre" }
}

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

// O que o motor (src/lib/automacoes) já sabe executar. O editor mostra o resto
// como "em breve", e `pendenciasDoFluxo` não deixa salvar. Cada issue da B11 que
// ensina o motor a fazer algo novo acrescenta aqui.
export const GATILHOS_DISPONIVEIS: readonly GatilhoTipo[] = [
  "card_movido",
  "conversa_criada",
  // B11-06
  "tag_adicionada",
  "etiqueta_aplicada",
  "dado_contato_alterado",
  // B11-04
  "mensagem_recebida",
  // B11-05
  "mensagem_enviada_time",
]
// A primeira serve de padrão para a verificação nova no editor
export const VERIFICACOES_DISPONIVEIS: readonly VerificacaoTipo[] = [
  "tag_contato",
  "classificacao",
  "tipo_contato",
  "canal",
  "etiqueta_conversa",
  "atendente",
  "card_etapa",
  // B11-08
  "horario_comercial",
  // B11-04
  "texto_mensagem",
  "tipo_mensagem",
]
export const ACOES_DISPONIVEIS: readonly AcaoTipo[] = [
  "enviar_mensagem",
  "aplicar_etiqueta",
  "atribuir_atendente",
  "mover_card",
  // B11-11
  "adicionar_tag",
  "remover_tag",
  "remover_etiqueta",
  "alterar_dado_contato",
  "atribuir_time",
  // B11-08
  "iniciar_sequencia",
  "resolver_conversa",
  "reabrir_conversa",
  // B11-07
  "enviar_mensagem_rapida",
  "enviar_midia",
]

/**
 * Etapas em que o arrastar manual inicia uma sequência (`moverCard`, em
 * src/app/(auth)/pipeline/actions.ts), por `funil:etapa`. Na ação "mover card",
 * o admin escolhe se a automação faz o mesmo (parâmetro `iniciar_sequencia`).
 * Em Ganho, a sequência de onboarding só começa quando o card da Recompra nasce.
 */
export const SEQUENCIA_DA_ETAPA: Record<string, "onboarding" | "catalogo_enviado" | "inativo"> = {
  "entrada:ganho": "onboarding",
  "entrada:catalogo_enviado": "catalogo_enviado",
  "recompra:inativos": "inativo",
}

/** Tag como a tela do contato grava: minúsculas e sem espaço nas pontas. */
export function normalizarTag(tag: string): string {
  return tag.trim().toLowerCase()
}

/** As regras de `adicionarTagContato` (src/app/(auth)/contatos/actions.ts): até 50 caracteres, sem espaço. */
export function tagValida(tag: string): boolean {
  const normalizada = normalizarTag(tag)
  return normalizada.length > 0 && normalizada.length <= 50 && !/\s/.test(normalizada)
}

const ACOES_COM_TAG: readonly AcaoTipo[] = ["adicionar_tag", "remover_tag"]
/** A proteção de repetição chegou com o histórico (B11-03). */
export const REPETICAO_DISPONIVEL = true
const EM_BREVE = "Ainda não disponível: escolha outra opção"

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

/**
 * O que impede o fluxo de ser percorrido: número de gatilhos, ligações
 * inválidas e laço. O motor não roda uma regra com qualquer um destes; o
 * editor mostra os mesmos textos entre as pendências gerais.
 */
export function problemasDeEstrutura(fluxo: Fluxo): string[] {
  const problemas: string[] = []

  const gatilhos = fluxo.blocos.filter((b) => b.tipo === "gatilho")
  if (gatilhos.length !== 1) problemas.push("O fluxo precisa de exatamente um gatilho")

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
  if (ligacaoInvalida) problemas.push("O fluxo tem ligações inválidas")
  if (fluxo.ligacoes.some((l) => formaLaco(fluxo.ligacoes.filter((x) => x !== l), l.de, l.para))) {
    problemas.push("O fluxo tem um laço: um caminho volta a um bloco anterior")
  }

  return problemas
}

/** Tudo que impede o fluxo de ser salvo. Vazio = pode salvar. */
export function pendenciasDoFluxo(fluxo: Fluxo): PendenciasFluxo {
  const porBloco: Record<string, string[]> = {}
  const gerais = problemasDeEstrutura(fluxo)
  const anotar = (id: string, motivo: string) => {
    ;(porBloco[id] ??= []).push(motivo)
  }

  const gatilho = gatilhoDoFluxo(fluxo)
  const deMensagem = gatilho ? GATILHOS_DE_MENSAGEM.includes(gatilho.gatilho) : false

  const alcancaveis = blocosAlcancaveis(fluxo)
  for (const bloco of fluxo.blocos) {
    if (bloco.tipo !== "gatilho" && !alcancaveis.has(bloco.id)) {
      anotar(bloco.id, "Bloco solto: ligue a um caminho")
    }

    if (bloco.tipo === "gatilho") {
      if (!GATILHOS_DISPONIVEIS.includes(bloco.gatilho)) anotar(bloco.id, EM_BREVE)
      if (PARAMETROS_OBRIGATORIOS_GATILHO[bloco.gatilho].some((p) => !bloco.parametros[p]?.trim())) {
        anotar(bloco.id, "Complete a configuração do gatilho")
      } else if (bloco.gatilho === "tag_adicionada" && bloco.parametros.tag?.trim() && !tagValida(bloco.parametros.tag)) {
        // Tag vazia vale como "qualquer tag"; preenchida, segue as regras da tag
        anotar(bloco.id, "A tag não pode ter espaço e vai até 50 caracteres")
      }
    } else if (bloco.tipo === "acao") {
      if (!ACOES_DISPONIVEIS.includes(bloco.acao)) anotar(bloco.id, EM_BREVE)
      if (PARAMETROS_OBRIGATORIOS_ACAO[bloco.acao].some((p) => !bloco.parametros[p]?.trim())) {
        anotar(bloco.id, "Complete a configuração da ação")
      } else if (ACOES_COM_TAG.includes(bloco.acao) && !tagValida(bloco.parametros.tag)) {
        anotar(bloco.id, "A tag não pode ter espaço e vai até 50 caracteres")
      }
    } else {
      if (bloco.verificacoes.some((v) => !VERIFICACOES_DISPONIVEIS.includes(v.tipo))) anotar(bloco.id, EM_BREVE)
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

/** O que uma ação devolve: deu certo, ou o motivo da falha em português, para o histórico (B11-03). */
export type ResultadoAcao = { ok: true } | { ok: false; motivo: string }

/** O caminho de uma execução: o mesmo que a simulação mostra, mais as ações que falharam. */
export interface CaminhoPercorrido extends ResultadoSimulacao {
  /** Ações que falharam, por id. O caminho segue depois delas. */
  falhas: string[]
  /** Motivo de cada ação que falhou, por id. */
  motivos: Record<string, string>
  /** O que encerrou o caminho no meio: uma condição que não conseguiu consultar o banco. */
  erro?: { bloco: string; motivo: string }
}

/** Quem avalia e quem executa: o motor consulta e grava no banco; a simulação só consulta. */
export interface ExecutoresDoFluxo {
  /** Exceção encerra o caminho, com `erro` no resultado. */
  avaliarVerificacao: (verificacao: Verificacao) => Promise<boolean>
  /** Exceção conta como falha da ação. */
  executarAcao: (bloco: BlocoAcao) => Promise<ResultadoAcao>
}

const ERRO_NA_CONDICAO = "Não foi possível avaliar a condição: erro ao consultar o banco"
const ERRO_NA_ACAO = "Erro inesperado ao executar a ação"

/**
 * Percorre o fluxo a partir do gatilho. Na condição, as verificações são
 * avaliadas em ordem, até a primeira que não vale (E), e o caminho segue pelo
 * "sim" ou pelo "não". Na ação, segue pelo "proximo" mesmo que ela falhe. O
 * caminho termina numa saída sem ligação.
 *
 * Não confere a estrutura: quem chama usa `problemasDeEstrutura` antes. Mesmo
 * assim, o percurso para ao voltar a um bloco já percorrido, para nunca rodar
 * sem fim. Uma condição que dá erro encerra o caminho ali, com `erro`: o que já
 * foi percorrido fica no resultado, para o histórico mostrar até onde chegou.
 */
export async function percorrerFluxo(fluxo: Fluxo, executores: ExecutoresDoFluxo): Promise<CaminhoPercorrido> {
  const caminho: CaminhoPercorrido = { blocos: [], saidas: {}, falhas: [], motivos: {} }
  const porId = new Map(fluxo.blocos.map((b) => [b.id, b]))

  let bloco: Bloco | undefined = gatilhoDoFluxo(fluxo)
  while (bloco && !caminho.blocos.includes(bloco.id)) {
    const id: string = bloco.id
    caminho.blocos.push(id)

    let saida: Saida = "proximo"
    if (bloco.tipo === "condicao") {
      let valem = true
      try {
        for (const verificacao of bloco.verificacoes) {
          if (!(await executores.avaliarVerificacao(verificacao))) {
            valem = false
            break
          }
        }
      } catch {
        caminho.erro = { bloco: id, motivo: ERRO_NA_CONDICAO }
        break
      }
      saida = valem ? "sim" : "nao"
      caminho.saidas[id] = saida
    } else if (bloco.tipo === "acao") {
      const resultado = await executores
        .executarAcao(bloco)
        .catch((): ResultadoAcao => ({ ok: false, motivo: ERRO_NA_ACAO }))
      if (!resultado.ok) {
        caminho.falhas.push(id)
        caminho.motivos[id] = resultado.motivo
      }
    }

    const ligacao: Ligacao | undefined = fluxo.ligacoes.find((l) => l.de === id && l.saida === saida)
    bloco = ligacao ? porId.get(ligacao.para) : undefined
  }

  return caminho
}
