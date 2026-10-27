// Como cada gatilho, verificação e ação aparece no editor: rótulo, ícone e os
// campos do painel. As regras (o que é obrigatório, o que vale para cada
// gatilho) ficam em `@/lib/fluxo-automacao`; aqui é só apresentação.

import type { LucideIcon } from "lucide-react"
import {
  BellPlus,
  BookmarkMinus,
  BookmarkPlus,
  CircleCheck,
  FileText,
  Gauge,
  Kanban,
  ListOrdered,
  MessageCirclePlus,
  MessageSquare,
  MessageSquareText,
  Paperclip,
  RotateCcw,
  Send,
  Tag,
  Tags,
  UserCheck,
  UserPen,
  Users,
} from "lucide-react"
import { SEM_COMPRAS, type AcaoTipo, type Fluxo, type GatilhoTipo, type VerificacaoTipo } from "@/lib/fluxo-automacao"
import type { HorarioComercial } from "@/lib/horario-comercial"
import { ETAPAS_ENTRADA, ETAPAS_RECOMPRA } from "../../../pipeline/mock-pipeline"
import { CLASSIFICACAO_LABEL, TIPO_LABEL } from "../../../contatos/mock-contatos"
import { PERFIS } from "@/lib/relatorios/rfv"
import { campoPersonalizado, type CampoParaFiltro } from "@/lib/filtro-contatos"
import { variaveisSemReserva } from "@/lib/variaveis-mensagem"

export type Opcao = { id: string; nome: string }

/** O que o workspace tem cadastrado e aparece nos seletores do editor. */
export interface OpcoesEditor {
  etiquetas: Array<{ id: string; nome: string; cor: string }>
  atendentes: Opcao[]
  tags: Opcao[]
  times: Opcao[]
  sequencias: Opcao[]
  mensagensRapidas: Opcao[]
  numeros: Opcao[]
  /** O da empresa, ou o padrão: o painel da condição de horário mostra qual vale. */
  horarioComercial: HorarioComercial
  /** B41-04: funis da empresa, além de Entrada e Recompra, com as etapas na ordem. */
  funis?: Array<{ id: string; nome: string; etapas: Opcao[] }>
  /** B38-04: campos personalizados da empresa, na ordem dela. */
  camposPersonalizados?: CampoParaFiltro[]
}

export type FonteOpcoes =
  | "etiquetas"
  | "atendentes"
  | "tags"
  | "times"
  | "sequencias"
  | "mensagensRapidas"
  | "funis"
  | "classificacoes"
  | "tiposContato"
  | "tiposMensagem"
  | "canais"
  | "camposContatoGatilho"
  | "camposContatoAcao"
  // B43-02
  | "perfisRfv"
  // B43-03: os onze perfis, sem "Sem compras" (destino do gatilho)
  | "perfisRfvDestino"
  // B43-03
  | "horas"

export type CampoTela =
  | { chave: string; rotulo: string; tipo: "texto"; placeholder?: string }
  | {
      chave: string
      rotulo: string
      tipo: "texto_longo"
      placeholder?: string
      ajuda?: string
      /** Botões que inserem as variáveis da mensagem no cursor (B22-14). */
      variaveis?: boolean
    }
  /** `vazio` é o rótulo da opção sem valor: "Escolha…" quando obrigatório, "Qualquer tag" quando opcional. */
  | { chave: string; rotulo: string; tipo: "opcoes"; fonte: FonteOpcoes; vazio: string }
  /** Etapa do funil escolhido no parâmetro `funil`. */
  | { chave: "etapa"; rotulo: string; tipo: "etapa"; vazio: string }
  /** Valor do dado do contato escolhido no parâmetro `campo`. */
  | { chave: "valor"; rotulo: string; tipo: "valor_do_campo"; vazio: string }
  | { chave: string; rotulo: string; tipo: "arquivo" }
  /**
   * Tag digitada, que pode ser nova; as tags que a empresa já usa aparecem como sugestão.
   * Com `vazio`, deixar em branco vale como "qualquer tag" (no gatilho).
   */
  | { chave: "tag"; rotulo: string; tipo: "tag_livre"; vazio?: string }
  /** Prazo em número e unidade (horas ou dias), gravado em `vence_em` e `vence_unidade` (B28-01). */
  | { chave: "vence_em"; rotulo: string; tipo: "vencimento" }
  /**
   * B43-03: várias opções marcadas, ids separados por vírgula. `fora` é a chave de outro
   * parâmetro: o que está marcado lá não dá para marcar aqui (origem não é o destino).
   */
  | { chave: string; rotulo: string; tipo: "opcoes_varias"; fonte: FonteOpcoes; ajuda?: string; fora?: string }

