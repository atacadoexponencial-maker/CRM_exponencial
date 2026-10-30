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
  // B43-03
  | "entrou_perfil_rfv"

export type VerificacaoTipo =
  | "texto_mensagem"
  | "tipo_mensagem"
  | "canal"
  | "tag_contato"
  | "classificacao"
  // B43-02
  | "perfil_rfv"
  // B38-04
  | "campo_personalizado"
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
  | "criar_lembrete"

/** Parâmetros de gatilho e de ação. As chaves seguem as de `automations.gatilho_config`/`acao_config`. */
export type Parametros = Record<string, string>

export interface Verificacao {
  id: string
  tipo: VerificacaoTipo
  operador: string
  valor: string
  /**
   * B38-04: só na verificação "campo_personalizado": o campo escolhido, como no filtro
   * ("campo:<tipo>:<uuid>"). Os valores ficam em `valor`, separados por vírgula quando
   * são vários (opções, "entre"); em texto, o valor inteiro.
   */
  campo?: string
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

export type UnidadeDaEspera = "segundos" | "minutos" | "horas" | "dias"

/**
 * Bloco "esperar" (B28-02): segura o contato até a primeira das opções ligadas
 * acontecer. Cada opção ligada é uma saída. A quantidade do tempo fica como o
 * admin digitou; `duracaoDaEspera` diz se vale.
 */
export type BlocoEspera = {
  id: string
  tipo: "espera"
  /** `null`: a opção de tempo está desligada. */
  tempo: { quantidade: string; unidade: UnidadeDaEspera } | null
  recebeuMensagem: boolean
  atendenteEnviou: boolean
  /** Sem o tempo, até quando o contato espera a mensagem. */
  limite: "30_dias" | "sem_limite"
  posicao: Posicao
}

export type Bloco = BlocoGatilho | BlocoCondicao | BlocoAcao | BlocoEspera

/** Saídas do bloco "esperar": uma por opção ligada. */
export type SaidaDaEspera = "tempo" | "recebeu_mensagem" | "atendente_enviou"

/** Gatilho e ação saem por "proximo"; condição sai por "sim" ou "nao"; a espera, por uma das opções. */
export type Saida = "proximo" | "sim" | "nao" | SaidaDaEspera

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
export const HORAS_MAXIMAS = 24 * 365

/** Horas de "no máximo a cada N horas": número inteiro de 1 a um ano. */
export function horasValidas(horas: unknown): horas is number {
  return Number.isInteger(horas) && (horas as number) >= 1 && (horas as number) <= HORAS_MAXIMAS
}

/**
 * Proteção de repetição lida do banco ou recebida do editor. Fora do formato
 * vira "sempre", que é como as regras rodavam antes da proteção existir.
 */
export function lerRepeticao(valor: unknown): Repeticao {
  const r = (valor ?? {}) as { modo?: unknown; horas?: unknown }
  if (r.modo === "uma_vez_por_contato") return { modo: "uma_vez_por_contato" }
  if (r.modo === "a_cada_horas" && horasValidas(r.horas)) return { modo: "a_cada_horas", horas: r.horas }
  return { modo: "sempre" }
}

/** O caminho que um contato percorreria, sem executar nada. */
export interface ResultadoSimulacao {
  /** Blocos percorridos, na ordem. */
  blocos: string[]
  /** Saída tomada em cada condição percorrida. */
  saidas: Record<string, "sim" | "nao">
  /** O bloco "esperar" onde o caminho parou (B28-02). É o último de `blocos`. */
  espera?: string
}

export const GATILHOS_DE_MENSAGEM: readonly GatilhoTipo[] = ["mensagem_recebida", "mensagem_enviada_time"]

/**
 * Repetição com que a regra nova nasce: "sempre" nos gatilhos de mensagem, em que
 * a condição costuma escolher a mensagem ("texto contém catálogo"), e "uma vez por
 * contato" nos outros, como no protótipo aprovado (B11-01). Decidido em 14/10 (B22-09).
 */
export function repeticaoPadrao(gatilho: GatilhoTipo): Repeticao {
  // B43-03: cada mudança de perfil anotada dispara, mesmo que o contato já tenha passado por ele (SUP-B43-02)
  if (gatilho === "entrou_perfil_rfv") return { modo: "sempre" }
  return GATILHOS_DE_MENSAGEM.includes(gatilho) ? { modo: "sempre" } : { modo: "uma_vez_por_contato" }
}

/** B43-03: horário de disparo que o gatilho "Entrou no perfil RFV" traz preenchido. */
export const HORA_PADRAO_PERFIL_RFV = "9"

/** Parâmetros com que o gatilho nasce no editor ao ser escolhido. */
export function parametrosIniciaisDoGatilho(gatilho: GatilhoTipo): Parametros {
  return gatilho === "entrou_perfil_rfv" ? { hora: HORA_PADRAO_PERFIL_RFV } : {}
}

/** B43-03: o horário de disparo, de 0 a 23, ou null se não for um. Vazio vale o padrão (9h). */
export function horaDoGatilho(parametros: Parametros): number | null {
  const texto = (parametros.hora ?? "").trim() || HORA_PADRAO_PERFIL_RFV
  if (!/^\d{1,2}$/.test(texto)) return null
  const hora = Number(texto)
  return hora <= 23 ? hora : null
}

/** B43-03: aviso do gatilho "Entrou no perfil RFV" sem destino (CA-B43-14). */
export const SEM_PERFIL_DE_DESTINO = "Escolha ao menos um perfil de destino."

/** Verificações sobre a mensagem que disparou: só fazem sentido nos gatilhos de mensagem. */
export const VERIFICACOES_DE_MENSAGEM: readonly VerificacaoTipo[] = ["texto_mensagem", "tipo_mensagem"]

/** Operadores que não pedem valor ("conversa sem atendente", "fora do horário comercial"). */
/** B43-02: na lista de perfis RFV, o contato que nunca comprou (não tem perfil). */
export const SEM_COMPRAS = "sem_compras"

/** B43-02: valor de várias opções, guardado como ids separados por vírgula. */
export function itensDaLista(valor: string | undefined): string[] {
  return (valor ?? "").split(",").map((v) => v.trim()).filter(Boolean)
}

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
  // B43-03: o destino tem aviso próprio (SEM_PERFIL_DE_DESTINO), em pendenciasDoFluxo
  entrou_perfil_rfv: [],
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
  // B28-01: sem `responsavel_id`, vai para o responsável pela conversa
  criar_lembrete: ["texto"],
}

