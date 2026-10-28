// B43-03: gatilho "Entrou no perfil RFV". A rotina roda uma vez em cada hora do dia
// (24 rotinas diárias da Vercel, PER-B43-05) e faz duas coisas:
//
// 1. A conferência: a partir das 3h (Brasília), a primeira chamada do dia compara o
//    perfil da hora de cada contato com o da conferência anterior e anota quem mudou
//    (`conferir_perfis_rfv`, no banco; uma vez por dia por empresa).
// 2. O disparo da hora: para as mudanças da conferência mais recente de cada empresa,
//    roda as automações cujo horário é a hora atual. Antes das 3h, a mais recente é a
//    da véspera: o horário 0h, 1h ou 2h dispara na madrugada seguinte (SUP-B43-01).
//    O motor marca cada mudança por automação, então a rotina repetida não dispara
//    de novo (`disparos_perfil_rfv`).

import { createServiceClient } from "@/integrations/supabase/service"
import { gatilhoDoFluxo, horaDoGatilho } from "@/lib/fluxo-automacao"
import { hojeNoFuso } from "@/lib/relatorios/visao-geral"
import { lerFluxo } from "./fluxo-recebido"
import { processarAutomacoes } from "./index"
import { FUSO_DA_OPERACAO } from "@/lib/datas"

/** A partir desta hora (Brasília) a conferência do dia pode rodar. */
export const HORA_DA_CONFERENCIA = 3

/** Tempo da função da rotina, com folga: depois dele nenhuma regra começa. */
const ORCAMENTO_MS = 240_000

const HORA_NO_FUSO = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Sao_Paulo", hour: "2-digit", hourCycle: "h23" })

/** A hora (0–23) em Brasília. */
export function horaNoFuso(agora: Date): number {
  return Number(HORA_NO_FUSO.format(agora))
}

/**
 * A conferência do dia, se já passou das 3h. Devolve quantas mudanças anotou, ou null
 * quando ainda é cedo. `workspaceId` limita a uma empresa (os testes).
 */
export async function conferirPerfisRfv(agora = new Date(), workspaceId?: string): Promise<number | null> {
  if (horaNoFuso(agora) < HORA_DA_CONFERENCIA) return null
  const { data, error } = await createServiceClient().rpc("conferir_perfis_rfv", {
    p_dia: hojeNoFuso(FUSO_DA_OPERACAO, agora),
    ...(workspaceId ? { p_workspace: workspaceId } : {}),
  })
  if (error) throw error
  return data ?? 0
}

/** O disparo da hora. Devolve quantas mudanças foram levadas ao motor. */
export async function dispararPerfisRfv(agora = new Date(), workspaceId?: string): Promise<number> {
  const supabase = createServiceClient()
  const hora = horaNoFuso(agora)
  const prazo = Date.now() + ORCAMENTO_MS

  // Só as empresas com alguma automação ligada para esta hora
  let consulta = supabase.from("automation_flows").select("workspace_id, fluxo").eq("gatilho_tipo", "entrou_perfil_rfv").eq("ativa", true)
  if (workspaceId) consulta = consulta.eq("workspace_id", workspaceId)
  const { data: regras, error } = await consulta
  if (error) throw error
  const empresas = new Set(
    (regras ?? [])
      .filter((r) => {
        const fluxo = lerFluxo(r.fluxo)
        const gatilho = fluxo ? gatilhoDoFluxo(fluxo) : undefined
        return gatilho ? horaDoGatilho(gatilho.parametros) === hora : false
      })
      .map((r) => r.workspace_id)
  )

  let levadas = 0
  for (const empresa of empresas) {
    const { data: conferencia } = await supabase.from("conferencias_perfil_rfv").select("dia").eq("workspace_id", empresa).maybeSingle()
    if (!conferencia) continue
    const { data: mudancas } = await supabase
      .from("mudancas_perfil_rfv")
      .select("id, contact_id, de, para")
      .eq("workspace_id", empresa)
      .eq("dia", conferencia.dia)
      .order("created_at")
    for (const m of mudancas ?? []) {
      if (Date.now() >= prazo) return levadas
      await processarAutomacoes(
        { tipo: "entrou_perfil_rfv", workspaceId: empresa, contactId: m.contact_id, mudancaId: m.id, de: m.de, para: m.para, hora },
        { prazo }
      )
      levadas++
    }
  }
  return levadas
}

/** O que cada rotina da hora faz: a conferência (se for a hora) e o disparo. */
export async function rodarRotinaPerfilRfv(agora = new Date()): Promise<{ anotadas: number | null; levadas: number }> {
  const anotadas = await conferirPerfisRfv(agora)
  const levadas = await dispararPerfisRfv(agora)
  return { anotadas, levadas }
}