export const FUNIS: Opcao[] = [
  { id: "entrada", nome: "Funil de Entrada" },
  { id: "recompra", nome: "Funil de Recompra" },
]

/** B41-04: Entrada, Recompra e os funis da empresa, nessa ordem. */
export function funisDoEditor(opcoes?: Pick<OpcoesEditor, "funis">): Opcao[] {
  return [...FUNIS, ...(opcoes?.funis ?? []).map((f) => ({ id: f.id, nome: f.nome }))]
}

/** Etapas do funil escolhido. Funil da empresa que não existe mais não tem etapas. */
export function etapasDoFunil(funil: string | undefined, opcoes?: Pick<OpcoesEditor, "funis">): Opcao[] {
  if (funil === "entrada" || funil === "recompra") {
    const etapas = funil === "recompra" ? ETAPAS_RECOMPRA : ETAPAS_ENTRADA
    return etapas.map((e) => ({ id: e.id, nome: e.label }))
  }
  if (!funil) return ETAPAS_ENTRADA.map((e) => ({ id: e.id, nome: e.label }))
  return opcoes?.funis?.find((f) => f.id === funil)?.etapas ?? []
}

/** O funil (e a etapa, quando escolhida) ainda existem? Vazio não conta como apagado. */
export function funilEEtapaExistem(funil: string | undefined, etapa: string | undefined, opcoes: Pick<OpcoesEditor, "funis">): boolean {
  if (!funil) return true
  if (!funisDoEditor(opcoes).some((f) => f.id === funil)) return false
  return !etapa || etapasDoFunil(funil, opcoes).some((e) => e.id === etapa)
}

/** B41-04: o texto que marca o bloco cujo funil ou etapa foi apagado (CA-B41-11). */
export const PRECISA_DE_AJUSTE = "precisa de ajuste, o funil ou a etapa escolhida foi apagada"

const CAMPOS_CONTATO: Record<string, string> = {
  classificacao: "Classificação",
  tipo: "Tipo",
  cidade: "Cidade",
  atendente: "Atendente",
  observacoes: "Observações (acrescentar linha)",
}

/** B38-04: o campo personalizado do editor pelo id "campo:<tipo>:<uuid>". */
export function campoPersonalizadoDoEditor(campo: string | undefined, opcoes: OpcoesEditor | undefined): CampoParaFiltro | undefined {
  if (!campo?.startsWith("campo:")) return undefined
  const id = campo.split(":")[2]
  return opcoes?.camposPersonalizados?.find((c) => c.id === id)
}

export function rotuloCampoContato(campo: string, opcoes?: OpcoesEditor): string {
  // B38-04: campo personalizado pelo nome que a empresa deu
  if (campo.startsWith("campo:")) return campoPersonalizadoDoEditor(campo, opcoes)?.nome ?? "Campo personalizado apagado"
  return CAMPOS_CONTATO[campo] ?? campo
}

const camposDoEditor = (opcoes: OpcoesEditor): Opcao[] =>
  (opcoes.camposPersonalizados ?? []).map((c) => ({ id: campoPersonalizado(c), nome: c.nome }))

const TIPOS_MENSAGEM: Opcao[] = [
  { id: "texto", nome: "Texto" },
  { id: "imagem", nome: "Imagem" },
  { id: "audio", nome: "Áudio" },
  { id: "video", nome: "Vídeo" },
  { id: "documento", nome: "Documento" },
]

const paraOpcoes = (rotulos: Record<string, string>): Opcao[] =>
  Object.entries(rotulos).map(([id, nome]) => ({ id, nome }))

