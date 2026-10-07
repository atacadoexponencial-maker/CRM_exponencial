// Como cada gatilho, verificação e ação aparece no editor: rótulo, ícone e os
// campos do painel. As regras (o que é obrigatório, o que vale para cada
// gatilho) ficam em `@/lib/fluxo-automacao`; aqui é só apresentação.

import type { LucideIcon } from "lucide-react"
import {
  BookmarkMinus,
  BookmarkPlus,
  CircleCheck,
  FileText,
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
import type { AcaoTipo, GatilhoTipo, VerificacaoTipo } from "@/lib/fluxo-automacao"
import { ETAPAS_ENTRADA, ETAPAS_RECOMPRA } from "../../../pipeline/mock-pipeline"
import { CLASSIFICACAO_LABEL, TIPO_LABEL } from "../../../contatos/mock-contatos"

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

export type CampoTela =
  | { chave: string; rotulo: string; tipo: "texto"; placeholder?: string }
  | { chave: string; rotulo: string; tipo: "texto_longo"; placeholder?: string; ajuda?: string }
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

export const FUNIS: Opcao[] = [
  { id: "entrada", nome: "Funil de Entrada" },
  { id: "recompra", nome: "Funil de Recompra" },
]

export function etapasDoFunil(funil: string | undefined): Opcao[] {
  const etapas = funil === "recompra" ? ETAPAS_RECOMPRA : ETAPAS_ENTRADA
  return etapas.map((e) => ({ id: e.id, nome: e.label }))
}

const CAMPOS_CONTATO: Record<string, string> = {
  classificacao: "Classificação",
  tipo: "Tipo",
  nicho: "Nicho",
  cidade: "Cidade",
  atendente: "Atendente",
  observacoes: "Observações (acrescentar linha)",
}

export function rotuloCampoContato(campo: string): string {
  return CAMPOS_CONTATO[campo] ?? campo
}

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
      return FUNIS
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
      return ["classificacao", "tipo", "nicho", "cidade"].map((id) => ({ id, nome: CAMPOS_CONTATO[id] }))
    case "camposContatoAcao":
      // Sem classificação: o CRM a calcula pela etapa dos cards (B11-11)
      return ["tipo", "nicho", "cidade", "observacoes"].map((id) => ({ id, nome: CAMPOS_CONTATO[id] }))
    default:
      return opcoes[fonte]
  }
}

/** Opções do valor de um dado do contato; `null` quando o valor é texto livre. */
export function opcoesDoCampoContato(campo: string | undefined, opcoes: OpcoesEditor): Opcao[] | null {
  if (campo === "classificacao") return opcoesDaFonte("classificacoes", opcoes)
  if (campo === "tipo") return opcoesDaFonte("tiposContato", opcoes)
  if (campo === "atendente") return opcoes.atendentes
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
        placeholder: "Oi {{primeiro_nome}}, aqui é {{nome_vendedor}}…",
        ajuda: "Variáveis: {{nome_contato}}, {{primeiro_nome}}, {{nome_vendedor}}",
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
}

/** O que o menu de novo bloco oferece, em grupos. */
export const GRUPOS_NOVO_BLOCO: Array<{ titulo: string; itens: Array<"condicao" | AcaoTipo> }> = [
  { titulo: "Lógica", itens: ["condicao"] },
  { titulo: "Mensagem", itens: ["enviar_mensagem", "enviar_mensagem_rapida", "enviar_midia"] },
  { titulo: "Contato", itens: ["adicionar_tag", "remover_tag", "alterar_dado_contato"] },
  {
    titulo: "Conversa",
    itens: ["aplicar_etiqueta", "remover_etiqueta", "atribuir_atendente", "resolver_conversa", "reabrir_conversa"],
  },
  { titulo: "Funil e time", itens: ["mover_card", "atribuir_time", "iniciar_sequencia"] },
]

