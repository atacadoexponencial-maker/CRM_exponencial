export type EtapaRecompra =
  | "onboarding"
  | "reposicao"
  | "ativos"
  | "ativos_ri"
  | "inativos"
  | "inativos_rp"
  | "perdidos"

export interface CardCliente {
  id: string
  contactId?: string | null
  contato: { nome: string; telefone: string }
  etapa: EtapaRecompra
  atendente: string | null
  tempoNaEtapa: string
  dataEntradaEtapa: string
  tempoNoFunil: string
  etiquetas: Array<{ id: string; nome: string; cor: string }>
  conversaId: string | null
}

export const ETAPAS_RECOMPRA: { id: EtapaRecompra; label: string; alerta: boolean }[] = [
  { id: "onboarding", label: "Onboarding", alerta: false },
  { id: "reposicao", label: "Reposição", alerta: false },
  { id: "ativos", label: "Ativos", alerta: false },
  { id: "ativos_ri", label: "Ativos RI", alerta: true },
  { id: "inativos", label: "Inativos", alerta: true },
  { id: "inativos_rp", label: "Inativos RP", alerta: true },
  { id: "perdidos", label: "Perdidos", alerta: true },
]

export const MOCK_CARDS_RECOMPRA: CardCliente[] = [
  {
    id: "r1",
    contato: { nome: "Padaria do Centro", telefone: "+55 11 99001-0001" },
    etapa: "onboarding",
    atendente: "Fernanda",
    tempoNaEtapa: "2 dias",
    dataEntradaEtapa: "27/05/2026",
    tempoNoFunil: "2 dias",
    etiquetas: [{ id: "novo", nome: "Novo cliente", cor: "#3b82f6" }],
    conversaId: null,
  },
  {
    id: "r2",
    contato: { nome: "Mercearia Boa Vista", telefone: "+55 85 89001-0002" },
    etapa: "onboarding",
    atendente: null,
    tempoNaEtapa: "1 dia",
    dataEntradaEtapa: "28/05/2026",
    tempoNoFunil: "1 dia",
    etiquetas: [],
    conversaId: null,
  },
  {
    id: "r3",
    contato: { nome: "Empório da Família", telefone: "+55 71 83001-0003" },
    etapa: "ativos",
    atendente: "Carlos",
    tempoNaEtapa: "1 mês",
    dataEntradaEtapa: "29/04/2026",
    tempoNoFunil: "2 meses",
    etiquetas: [{ id: "vip", nome: "VIP", cor: "#f59e0b" }],
    conversaId: null,
  },
  {
    id: "r4",
    contato: { nome: "Distribuidora Sul", telefone: "+55 41 80001-0004" },
    etapa: "ativos",
    atendente: "Fernanda",
    tempoNaEtapa: "3 meses",
    dataEntradaEtapa: "29/02/2026",
    tempoNoFunil: "3 meses",
    etiquetas: [],
    conversaId: null,
  },
  {
    id: "r5",
    contato: { nome: "Supermercado Estrela", telefone: "+55 31 90001-0005" },
    etapa: "reposicao",
    atendente: "Carlos",
    tempoNaEtapa: "5 dias",
    dataEntradaEtapa: "24/05/2026",
    tempoNoFunil: "2 meses",
    etiquetas: [{ id: "vip", nome: "VIP", cor: "#f59e0b" }],
    conversaId: null,
  },
  {
    id: "r6",
    contato: { nome: "Hortifruti Verde", telefone: "+55 92 94001-0006" },
    etapa: "reposicao",
    atendente: null,
    tempoNaEtapa: "8 dias",
    dataEntradaEtapa: "21/05/2026",
    tempoNoFunil: "1 mês",
    etiquetas: [],
    conversaId: null,
  },
  {
    id: "r7",
    contato: { nome: "Armazém do Norte", telefone: "+55 62 85001-0007" },
    etapa: "ativos",
    atendente: "Fernanda",
    tempoNaEtapa: "1 semana",
    dataEntradaEtapa: "22/05/2026",
    tempoNoFunil: "4 meses",
    etiquetas: [{ id: "vip", nome: "VIP", cor: "#f59e0b" }],
    conversaId: null,
  },
  {
    id: "r8",
    contato: { nome: "Loja São Paulo", telefone: "+55 11 92001-0008" },
    etapa: "ativos_ri",
    atendente: "Carlos",
    tempoNaEtapa: "3 semanas",
    dataEntradaEtapa: "08/05/2026",
    tempoNoFunil: "3 meses",
    etiquetas: [{ id: "atencao", nome: "Atenção", cor: "#ef4444" }],
    conversaId: null,
  },
  {
    id: "r9",
    contato: { nome: "Mercearia Boa Fé", telefone: "+55 21 89001-0009" },
    etapa: "ativos_ri",
    atendente: null,
    tempoNaEtapa: "1 mês",
    dataEntradaEtapa: "29/04/2026",
    tempoNoFunil: "2 meses",
    etiquetas: [{ id: "atencao", nome: "Atenção", cor: "#ef4444" }],
    conversaId: null,
  },
  {
    id: "r10",
    contato: { nome: "Distribuidora Leste", telefone: "+55 47 80001-0010" },
    etapa: "inativos",
    atendente: "Fernanda",
    tempoNaEtapa: "2 meses",
    dataEntradaEtapa: "29/03/2026",
    tempoNoFunil: "5 meses",
    etiquetas: [],
    conversaId: null,
  },
  {
    id: "r11",
    contato: { nome: "Atacado do Bairro", telefone: "+55 62 88001-0011" },
    etapa: "perdidos",
    atendente: "Carlos",
    tempoNaEtapa: "3 meses",
    dataEntradaEtapa: "29/02/2026",
    tempoNoFunil: "6 meses",
    etiquetas: [{ id: "perdido", nome: "Perdido", cor: "#6b7280" }],
    conversaId: null,
  },
]

