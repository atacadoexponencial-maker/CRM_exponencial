export type ClassificacaoContato =
  | "lead"
  | "ativo"
  | "em_risco"
  | "inativo"
  | "perdido"
  | "sem_historico"

export type TipoContato = "lojista" | "revendedor" | "empreendedor"

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
