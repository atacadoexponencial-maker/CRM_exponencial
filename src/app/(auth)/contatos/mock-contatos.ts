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
  | "dados_editados"

export interface Contato {
  id: string
  nome: string
  telefone: string
  classificacao: ClassificacaoContato
  tipo: TipoContato | null
  nicho: string | null
  cidade: string | null
  atendente: string | null
  created_at: string
}

export interface Compra {
  id: string
  data: string
  valor: number
}

export interface CardPipelineMock {
  funil: "expansao" | "retencao"
  etapaLabel: string
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
  tags: string[]
  observacoes: string
  cards: CardPipelineMock[]
  compras: Compra[]
  timeline: EventoTimeline[]
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
  dados_editados: "Dados editados",
}

export const MOCK_CONTATOS: Contato[] = [
  {
    id: "c1",
    nome: "Padaria do Centro",
    telefone: "+55 11 99001-0001",
    classificacao: "ativo",
    tipo: "lojista",
    nicho: "Alimentação",
    cidade: "São Paulo",
    atendente: "Fernanda",
    created_at: "2025-11-15T10:00:00Z",
  },
  {
    id: "c2",
    nome: "Mercearia Boa Vista",
    telefone: "+55 85 89001-0002",
    classificacao: "lead",
    tipo: "revendedor",
    nicho: "Alimentação",
    cidade: "Fortaleza",
    atendente: "Carlos",
    created_at: "2026-05-20T08:45:00Z",
  },
  {
    id: "c3",
    nome: "Empório das Flores",
    telefone: "+55 21 98765-0003",
    classificacao: "em_risco",
    tipo: "lojista",
    nicho: "Floricultura",
    cidade: "Rio de Janeiro",
    atendente: "Ana",
    created_at: "2026-02-10T09:00:00Z",
  },
  {
    id: "c4",
    nome: "Boutique Bella Moda",
    telefone: "+55 31 97654-0004",
    classificacao: "ativo",
    tipo: "empreendedor",
    nicho: "Moda",
    cidade: "Belo Horizonte",
    atendente: "Fernanda",
    created_at: "2026-01-05T14:00:00Z",
  },
  {
    id: "c5",
    nome: "Mercadinho São João",
    telefone: "+55 71 96543-0005",
    classificacao: "inativo",
    tipo: "revendedor",
    nicho: "Alimentação",
    cidade: "Salvador",
    atendente: "Carlos",
    created_at: "2025-12-20T11:00:00Z",
  },
  {
    id: "c6",
    nome: "Loja do Artesão",
    telefone: "+55 81 95432-0006",
    classificacao: "perdido",
    tipo: "empreendedor",
    nicho: "Artesanato",
    cidade: "Recife",
    atendente: "Ana",
    created_at: "2026-03-01T15:30:00Z",
  },
  {
    id: "c7",
    nome: "Distribuidora Norte",
    telefone: "+55 92 94321-0007",
    classificacao: "lead",
    tipo: "revendedor",
    nicho: "Utilidades",
    cidade: "Manaus",
    atendente: "Fernanda",
    created_at: "2026-04-12T08:00:00Z",
  },
  {
    id: "c8",
    nome: "Pet Shop Amigo Fiel",
    telefone: "+55 41 93210-0008",
    classificacao: "ativo",
    tipo: "lojista",
    nicho: "Pet",
    cidade: "Curitiba",
    atendente: "Carlos",
    created_at: "2026-03-22T16:00:00Z",
  },
  {
    id: "c9",
    nome: "Farmácia Saúde Total",
    telefone: "+55 51 92109-0009",
    classificacao: "sem_historico",
    tipo: null,
    nicho: null,
    cidade: "Porto Alegre",
    atendente: null,
    created_at: "2026-05-30T10:00:00Z",
  },
  {
    id: "c10",
    nome: "Papelaria Criativa",
    telefone: "+55 62 91098-0010",
    classificacao: "lead",
    tipo: "empreendedor",
    nicho: "Papelaria",
    cidade: "Goiânia",
    atendente: "Ana",
    created_at: "2026-05-15T13:00:00Z",
  },
]