export function opcoesDaFonte(fonte: FonteOpcoes, opcoes: OpcoesEditor): Opcao[] {
  switch (fonte) {
    case "funis":
      return funisDoEditor(opcoes)
    case "classificacoes":
      return paraOpcoes(CLASSIFICACAO_LABEL)
    case "tiposContato":
      return paraOpcoes(TIPO_LABEL)
    case "tiposMensagem":
      return TIPOS_MENSAGEM
    case "canais":
      return [
        { id: "oficial", nome: "API Oficial" },
        { id: "direto", nome: "Canal direto" },
        ...opcoes.numeros.map((n) => ({ id: `numero:${n.id}`, nome: `Número ${n.nome}` })),
      ]
    case "camposContatoGatilho":
      // Sem "atendente": contacts.atendente_id não é gravado por nenhuma tela (B11-06)
      // B38-04: depois dos fixos, os campos personalizados da empresa
      return [...["classificacao", "tipo", "cidade"].map((id) => ({ id, nome: CAMPOS_CONTATO[id] })), ...camposDoEditor(opcoes)]
    case "perfisRfv":
      return [...opcoesDaFonte("perfisRfvDestino", opcoes), { id: SEM_COMPRAS, nome: "Sem compras" }]
    case "perfisRfvDestino":
      return PERFIS.map((p) => ({ id: p.id, nome: `${p.icone} ${p.nome}` }))
    case "horas":
      return Array.from({ length: 24 }, (_, h) => ({ id: String(h), nome: `${h}h` }))
    case "camposContatoAcao":
      // Sem classificação: o CRM a calcula pela etapa dos cards (B11-11)
      return [...["tipo", "cidade", "observacoes"].map((id) => ({ id, nome: CAMPOS_CONTATO[id] })), ...camposDoEditor(opcoes)]
    default:
      return opcoes[fonte]
  }
}

/** Opções do valor de um dado do contato; `null` quando o valor é texto livre. */
export function opcoesDoCampoContato(campo: string | undefined, opcoes: OpcoesEditor): Opcao[] | null {
  if (campo === "classificacao") return opcoesDaFonte("classificacoes", opcoes)
  if (campo === "tipo") return opcoesDaFonte("tiposContato", opcoes)
  if (campo === "atendente") return opcoes.atendentes
  // B38-04: lista de opções e sim/não do campo personalizado; múltipla escolha é à parte
  const personalizado = campoPersonalizadoDoEditor(campo, opcoes)
  if (personalizado?.tipo === "lista") return personalizado.opcoes
  if (personalizado?.tipo === "sim_nao") return [{ id: "sim", nome: "Sim" }, { id: "nao", nome: "Não" }]
  return null
}

// ─── Gatilhos ────────────────────────────────────────────────────────────────

export const GATILHOS: Record<GatilhoTipo, { rotulo: string; icone: LucideIcon; campos: CampoTela[] }> = {
  mensagem_recebida: { rotulo: "Mensagem recebida do cliente", icone: MessageSquare, campos: [] },
  mensagem_enviada_time: { rotulo: "Mensagem enviada pelo time", icone: Send, campos: [] },
  conversa_criada: { rotulo: "Conversa criada", icone: MessageCirclePlus, campos: [] },
  card_movido: {
    rotulo: "Card movido para etapa",
    icone: Kanban,
    campos: [
      { chave: "funil", rotulo: "Funil", tipo: "opcoes", fonte: "funis", vazio: "Escolha o funil…" },
      { chave: "etapa", rotulo: "Etapa", tipo: "etapa", vazio: "Qualquer etapa" },
    ],
  },
  tag_adicionada: {
    rotulo: "Tag adicionada ao contato",
    icone: Tag,
    campos: [{ chave: "tag", rotulo: "Tag", tipo: "tag_livre", vazio: "Qualquer tag" }],
  },
  etiqueta_aplicada: {
    rotulo: "Etiqueta aplicada à conversa",
    icone: BookmarkPlus,
    campos: [{ chave: "label_id", rotulo: "Etiqueta", tipo: "opcoes", fonte: "etiquetas", vazio: "Qualquer etiqueta" }],
  },
  // B43-03
  entrou_perfil_rfv: {
    rotulo: "Entrou no perfil RFV",
    icone: Gauge,
    campos: [
      { chave: "destinos", rotulo: "Perfis de destino", tipo: "opcoes_varias", fonte: "perfisRfvDestino" },
      {
        chave: "origens",
        rotulo: "Vindo de (opcional)",
        tipo: "opcoes_varias",
        fonte: "perfisRfv",
        ajuda: "Sem nada marcado, vale vindo de qualquer perfil.",
        fora: "destinos",
      },
      { chave: "hora", rotulo: "Horário de disparo", tipo: "opcoes", fonte: "horas", vazio: "Escolha a hora…" },
    ],
  },
  dado_contato_alterado: {
    rotulo: "Dado do contato alterado",
    icone: UserPen,
    campos: [
      { chave: "campo", rotulo: "Campo", tipo: "opcoes", fonte: "camposContatoGatilho", vazio: "Escolha o campo…" },
      { chave: "valor", rotulo: "Valor novo (opcional)", tipo: "valor_do_campo", vazio: "Qualquer valor" },
    ],
  },
}