/** Texto do lembrete criado por automação: o bastante para uma instrução (B28-01). */
export const TEXTO_MAXIMO_DO_LEMBRETE = 500
/** Vencimento do lembrete: até um ano, em horas ou em dias. */
const VENCIMENTO_MAXIMO: Record<string, number> = { horas: HORAS_MAXIMAS, dias: 365 }

/**
 * Vencimento do "criar lembrete": vazio ou 0 é "na hora"; senão, número inteiro
 * de horas ou de dias, até um ano. Sem unidade, vale em dias, o padrão do painel.
 */
export function vencimentoDoLembrete(parametros: Parametros): { quantidade: number; unidade: "horas" | "dias" } | null {
  const unidade = parametros.vence_unidade === "horas" ? "horas" : "dias"
  if (parametros.vence_unidade && !(parametros.vence_unidade in VENCIMENTO_MAXIMO)) return null
  const texto = (parametros.vence_em ?? "").trim()
  if (texto === "") return { quantidade: 0, unidade }
  if (!/^\d+$/.test(texto)) return null
  const quantidade = Number(texto)
  return quantidade <= VENCIMENTO_MAXIMO[unidade] ? { quantidade, unidade } : null
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
  // B43-03
  "entrou_perfil_rfv",
]
// A primeira serve de padrão para a verificação nova no editor
export const VERIFICACOES_DISPONIVEIS: readonly VerificacaoTipo[] = [
  "tag_contato",
  "classificacao",
  // B43-02
  "perfil_rfv",
  // B38-04
  "campo_personalizado",
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
  // B11-08 ("iniciar sequência" saiu na B28-06)
  "resolver_conversa",
  "reabrir_conversa",
  // B11-07
  "enviar_mensagem_rapida",
  "enviar_midia",
  // B28-01
  "criar_lembrete",
]

/**
 * Ações que saíram do CRM (B28-06: as sequências). Continuam no formato para a
 * regra gravada antes ser lida, mas não rodam: no motor, falham com
 * `ACAO_REMOVIDA` e o caminho segue; no editor e no Salvar, o bloco fica marcado
 * até a pessoa trocar (`acoesRemovidasNoFluxo`). Não entram em
 * `pendenciasDoFluxo`, que o motor usa para decidir se a regra roda.
 */