export const MOCK_PERFIS_CONTATO: Record<string, ContatoPerfil> = {
  c1: {
    id: "c1",
    nome: "Padaria do Centro",
    telefone: "+55 11 99001-0001",
    classificacao: "ativo",
    tipo: "lojista",
    nicho: "Alimentação",
    cidade: "São Paulo",
    atendente: "Fernanda",
    created_at: "2025-11-15T10:00:00Z",
    icp: "ja_revende",
    tags: ["vip", "fidelizado", "whatsapp-ativo"],
    observacoes: "Cliente parceiro desde 2024. Prefere contato pela manhã. Tem interesse em ampliar o mix de produtos.",
    cards: [{ funil: "retencao", etapaLabel: "Cliente Ativo" }],
    compras: [
      { id: "cp1", data: "15/01/2026", valor: 4200 },
      { id: "cp2", data: "12/02/2026", valor: 3800 },
      { id: "cp3", data: "05/03/2026", valor: 5100 },
    ],
    timeline: [
      { id: "t1", data: "05/03/2026 10:30", tipo: "compra_registrada", descricao: "Compra registrada — R$ 5.100,00", responsavel: "Fernanda" },
      { id: "t2", data: "20/02/2026 14:15", tipo: "mudanca_etapa", descricao: "Aguardando Recompra → Cliente Ativo", responsavel: "Fernanda" },
      { id: "t3", data: "12/02/2026 09:00", tipo: "compra_registrada", descricao: "Compra registrada — R$ 3.800,00", responsavel: "Fernanda" },
      { id: "t4", data: "28/01/2026 11:00", tipo: "nota_interna", descricao: "\"Cliente solicitou catálogo atualizado de produtos sazonais para fevereiro.\"", responsavel: "Fernanda" },
      { id: "t5", data: "15/01/2026 16:30", tipo: "compra_registrada", descricao: "Compra registrada — R$ 4.200,00", responsavel: "Fernanda" },
      { id: "t6", data: "10/12/2025 09:45", tipo: "mudanca_etapa", descricao: "Em Onboarding → Cliente Ativo", responsavel: "Fernanda" },
      { id: "t7", data: "01/12/2025 08:00", tipo: "card_criado", descricao: "Card criado no Funil de Retenção — etapa: Em Onboarding", responsavel: "Sistema" },
      { id: "t8", data: "15/11/2025 10:00", tipo: "conversa_iniciada", descricao: "Nova conversa iniciada via WhatsApp", responsavel: "Fernanda" },
    ],
  },
  c2: {
    id: "c2",
    nome: "Mercearia Boa Vista",
    telefone: "+55 85 89001-0002",
    classificacao: "lead",
    tipo: "revendedor",
    nicho: "Alimentação",
    cidade: "Fortaleza",
    atendente: "Carlos",
    created_at: "2026-05-20T08:45:00Z",
    icp: "primeira_vez",
    tags: [],
    observacoes: "",
    cards: [{ funil: "expansao", etapaLabel: "Primeiro Contato" }],
    compras: [],
    timeline: [
      { id: "t1", data: "21/05/2026 14:00", tipo: "dados_editados", descricao: "Campos atualizados: tipo, nicho", responsavel: "Carlos" },
      { id: "t2", data: "20/05/2026 09:00", tipo: "card_criado", descricao: "Card criado no Funil de Expansão — etapa: Primeiro Contato", responsavel: "Carlos" },
      { id: "t3", data: "20/05/2026 08:45", tipo: "conversa_iniciada", descricao: "Nova conversa iniciada via WhatsApp", responsavel: "Carlos" },
    ],
  },
  c9: {
    id: "c9",
    nome: "Farmácia Saúde Total",
    telefone: "+55 51 92109-0009",
    classificacao: "sem_historico",
    tipo: null,
    nicho: null,
    cidade: "Porto Alegre",
    atendente: null,
    created_at: "2026-05-30T10:00:00Z",
    icp: null,
    tags: [],
    observacoes: "",
    cards: [],
    compras: [],
    timeline: [],
  },
}