// ─── Verificações (dentro do bloco de condição) ──────────────────────────────

type ValorVerificacao =
  | { tipo: "texto"; placeholder: string }
  | { tipo: "opcoes"; fonte: FonteOpcoes }
  /** B43-02: várias opções marcadas, guardadas como ids separados por vírgula. */
  | { tipo: "opcoes_varias"; fonte: FonteOpcoes }
  | { tipo: "funil_etapa" }
  | { tipo: "nenhum" }
  /** Tag digitada, como na ação "adicionar tag": dá para conferir uma tag que o fluxo acabou de criar. */
  | { tipo: "tag_livre" }

export const VERIFICACOES: Record<
  VerificacaoTipo,
  { rotulo: string; operadores: Opcao[]; valor: ValorVerificacao }
> = {
  texto_mensagem: {
    rotulo: "Texto da mensagem",
    operadores: [
      { id: "contem", nome: "contém" },
      { id: "nao_contem", nome: "não contém" },
      { id: "comeca_com", nome: "começa com" },
      { id: "igual", nome: "é igual a" },
      { id: "contem_alguma", nome: "contém alguma das palavras" },
    ],
    valor: { tipo: "texto", placeholder: "Ex.: catálogo (ou: preço, valor, tabela)" },
  },
  tipo_mensagem: {
    rotulo: "Tipo da mensagem",
    operadores: [
      { id: "e", nome: "é" },
      { id: "nao_e", nome: "não é" },
    ],
    valor: { tipo: "opcoes", fonte: "tiposMensagem" },
  },
  canal: {
    rotulo: "Canal da conversa",
    operadores: [{ id: "e", nome: "é" }],
    valor: { tipo: "opcoes", fonte: "canais" },
  },
  tag_contato: {
    rotulo: "Tag do contato",
    operadores: [
      { id: "tem", nome: "tem" },
      { id: "nao_tem", nome: "não tem" },
    ],
    valor: { tipo: "tag_livre" },
  },
  classificacao: {
    rotulo: "Classificação do contato",
    operadores: [
      { id: "e", nome: "é" },
      { id: "nao_e", nome: "não é" },
    ],
    valor: { tipo: "opcoes", fonte: "classificacoes" },
  },
  // B38-04: o campo, as comparações e o valor dependem do campo escolhido (painel-bloco)
  campo_personalizado: {
    rotulo: "Campo personalizado",
    operadores: [],
    valor: { tipo: "nenhum" },
  },
  // B43-02
  perfil_rfv: {
    rotulo: "Perfil RFV",
    operadores: [{ id: "e_um_de", nome: "é um destes" }],
    valor: { tipo: "opcoes_varias", fonte: "perfisRfv" },
  },
  tipo_contato: {
    rotulo: "Tipo do contato",
    operadores: [
      { id: "e", nome: "é" },
      { id: "nao_e", nome: "não é" },
    ],
    valor: { tipo: "opcoes", fonte: "tiposContato" },
  },
  etiqueta_conversa: {
    rotulo: "Etiqueta da conversa",
    operadores: [
      { id: "tem", nome: "tem" },
      { id: "nao_tem", nome: "não tem" },
    ],
    valor: { tipo: "opcoes", fonte: "etiquetas" },
  },
  atendente: {
    rotulo: "Atendente da conversa",
    operadores: [
      { id: "sem_atendente", nome: "está sem atendente" },
      { id: "e", nome: "é" },
    ],
    valor: { tipo: "opcoes", fonte: "atendentes" },
  },
  card_etapa: {
    rotulo: "Card do contato",
    operadores: [{ id: "esta_em", nome: "está em" }],
    valor: { tipo: "funil_etapa" },
  },
  horario_comercial: {
    rotulo: "Horário",
    operadores: [
      { id: "dentro", nome: "dentro do horário comercial" },
      { id: "fora", nome: "fora do horário comercial" },
    ],
    valor: { tipo: "nenhum" },
  },
}

// ─── Ações ───────────────────────────────────────────────────────────────────