export type EtapaEntrada =
  | "lead"
  | "sondagem"
  | "catalogo_enviado"
  | "follow_catalogo"
  | "negociacao"
  | "nutricao"
  | "ganho"
  | "perdido"

export interface CardLead {
  id: string
  contactId?: string | null
  contato: { nome: string; telefone: string }
  etapa: EtapaEntrada
  atendente: string | null
  tempoNaEtapa: string
  dataEntradaEtapa: string
  tempoNoFunil: string
  etiquetas: Array<{ id: string; nome: string; cor: string }>
  conversaId: string | null
}

export const ETAPAS_ENTRADA: { id: EtapaEntrada; label: string; alerta?: boolean }[] = [
  { id: "lead", label: "Lead" },
  { id: "sondagem", label: "Sondagem" },
  { id: "catalogo_enviado", label: "Catálogo Enviado" },
  { id: "follow_catalogo", label: "Follow do Catálogo" },
  { id: "negociacao", label: "Negociação" },
  { id: "nutricao", label: "Nutrição" },
  { id: "ganho", label: "Ganho" },
  { id: "perdido", label: "Perdido", alerta: true },
]

export interface HistoricoEtapa {
  deEtapa: string
  etapa: string
  data: string
  responsavel?: string
}

export interface NotaInterna {
  id: string
  autor: string
  texto: string
  data: string
}

export const MOCK_PAINEL_DATA: Record<string, { historico: HistoricoEtapa[]; notas: NotaInterna[] }> = {
  "1": {
    historico: [
      { deEtapa: "", etapa: "Lead", data: "22/05/2026 09:14" },
    ],
    notas: [
      { id: "n1", autor: "Carlos", texto: "Cliente indicado pelo Armazém do Zé. Tem interesse em biscoito e farinha.", data: "23/05/2026" },
    ],
  },
  "4": {
    historico: [
      { deEtapa: "", etapa: "Lead", data: "18/05/2026 10:02" },
      { deEtapa: "Lead", etapa: "Sondagem", data: "21/05/2026 14:35", responsavel: "Carlos" },
    ],
    notas: [
      { id: "n2", autor: "Carlos", texto: "Já tem CNPJ. Volume mensal estimado em R$ 3.000.", data: "21/05/2026" },
      { id: "n3", autor: "Carlos", texto: "Ligar na quinta-feira após as 14h.", data: "22/05/2026" },
    ],
  },
}

