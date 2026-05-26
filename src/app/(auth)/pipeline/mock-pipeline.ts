export type EtapaExpansao =
  | "lead"
  | "em_qualificacao"
  | "catalogo_enviado"
  | "em_negociacao"
  | "primeira_compra"

export interface CardLead {
  id: string
  contato: { nome: string; telefone: string }
  etapa: EtapaExpansao
  atendente: string | null
  tempoNaEtapa: string
  etiquetas: Array<{ id: string; nome: string; cor: string }>
}

export const ETAPAS_EXPANSAO: { id: EtapaExpansao; label: string }[] = [
  { id: "lead", label: "Lead" },
  { id: "em_qualificacao", label: "Em Qualificação" },
  { id: "catalogo_enviado", label: "Catálogo Enviado" },
  { id: "em_negociacao", label: "Em Negociação" },
  { id: "primeira_compra", label: "Primeira Compra" },
]

export const MOCK_CARDS_EXPANSAO: CardLead[] = [
  {
    id: "1",
    contato: { nome: "Padaria do Bairro", telefone: "+55 11 99001-1234" },
    etapa: "lead",
    atendente: null,
    tempoNaEtapa: "1 dia",
    etiquetas: [{ id: "novo", nome: "Novo cliente", cor: "#3b82f6" }],
  },
  {
    id: "2",
    contato: { nome: "Maria Conceição", telefone: "+55 85 89011-1234" },
    etapa: "lead",
    atendente: null,
    tempoNaEtapa: "3 dias",
    etiquetas: [],
  },
  {
    id: "3",
    contato: { nome: "Armazém do Zé", telefone: "+55 71 83017-7890" },
    etapa: "lead",
    atendente: "Carlos",
    tempoNaEtapa: "2 dias",
    etiquetas: [{ id: "indicacao", nome: "Indicação", cor: "#8b5cf6" }],
  },
  {
    id: "4",
    contato: { nome: "Mercadinho da Esquina", telefone: "+55 31 90010-0123" },
    etapa: "em_qualificacao",
    atendente: "Carlos",
    tempoNaEtapa: "5 dias",
    etiquetas: [{ id: "novo", nome: "Novo cliente", cor: "#3b82f6" }],
  },
  {
    id: "5",
    contato: { nome: "Hortifruti da Vila", telefone: "+55 11 86014-4567" },
    etapa: "em_qualificacao",
    atendente: "Fernanda",
    tempoNaEtapa: "1 semana",
    etiquetas: [],
  },
  {
    id: "6",
    contato: { nome: "Empório São Jorge", telefone: "+55 41 88012-2345" },
    etapa: "catalogo_enviado",
    atendente: "Fernanda",
    tempoNaEtapa: "3 dias",
    etiquetas: [{ id: "vip", nome: "VIP", cor: "#f59e0b" }],
  },
  {
    id: "7",
    contato: { nome: "Roberto Alves", telefone: "+55 21 92008-8901" },
    etapa: "catalogo_enviado",
    atendente: "Carlos",
    tempoNaEtapa: "6 dias",
    etiquetas: [],
  },
  {
    id: "8",
    contato: { nome: "Supermercado Família", telefone: "+55 62 85015-5678" },
    etapa: "em_negociacao",
    atendente: "Fernanda",
    tempoNaEtapa: "4 dias",
    etiquetas: [{ id: "vip", nome: "VIP", cor: "#f59e0b" }],
  },
  {
    id: "9",
    contato: { nome: "Distribuidora Norte", telefone: "+55 92 94006-6789" },
    etapa: "em_negociacao",
    atendente: "Carlos",
    tempoNaEtapa: "2 semanas",
    etiquetas: [{ id: "vip", nome: "VIP", cor: "#f59e0b" }, { id: "novo", nome: "Novo cliente", cor: "#3b82f6" }],
  },
  {
    id: "10",
    contato: { nome: "Loja do Bairro", telefone: "+55 47 80020-0123" },
    etapa: "primeira_compra",
    atendente: "Fernanda",
    tempoNaEtapa: "1 dia",
    etiquetas: [],
  },
]