export const ACOES: Record<AcaoTipo, { rotulo: string; icone: LucideIcon; campos: CampoTela[] }> = {
  enviar_mensagem: {
    rotulo: "Enviar mensagem",
    icone: MessageSquareText,
    campos: [
      {
        chave: "texto",
        rotulo: "Mensagem",
        tipo: "texto_longo",
        placeholder: "Ex.: Oi, tudo bem? Para pôr o nome do cliente, clique em Primeiro nome, aqui embaixo.",
        variaveis: true,
      },
    ],
  },
  enviar_mensagem_rapida: {
    rotulo: "Enviar mensagem rápida",
    icone: ListOrdered,
    campos: [
      {
        chave: "mensagem_rapida_id",
        rotulo: "Mensagem rápida",
        tipo: "opcoes",
        fonte: "mensagensRapidas",
        vazio: "Escolha a mensagem…",
      },
    ],
  },
  enviar_midia: {
    rotulo: "Enviar imagem ou documento",
    icone: Paperclip,
    campos: [{ chave: "arquivo", rotulo: "Arquivo", tipo: "arquivo" }],
  },
  adicionar_tag: {
    rotulo: "Adicionar tag ao contato",
    icone: Tag,
    campos: [{ chave: "tag", rotulo: "Tag", tipo: "tag_livre" }],
  },
  remover_tag: {
    rotulo: "Remover tag do contato",
    icone: Tags,
    campos: [{ chave: "tag", rotulo: "Tag", tipo: "opcoes", fonte: "tags", vazio: "Escolha a tag…" }],
  },
  aplicar_etiqueta: {
    rotulo: "Aplicar etiqueta à conversa",
    icone: BookmarkPlus,
    campos: [{ chave: "label_id", rotulo: "Etiqueta", tipo: "opcoes", fonte: "etiquetas", vazio: "Escolha a etiqueta…" }],
  },
  remover_etiqueta: {
    rotulo: "Remover etiqueta da conversa",
    icone: BookmarkMinus,
    campos: [{ chave: "label_id", rotulo: "Etiqueta", tipo: "opcoes", fonte: "etiquetas", vazio: "Escolha a etiqueta…" }],
  },
  alterar_dado_contato: {
    rotulo: "Alterar dado do contato",
    icone: UserPen,
    campos: [
      { chave: "campo", rotulo: "Campo", tipo: "opcoes", fonte: "camposContatoAcao", vazio: "Escolha o campo…" },
      { chave: "valor", rotulo: "Novo valor", tipo: "valor_do_campo", vazio: "Escolha o valor…" },
    ],
  },
  atribuir_atendente: {
    rotulo: "Atribuir atendente",
    icone: UserCheck,
    campos: [
      { chave: "atendente_id", rotulo: "Atendente", tipo: "opcoes", fonte: "atendentes", vazio: "Escolha o atendente…" },
    ],
  },
  atribuir_time: {
    rotulo: "Atribuir a um time",
    icone: Users,
    campos: [{ chave: "time_id", rotulo: "Time", tipo: "opcoes", fonte: "times", vazio: "Escolha o time…" }],
  },
  mover_card: {
    rotulo: "Mover card para etapa",
    icone: Kanban,
    campos: [
      { chave: "funil", rotulo: "Funil", tipo: "opcoes", fonte: "funis", vazio: "Escolha o funil…" },
      { chave: "etapa", rotulo: "Etapa", tipo: "etapa", vazio: "Escolha a etapa…" },
    ],
  },
  iniciar_sequencia: {
    rotulo: "Iniciar sequência",
    icone: FileText,
    campos: [
      { chave: "sequencia_id", rotulo: "Sequência", tipo: "opcoes", fonte: "sequencias", vazio: "Escolha a sequência…" },
    ],
  },
  resolver_conversa: { rotulo: "Resolver a conversa", icone: CircleCheck, campos: [] },
  reabrir_conversa: { rotulo: "Reabrir a conversa", icone: RotateCcw, campos: [] },
  criar_lembrete: {
    rotulo: "Criar lembrete na Agenda",
    icone: BellPlus,
    campos: [
      {
        chave: "texto",
        rotulo: "Lembrete",
        tipo: "texto_longo",
        placeholder: "Ex.: Ligar e perguntar do pedido. Para pôr o nome do cliente, clique em Primeiro nome, aqui embaixo.",
        variaveis: true,
      },
      // B28-01: o padrão é o responsável pela conversa; dá para escolher outra pessoa
      { chave: "responsavel_id", rotulo: "Para quem", tipo: "opcoes", fonte: "atendentes", vazio: "Responsável pela conversa" },
      { chave: "vence_em", rotulo: "Vence", tipo: "vencimento" },
    ],
  },
}

/** Rótulo da escolha que não existe mais, no bloco e no painel (B22-27). */
export const NAO_EXISTE_MAIS = "(não existe mais)"

