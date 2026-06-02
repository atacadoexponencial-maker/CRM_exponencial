export type ClassificacaoContato =
  | "lead"
  | "ativo"
  | "em_risco"
  | "inativo"
  | "perdido"
  | "sem_historico"

export type TipoContato = "lojista" | "revendedor" | "empreendedor"

export type ICP = "ja_revende" | "primeira_vez"

export interface Contato {
  id: string
  nome: string
  telefone: string
  classificacao: ClassificacaoContato
  tipo: TipoContato | null
  nicho: string | null
  cidade: string | null
  atendente: string | null
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

export interface ContatoPerfil extends Contato {
  icp: ICP | null
  tags: string[]
  observacoes: string
  cards: CardPipelineMock[]
  compras: Compra[]
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
    icp: "ja_revende",
    tags: ["vip", "fidelizado", "whatsapp-ativo"],
    observacoes: "Cliente parceiro desde 2024. Prefere contato pela manhã. Tem interesse em ampliar o mix de produtos.",
    cards: [{ funil: "retencao", etapaLabel: "Cliente Ativo" }],
    compras: [
      { id: "cp1", data: "15/01/2026", valor: 4200 },
      { id: "cp2", data: "12/02/2026", valor: 3800 },
      { id: "cp3", data: "05/03/2026", valor: 5100 },
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
    icp: "primeira_vez",
    tags: [],
    observacoes: "",
    cards: [{ funil: "expansao", etapaLabel: "Primeiro Contato" }],
    compras: [],
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
    icp: null,
    tags: [],
    observacoes: "",
    cards: [],
    compras: [],
  },
}