export const ACOES_REMOVIDAS: readonly AcaoTipo[] = ["iniciar_sequencia"]

/** CA-B28-34. */
export const ACAO_REMOVIDA = "A ação 'iniciar sequência' foi removida: troque no editor"

/** Os blocos com ação removida, com o aviso, por id. */
export function acoesRemovidasNoFluxo(fluxo: Fluxo): Record<string, string[]> {
  const porBloco: Record<string, string[]> = {}
  for (const bloco of fluxo.blocos) {
    if (bloco.tipo === "acao" && ACOES_REMOVIDAS.includes(bloco.acao)) porBloco[bloco.id] = [ACAO_REMOVIDA]
  }
  return porBloco
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

/** As opções do bloco "esperar" que o motor sabe esperar: o tempo (B28-02) e as mensagens (B28-03). */
export const OPCOES_DE_ESPERA_DISPONIVEIS: readonly SaidaDaEspera[] = ["tempo", "recebeu_mensagem", "atendente_enviou"]

/** As saídas da espera que trazem uma mensagem nova para as condições de depois (B28-03). */
export const SAIDAS_DE_MENSAGEM: readonly Saida[] = ["recebeu_mensagem", "atendente_enviou"]

/** Sem o tempo, o teto "esperar no máximo 30 dias" (PER-B28-02). */
export const TETO_DA_ESPERA_MS = 30 * 86_400_000

/** Até um ano de espera, em cada unidade (B28-02, SUP-B28-01). */
export const ESPERA_MAXIMA: Record<UnidadeDaEspera, number> = {
  segundos: 365 * 86_400,
  minutos: 365 * 1_440,
  horas: HORAS_MAXIMAS,
  dias: 365,
}

const MS_DA_UNIDADE: Record<UnidadeDaEspera, number> = {
  segundos: 1_000,
  minutos: 60_000,
  horas: 3_600_000,
  dias: 86_400_000,
}

/** O bloco "esperar" como nasce no editor: só o tempo ligado, 1 dia. */
export function esperaNova(id: string, posicao: Posicao): BlocoEspera {
  return {
    id,
    tipo: "espera",
    tempo: { quantidade: "1", unidade: "dias" },
    recebeuMensagem: false,
    atendenteEnviou: false,
    limite: "30_dias",
    posicao,
  }
}

/** A espera em ms: número inteiro de 1 até um ano, na unidade escolhida. `null` fora disso. */
export function duracaoDaEspera(tempo: BlocoEspera["tempo"]): number | null {
  if (!tempo || !(tempo.unidade in MS_DA_UNIDADE)) return null
  const texto = tempo.quantidade.trim()
  if (!/^\d+$/.test(texto)) return null
  const quantidade = Number(texto)
  if (quantidade < 1 || quantidade > ESPERA_MAXIMA[tempo.unidade]) return null
  return quantidade * MS_DA_UNIDADE[tempo.unidade]
}

/** O bloco "esperar" sem nenhuma opção não teria por onde sair (CA-B28-03). */
export const ESPERA_SEM_OPCAO = "O bloco precisa de pelo menos uma opção ligada"

const ACOES_COM_TAG: readonly AcaoTipo[] = ["adicionar_tag", "remover_tag"]
/** A proteção de repetição chegou com o histórico (B11-03). */
export const REPETICAO_DISPONIVEL = true
const EM_BREVE = "Ainda não disponível: escolha outra opção"

/** As opções ligadas do bloco "esperar", na ordem das saídas. */
export function saidasDaEspera(bloco: BlocoEspera): SaidaDaEspera[] {
  const saidas: SaidaDaEspera[] = []
  if (bloco.tempo) saidas.push("tempo")
  if (bloco.recebeuMensagem) saidas.push("recebeu_mensagem")
  if (bloco.atendenteEnviou) saidas.push("atendente_enviou")
  return saidas
}

export function saidasDoBloco(bloco: Bloco): Saida[] {
  if (bloco.tipo === "espera") return saidasDaEspera(bloco)
  return bloco.tipo === "condicao" ? ["sim", "nao"] : ["proximo"]
}

/**
 * Cópia de uma condição, ação ou espera, para o "Duplicar" do editor (B22-13): os
 * mesmos parâmetros e verificações, com id novo para o bloco e para cada verificação.
 */
export function copiaDoBloco(
  bloco: BlocoCondicao | BlocoAcao | BlocoEspera,
  id: string,
  posicao: Posicao,
  novoId: () => string
): BlocoCondicao | BlocoAcao | BlocoEspera {
  if (bloco.tipo === "condicao") {
    return { ...bloco, id, posicao, verificacoes: bloco.verificacoes.map((v) => ({ ...v, id: novoId() })) }
  }
  if (bloco.tipo === "espera") return { ...bloco, id, posicao, tempo: bloco.tempo && { ...bloco.tempo } }
  return { ...bloco, id, posicao, parametros: { ...bloco.parametros } }
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

/**
 * Blocos que dá para alcançar a partir do gatilho sem passar por uma saída de
 * mensagem de um bloco "esperar" (B28-03). Neles, só os gatilhos de mensagem têm
 * mensagem para as condições "texto" e "tipo da mensagem"; nos outros, há sempre
 * a mensagem que acabou a espera.
 */
export function blocosSemMensagemDaEspera(fluxo: Fluxo): Set<string> {
  const alcancados = new Set<string>()
  const gatilho = gatilhoDoFluxo(fluxo)
  if (!gatilho) return alcancados
  const pilha = [gatilho.id]
  while (pilha.length > 0) {
    const atual = pilha.pop()!
    if (alcancados.has(atual)) continue
    alcancados.add(atual)
    for (const l of fluxo.ligacoes) if (l.de === atual && !SAIDAS_DE_MENSAGEM.includes(l.saida)) pilha.push(l.para)
  }
  return alcancados
}

/** As condições deste bloco podem olhar a mensagem? Sim nos gatilhos de mensagem e depois de uma saída de mensagem. */
export function haMensagemNoBloco(fluxo: Fluxo, blocoId: string): boolean {
  const gatilho = gatilhoDoFluxo(fluxo)
  if (gatilho && GATILHOS_DE_MENSAGEM.includes(gatilho.gatilho)) return true
  return !blocosSemMensagemDaEspera(fluxo).has(blocoId)
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
  // B38-04: o campo escolhido; "está vazio" não pede valor, e "entre", dois
  if (v.tipo === "campo_personalizado") {
    if (!v.campo?.startsWith("campo:")) return false
    if (v.operador === "vazio" || v.operador === "nao_vazio") return true
    if (v.operador === "entre") return itensDaLista(v.valor).length === 2
    return v.valor.trim() !== ""
  }
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
/** Até 100 blocos por automação (B22-29, decidido pelo Luan em 14/10). */
export const BLOCOS_POR_AUTOMACAO = 100

export function pendenciasDoFluxo(fluxo: Fluxo): PendenciasFluxo {
  const porBloco: Record<string, string[]> = {}
  const gerais = problemasDeEstrutura(fluxo)
  if (fluxo.blocos.length > BLOCOS_POR_AUTOMACAO) {
    gerais.push(`Uma automação pode ter até ${BLOCOS_POR_AUTOMACAO} blocos; esta tem ${fluxo.blocos.length}`)
  }
  const anotar = (id: string, motivo: string) => {
    ;(porBloco[id] ??= []).push(motivo)
  }

  const gatilho = gatilhoDoFluxo(fluxo)
  const deMensagem = gatilho ? GATILHOS_DE_MENSAGEM.includes(gatilho.gatilho) : false
  const semMensagemDaEspera = blocosSemMensagemDaEspera(fluxo)

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
      if (bloco.gatilho === "entrou_perfil_rfv") {
        if (itensDaLista(bloco.parametros.destinos).length === 0) anotar(bloco.id, SEM_PERFIL_DE_DESTINO)
        if (horaDoGatilho(bloco.parametros) === null) anotar(bloco.id, "O horário de disparo vai de 0h a 23h")
      }
    } else if (bloco.tipo === "acao" && ACOES_REMOVIDAS.includes(bloco.acao)) {
      // B28-06: a pendência da ação removida é do editor e do Salvar (`acoesRemovidasNoFluxo`)
    } else if (bloco.tipo === "acao") {
      if (!ACOES_DISPONIVEIS.includes(bloco.acao)) anotar(bloco.id, EM_BREVE)
      if (PARAMETROS_OBRIGATORIOS_ACAO[bloco.acao].some((p) => !bloco.parametros[p]?.trim())) {
        anotar(bloco.id, "Complete a configuração da ação")
      } else if (ACOES_COM_TAG.includes(bloco.acao) && !tagValida(bloco.parametros.tag)) {
        anotar(bloco.id, "A tag não pode ter espaço e vai até 50 caracteres")
      }
      if (bloco.acao === "criar_lembrete") {
        if ((bloco.parametros.texto ?? "").trim().length > TEXTO_MAXIMO_DO_LEMBRETE) {
          anotar(bloco.id, `O lembrete vai até ${TEXTO_MAXIMO_DO_LEMBRETE} caracteres`)
        }
        if (!vencimentoDoLembrete(bloco.parametros)) {
          anotar(bloco.id, "O vencimento é um número inteiro, até 365 dias (ou 8760 horas)")
        }
      }
    } else if (bloco.tipo === "espera") {
      const opcoes = saidasDaEspera(bloco)
      if (opcoes.length === 0) anotar(bloco.id, ESPERA_SEM_OPCAO)
      if (opcoes.some((o) => !OPCOES_DE_ESPERA_DISPONIVEIS.includes(o))) anotar(bloco.id, EM_BREVE)
      if (bloco.tempo && duracaoDaEspera(bloco.tempo) === null) {
        anotar(bloco.id, "O tempo é um número inteiro, de 1 até 365 dias")
      }
    } else {
      if (bloco.verificacoes.some((v) => !VERIFICACOES_DISPONIVEIS.includes(v.tipo))) anotar(bloco.id, EM_BREVE)
      if (bloco.verificacoes.length === 0) anotar(bloco.id, "Adicione ao menos uma verificação")
      // B28-03: depois de uma saída de mensagem da espera, há mensagem em qualquer gatilho
      if (!deMensagem && semMensagemDaEspera.has(bloco.id) && bloco.verificacoes.some((v) => VERIFICACOES_DE_MENSAGEM.includes(v.tipo))) {
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
 * Tudo o que impede o fluxo de rodar, sem repetir: o que o Salvar recusa, e o que
 * o motor e a lista conferem nas regras gravadas por fora do editor (B22-25).
 */
export function problemasDoFluxo(fluxo: Fluxo): string[] {
  const { gerais, porBloco } = pendenciasDoFluxo(fluxo)
  return [...new Set([...gerais, ...Object.values(porBloco).flat()])]
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
  /**
   * B53-03: a condição que deu "não" sem nada ligado na saída "não", e a primeira
   * verificação dela que não valeu. É onde o caminho terminou.
   */
  naoAtendida?: { bloco: string; verificacao: Verificacao }
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
 *
 * O bloco "esperar" encerra o percurso nele, com `espera` no resultado (B28-02).
 * Com `retomar`, o percurso começa no bloco ligado à saída que a espera tomou, e o
 * resultado traz só o que veio depois dela.
 */
export async function percorrerFluxo(
  fluxo: Fluxo,
  executores: ExecutoresDoFluxo,
  retomar?: { bloco: string; saida: Saida }
): Promise<CaminhoPercorrido> {
  const caminho: CaminhoPercorrido = { blocos: [], saidas: {}, falhas: [], motivos: {} }
  const porId = new Map(fluxo.blocos.map((b) => [b.id, b]))

  const primeiro = retomar
    ? fluxo.ligacoes.find((l) => l.de === retomar.bloco && l.saida === retomar.saida)?.para
    : gatilhoDoFluxo(fluxo)?.id
  let bloco: Bloco | undefined = primeiro ? porId.get(primeiro) : undefined
  while (bloco && !caminho.blocos.includes(bloco.id)) {
    const id: string = bloco.id
    caminho.blocos.push(id)

    if (bloco.tipo === "espera") {
      caminho.espera = id
      break
    }

    let saida: Saida = "proximo"
    if (bloco.tipo === "condicao") {
      let naoValeu: Verificacao | undefined
      try {
        for (const verificacao of bloco.verificacoes) {
          if (!(await executores.avaliarVerificacao(verificacao))) {
            naoValeu = verificacao
            break
          }
        }
      } catch {
        caminho.erro = { bloco: id, motivo: ERRO_NA_CONDICAO }
        break
      }
      saida = naoValeu ? "nao" : "sim"
      caminho.saidas[id] = saida
      if (naoValeu && !fluxo.ligacoes.some((l) => l.de === id && l.saida === "nao")) {
        caminho.naoAtendida = { bloco: id, verificacao: naoValeu }
      }
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