// Listas que vêm do banco da empresa: o escolhido pode ter sido apagado ou desativado
const FONTES_DA_EMPRESA: readonly FonteOpcoes[] = ["etiquetas", "atendentes", "times", "sequencias", "mensagensRapidas", "canais"]

/**
 * Escolhas do fluxo que não estão mais nas listas da empresa (etiqueta, time,
 * mensagem rápida, sequência ou número apagados, atendente desativado), por bloco.
 * O editor marca o bloco e a lista avisa; o Salvar e o Ativar conferem de novo no
 * servidor (B22-27). Na condição "atendente é", atendente desativado continua
 * valendo (B22-02).
 */
export function referenciasQueSumiram(fluxo: Fluxo, opcoes: OpcoesEditor): Record<string, string[]> {
  const porBloco: Record<string, string[]> = {}
  const sumiu = (fonte: FonteOpcoes, valor: string | undefined) =>
    !!valor && FONTES_DA_EMPRESA.includes(fonte) && !opcoesDaFonte(fonte, opcoes).some((o) => o.id === valor)
  const anotar = (id: string, rotulo: string) => {
    ;(porBloco[id] ??= []).push(`${rotulo}: a opção escolhida foi apagada ou desativada`)
  }

  // B41-04: funil ou etapa de funil da empresa apagado.
  const ajustar = (id: string, rotulo: string) => {
    ;(porBloco[id] ??= []).push(`${rotulo}: ${PRECISA_DE_AJUSTE}`)
  }

  for (const bloco of fluxo.blocos) {
    if (bloco.tipo === "condicao") {
      for (const v of bloco.verificacoes) {
        const item = VERIFICACOES[v.tipo]
        if (item?.valor.tipo === "opcoes" && item.valor.fonte !== "atendentes" && sumiu(item.valor.fonte, v.valor)) {
          anotar(bloco.id, item.rotulo)
        }
        if (v.tipo === "card_etapa") {
          const [funil, etapa] = v.valor.split(":")
          if (!funilEEtapaExistem(funil, etapa, opcoes)) ajustar(bloco.id, item.rotulo)
        }
      }
      continue
    }
    if ((bloco.tipo === "gatilho" && bloco.gatilho === "card_movido") || (bloco.tipo === "acao" && bloco.acao === "mover_card")) {
      if (!funilEEtapaExistem(bloco.parametros.funil, bloco.parametros.etapa, opcoes)) {
        ajustar(bloco.id, bloco.tipo === "gatilho" ? GATILHOS.card_movido.rotulo : ACOES.mover_card.rotulo)
        continue
      }
    }
    // B28-02: o bloco "esperar" não escolhe nada da empresa
    if (bloco.tipo === "espera") continue
    const campos = bloco.tipo === "gatilho" ? GATILHOS[bloco.gatilho]?.campos : ACOES[bloco.acao]?.campos
    for (const campo of campos ?? []) {
      if (campo.tipo === "opcoes" && sumiu(campo.fonte, bloco.parametros[campo.chave])) anotar(bloco.id, campo.rotulo)
      // B38-05: texto salvo antes, com variável sem reserva (SUP-B38-18)
      const sem = campo.tipo === "texto_longo" && campo.variaveis ? variaveisSemReserva(bloco.parametros[campo.chave] ?? "") : []
      if (sem.length > 0) (porBloco[bloco.id] ??= []).push(`${campo.rotulo}: precisa de ajuste, ${sem.join(", ")} sem texto reserva`)
    }
  }
  return porBloco
}

/** O que o menu de novo bloco oferece, em grupos. */
export const GRUPOS_NOVO_BLOCO: Array<{ titulo: string; itens: Array<"condicao" | "espera" | AcaoTipo> }> = [
  // B28-02: o bloco "esperar"
  { titulo: "Lógica", itens: ["condicao", "espera"] },
  { titulo: "Mensagem", itens: ["enviar_mensagem", "enviar_mensagem_rapida", "enviar_midia"] },
  { titulo: "Contato", itens: ["adicionar_tag", "remover_tag", "alterar_dado_contato"] },
  {
    titulo: "Conversa",
    itens: ["aplicar_etiqueta", "remover_etiqueta", "atribuir_atendente", "resolver_conversa", "reabrir_conversa"],
  },
  // B28-06: "iniciar sequência" saiu
  { titulo: "Funil e time", itens: ["mover_card", "atribuir_time"] },
  { titulo: "Agenda", itens: ["criar_lembrete"] },
]

