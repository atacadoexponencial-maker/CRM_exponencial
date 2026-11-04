export type ClassificacaoContato =
  | "lead"
  | "ativo"
  | "em_risco"
  | "inativo"
  | "perdido"
  | "sem_historico"

export type TipoContato = "lojista" | "revendedor" | "empreendedor"

export type ICP = "ja_revende" | "primeira_vez"

export type TipoEvento =
  | "conversa_iniciada"
  | "card_criado"
  | "mudanca_etapa"
  | "nota_interna"
  | "compra_registrada"
  | "pedido_catalogo"
  | "dados_editados"

/** Contatos por página na listagem (B10-06). Fica aqui porque `actions.ts` é
 * "use server" e só pode exportar funções. */
export const TAMANHO_PAGINA_CONTATOS = 50

export interface Contato {
  id: string
  nome: string
  telefone: string
  classificacao: ClassificacaoContato
  tipo: TipoContato | null
  cidade: string | null
  /** B32-02: sigla do estado, ou nula. Opcional no tipo para os dados de teste antigos. */
  uf?: string | null
  atendente: string | null
  created_at: string
  /** B43-01: perfil RFV da hora; null = sem compras; ausente = não lido. */
  perfilRfv?: import("@/lib/relatorios/rfv").PerfilRfv | null
  /** B38-02: valores dos campos personalizados marcados para a lista (id do campo → valor). */
  campos?: Record<string, import("@/lib/campos-personalizados").ValorGuardado>
}

export interface Compra {
  id: string
  data: string
  valor: number
  /** B30-01: campos dos relatórios. Opcionais; compra antiga vem sem eles. */
  pecas?: number | null
  desconto?: number | null
  formaPagamento?: import("@/lib/compras").FormaPagamento | null
  /** Nome do atendente responsável pela venda. */
  atendente?: string | null
  origem?: import("@/lib/compras").OrigemCompra
  /** B30-02: pedido do catálogo que gerou a compra (só quando origem = "catalogo"). */
  pedidoId?: string | null
  pedidoNumero?: number | null
}

export interface CardDoFunilDoContato {
  /** "entrada", "recompra" ou o id do funil da empresa (B41-03). */
  funil: string
  etapaLabel: string
  /** B41-03: nome do funil da empresa e o endereço do quadro. */
  nome?: string
  href?: string
}

export interface EventoTimeline {
  id: string
  data: string
  tipo: TipoEvento
  descricao: string
  responsavel: string
}

export interface ContatoPerfil extends Contato {
  icp: ICP | null
  /** Endereço assinado da foto de perfil (B29), ou null. Opcional. */
  fotoUrl?: string | null
  tags: string[]
  observacoes: string
  conversaId: string | null
  cards: CardDoFunilDoContato[]
  compras: Compra[]
  /** B30-01: id do atendente responsável pelo contato, para sugerir no diálogo de compra. */
  atendenteId?: string | null
  timeline: EventoTimeline[]
  /** Pedidos feitos pela loja do catálogo (B16-10). */
  pedidosCatalogo?: import("../catalogo/components/lista-pedidos").PedidoResumo[]
}

export const CLASSIFICACAO_LABEL: Record<ClassificacaoContato, string> = {
  lead: "Lead",
  ativo: "Ativo",
  em_risco: "Em Risco",
  inativo: "Inativo",
  perdido: "Perdido",
  sem_historico: "Sem histórico",
}

export const TIPO_LABEL: Record<TipoContato, string> = {
  lojista: "Lojista",
  revendedor: "Revendedor",
  empreendedor: "Empreendedor",
}

export const ICP_LABEL: Record<ICP, string> = {
  ja_revende: "Já revende este nicho",
  primeira_vez: "Primeira vez no nicho",
}

export const TIPOS_EVENTO: Record<TipoEvento, string> = {
  conversa_iniciada: "Conversa iniciada",
  card_criado: "Card criado",
  mudanca_etapa: "Mudança de etapa",
  nota_interna: "Nota interna",
  compra_registrada: "Compra registrada",
  pedido_catalogo: "Pedido do catálogo",
  dados_editados: "Dados editados",
}