export const MOCK_CARDS_ENTRADA: CardLead[] = [
  {
    id: "1",
    contato: { nome: "Padaria do Bairro", telefone: "+55 11 99001-1234" },
    etapa: "lead",
    atendente: null,
    tempoNaEtapa: "1 dia",
    dataEntradaEtapa: "28/05/2026",
    tempoNoFunil: "1 dia",
    etiquetas: [{ id: "novo", nome: "Novo cliente", cor: "#3b82f6" }],
    conversaId: null,
  },
  {
    id: "2",
    contato: { nome: "Maria Conceição", telefone: "+55 85 89011-1234" },
    etapa: "lead",
    atendente: null,
    tempoNaEtapa: "3 dias",
    dataEntradaEtapa: "26/05/2026",
    tempoNoFunil: "3 dias",
    etiquetas: [],
    conversaId: null,
  },
  {
    id: "3",
    contato: { nome: "Armazém do Zé", telefone: "+55 71 83017-7890" },
    etapa: "lead",
    atendente: "Carlos",
    tempoNaEtapa: "2 dias",
    dataEntradaEtapa: "27/05/2026",
    tempoNoFunil: "2 dias",
    etiquetas: [{ id: "indicacao", nome: "Indicação", cor: "#8b5cf6" }],
    conversaId: null,
  },
  {
    id: "4",
    contato: { nome: "Mercadinho da Esquina", telefone: "+55 31 90010-0123" },
    etapa: "sondagem",
    atendente: "Carlos",
    tempoNaEtapa: "5 dias",
    dataEntradaEtapa: "24/05/2026",
    tempoNoFunil: "1 semana",
    etiquetas: [{ id: "novo", nome: "Novo cliente", cor: "#3b82f6" }],
    conversaId: null,
  },
  {
    id: "5",
    contato: { nome: "Hortifruti da Vila", telefone: "+55 11 86014-4567" },
    etapa: "sondagem",
    atendente: "Fernanda",
    tempoNaEtapa: "1 semana",
    dataEntradaEtapa: "22/05/2026",
    tempoNoFunil: "1 semana",
    etiquetas: [],
    conversaId: null,
  },
  {
    id: "6",
    contato: { nome: "Empório São Jorge", telefone: "+55 41 88012-2345" },
    etapa: "catalogo_enviado",
    atendente: "Fernanda",
    tempoNaEtapa: "3 dias",
    dataEntradaEtapa: "26/05/2026",
    tempoNoFunil: "2 semanas",
    etiquetas: [{ id: "vip", nome: "VIP", cor: "#f59e0b" }],
    conversaId: null,
  },
  {
    id: "7",
    contato: { nome: "Roberto Alves", telefone: "+55 21 92008-8901" },
    etapa: "catalogo_enviado",
    atendente: "Carlos",
    tempoNaEtapa: "6 dias",
    dataEntradaEtapa: "23/05/2026",
    tempoNoFunil: "2 semanas",
    etiquetas: [],
    conversaId: null,
  },
  {
    id: "8",
    contato: { nome: "Supermercado Família", telefone: "+55 62 85015-5678" },
    etapa: "negociacao",
    atendente: "Fernanda",
    tempoNaEtapa: "4 dias",
    dataEntradaEtapa: "25/05/2026",
    tempoNoFunil: "3 semanas",
    etiquetas: [{ id: "vip", nome: "VIP", cor: "#f59e0b" }],
    conversaId: null,
  },
  {
    id: "9",
    contato: { nome: "Distribuidora Norte", telefone: "+55 92 94006-6789" },
    etapa: "negociacao",
    atendente: "Carlos",
    tempoNaEtapa: "2 semanas",
    dataEntradaEtapa: "15/05/2026",
    tempoNoFunil: "1 mês",
    etiquetas: [{ id: "vip", nome: "VIP", cor: "#f59e0b" }, { id: "novo", nome: "Novo cliente", cor: "#3b82f6" }],
    conversaId: null,
  },
  {
    id: "10",
    contato: { nome: "Loja do Bairro", telefone: "+55 47 80020-0123" },
    etapa: "ganho",
    atendente: "Fernanda",
    tempoNaEtapa: "1 dia",
    dataEntradaEtapa: "28/05/2026",
    tempoNoFunil: "3 semanas",
    etiquetas: [],
    conversaId: null,
  },
]
