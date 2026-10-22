// B36-04: cálculo puro dos blocos novos do Dashboard (faixa de números com variação,
// funil de Entrada em barras, "Para hoje" e "Esperando resposta"). Sem banco: o
// carregamento fica em src/app/(auth)/dashboard/actions.ts.

import { FUSO_DA_OPERACAO } from "@/lib/datas"
import type { CardRow, MetricasDashboard, RangePeriodo } from "@/lib/metricas-dashboard"

/** O período de mesmo tamanho logo antes do escolhido, para comparar. */
export function rangeAnterior(range: RangePeriodo): RangePeriodo {
  const duracao = range.fim.getTime() - range.inicio.getTime()
  const fim = new Date(range.inicio.getTime() - 1)
  return { inicio: new Date(fim.getTime() - duracao), fim }
}

/** Variação de um número: `%` sobre o anterior, ou pontos percentuais (`pp`) para taxas. */
export type Variacao = { valor: number; unidade: "%" | "pp" } | null

export type VariacoesDashboard = {
  totalCompras: Variacao
  quantidadeCompras: Variacao
  ticketMedioGeral: Variacao
  novosLeads: Variacao
  taxaRecompra: Variacao
}

function percentual(atual: number | null, anterior: number | null): Variacao {
  if (atual === null || anterior === null || anterior === 0) return null
  return { valor: Math.round(((atual - anterior) / anterior) * 100), unidade: "%" }
}

function pontos(atual: number | null, anterior: number | null): Variacao {
  if (atual === null || anterior === null) return null
  return { valor: Math.round(atual - anterior), unidade: "pp" }
}

export function calcularVariacoes(atual: MetricasDashboard, anterior: MetricasDashboard): VariacoesDashboard {
  return {
    totalCompras: percentual(atual.receita.totalCompras, anterior.receita.totalCompras),
    quantidadeCompras: percentual(atual.receita.quantidadeCompras, anterior.receita.quantidadeCompras),
    ticketMedioGeral: percentual(atual.receita.ticketMedioGeral, anterior.receita.ticketMedioGeral),
    novosLeads: percentual(atual.entrada.novosLeads, anterior.entrada.novosLeads),
    taxaRecompra: pontos(atual.recompra.taxaRecompra, anterior.recompra.taxaRecompra),
  }
}

export type EtapaComQuantidade = { id: string; label: string; quantidade: number }

/** Quantos cards há agora em cada etapa do funil, na ordem do funil, com as vazias. */
export function contarCardsPorEtapa(
  cards: Pick<CardRow, "funil" | "etapa">[],
  etapas: readonly { id: string; label: string }[],
  funil: string
): EtapaComQuantidade[] {
  const contagem = new Map<string, number>()
  for (const c of cards) if (c.funil === funil) contagem.set(c.etapa, (contagem.get(c.etapa) ?? 0) + 1)
  return etapas.map((e) => ({ id: e.id, label: e.label, quantidade: contagem.get(e.id) ?? 0 }))
}

/** Último instante de hoje no fuso da operação (Brasília). */
export function fimDeHoje(agora: Date = new Date()): Date {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: FUSO_DA_OPERACAO, year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(agora)
      .map((p) => [p.type, p.value])
  )
  // Brasília não tem horário de verão desde 2019: UTC-3 o ano todo.
  return new Date(`${partes.year}-${partes.month}-${partes.day}T23:59:59.999-03:00`)
}

/** Tarefas atrasadas e de hoje, as atrasadas primeiro. As de amanhã em diante ficam de fora. */
export function filtrarParaHoje<T extends { dueAt: string }>(
  itens: T[],
  agora: Date = new Date()
): Array<T & { atrasado: boolean }> {
  const limite = fimDeHoje(agora).getTime()
  return itens
    .filter((i) => new Date(i.dueAt).getTime() <= limite)
    .map((i) => ({ ...i, atrasado: new Date(i.dueAt).getTime() < agora.getTime() }))
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
}

/** "agora", "12 min", "3 h", "2 dias": há quanto tempo o cliente espera. */
export function tempoDeEspera(desde: string, agora: Date = new Date()): string {
  const minutos = Math.max(0, Math.floor((agora.getTime() - new Date(desde).getTime()) / 60000))
  if (minutos < 1) return "agora"
  if (minutos < 60) return `${minutos} min`
  const horas = Math.floor(minutos / 60)
  if (horas < 24) return `${horas} h`
  const dias = Math.floor(horas / 24)
  return dias === 1 ? "1 dia" : `${dias} dias`
}

/** Cabeçalho do Dashboard: "Terça, 21 de outubro" e "Bom dia, Ana". */
export function cabecalhoDoDia(nome: string, agora: Date = new Date()): { data: string; saudacao: string } {
  const data = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO_DA_OPERACAO, weekday: "long", day: "numeric", month: "long" }).format(agora)
  const hora = Number(new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO_DA_OPERACAO, hour: "numeric", hourCycle: "h23" }).format(agora))
  const cumprimento = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite"
  const primeiroNome = nome.trim().split(/\s+/)[0]
  return {
    data: data.charAt(0).toUpperCase() + data.slice(1).replace("-feira", ""),
    saudacao: primeiroNome ? `${cumprimento}, ${primeiroNome}` : cumprimento,
  }
}
