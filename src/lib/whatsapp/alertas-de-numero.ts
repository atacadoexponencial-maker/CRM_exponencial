// Alertas de número na central de alertas (B4-03).
//
// **Por que persistir em vez de derivar:** a central de hoje calcula os alertas
// na leitura, a partir de `pipeline_cards` (`src/lib/alertas.ts`). Derivar
// alerta de número do mesmo jeito exigiria chamar o gateway a cada abertura de
// `/alertas` — a página passaria a depender de rede e a ficar lenta, e um
// número banido enquanto o gateway está fora do ar não apareceria. Os eventos
// já chegam pelo webhook (B6) e a tabela `operational_alerts` já existe desde
// a B6-04; aqui ela ganha os dois tipos que faltavam.
//
// Um aberto por conexão e tipo: reentrega do mesmo evento, ou risco que
// continua alto a cada leitura da tela, não enche a central de linhas iguais.

import type { createServiceClient } from "@/integrations/supabase/service"

type ServiceClient = ReturnType<typeof createServiceClient>

/** Tipos de alerta que nascem de um número, não de um card de pipeline. */
export const TIPO_ALERTA_RISCO_ALTO = "risco_alto"
export const TIPO_ALERTA_DESCONECTADO = "numero_desconectado"
export const TIPO_ALERTA_BANIDO = "numero_banido"

export type TipoAlertaDeNumero =
  | "numero_freado"
  | typeof TIPO_ALERTA_RISCO_ALTO
  | typeof TIPO_ALERTA_DESCONECTADO
  | typeof TIPO_ALERTA_BANIDO

/**
 * Abre um alerta, se não houver outro igual em aberto.
 *
 * Select-e-insert em vez de `upsert`: o índice único de `operational_alerts` é
 * **parcial** (`where resolved_at is null`), e `ON CONFLICT` não infere índice
 * parcial. A corrida entre duas leituras simultâneas cai no `23505`, que é
 * ignorado de propósito — o alerta já existe, que é o resultado desejado.
 */
export async function abrirAlertaDeNumero({
  supabase,
  workspaceId,
  connectionId,
  tipo,
  motivo,
}: {
  supabase: ServiceClient
  workspaceId: string
  connectionId: string
  tipo: TipoAlertaDeNumero
  motivo?: string | null
}): Promise<{ aberto: boolean }> {
  const { data: existente } = await supabase
    .from("operational_alerts")
    .select("id")
    .eq("connection_id", connectionId)
    .eq("tipo", tipo)
    .is("resolved_at", null)
    .maybeSingle()

  if (existente) return { aberto: false }

  const { error } = await supabase.from("operational_alerts").insert({
    workspace_id: workspaceId,
    connection_id: connectionId,
    tipo,
    motivo: motivo ?? null,
  })

  // 23505: outra leitura abriu o mesmo alerta entre o select e o insert.
  if (error && error.code !== "23505") return { aberto: false }
  return { aberto: !error }
}

/** Fecha os alertas abertos de um tipo. Condição que passou não vira alerta novo. */
export async function resolverAlertaDeNumero({
  supabase,
  connectionId,
  tipos,
}: {
  supabase: ServiceClient
  connectionId: string
  tipos: TipoAlertaDeNumero[]
}): Promise<void> {
  await supabase
    .from("operational_alerts")
    .update({ resolved_at: new Date().toISOString() })
    .eq("connection_id", connectionId)
    .in("tipo", tipos)
    .is("resolved_at", null)
}

/**
 * Reflete o nível de risco na central: alto abre, qualquer outro fecha.
 *
 * Chamado quando a saúde é lida (B4-02). **Limitação declarada:** enquanto
 * ninguém abrir a tela de saúde daquele número, o risco alto não vira alerta.
 * Fechar isso exige verificação periódica, e o projeto ainda não tem cron com
 * segredo configurado — é issue própria, não desta.
 */
export async function refletirRiscoNaCentral({
  supabase,
  workspaceId,
  connectionId,
  nivel,
  razaoPrincipal,
}: {
  supabase: ServiceClient
  workspaceId: string
  connectionId: string
  nivel: "baixo" | "medio" | "alto"
  razaoPrincipal?: string
}): Promise<void> {
  if (nivel === "alto") {
    await abrirAlertaDeNumero({
      supabase,
      workspaceId,
      connectionId,
      tipo: TIPO_ALERTA_RISCO_ALTO,
      motivo: razaoPrincipal ?? null,
    })
    return
  }

  await resolverAlertaDeNumero({ supabase, connectionId, tipos: [TIPO_ALERTA_RISCO_ALTO] })
}

/**
 * Reflete o estado da conexão na central (B4-03).
 *
 * Chamado quando o evento `instance.state` chega (B6-04). Banido e
 * desconectado são alertas diferentes: desconectado se resolve relendo o QR,
 * banido não se resolve — e misturar os dois faria o cliente tentar reconectar
 * um número perdido.
 *
 * `connecting` não fecha o alerta de desconexão: o gateway tenta reconectar
 * sozinho, e fechar aí faria o alerta piscar a cada tentativa.
 */
export async function refletirEstadoNaCentral({
  supabase,
  workspaceId,
  connectionId,
  estado,
  motivo,
}: {
  supabase: ServiceClient
  workspaceId: string
  connectionId: string
  estado: string
  motivo?: string | null
}): Promise<void> {
  if (estado === "banned") {
    await resolverAlertaDeNumero({ supabase, connectionId, tipos: [TIPO_ALERTA_DESCONECTADO] })
    await abrirAlertaDeNumero({
      supabase,
      workspaceId,
      connectionId,
      tipo: TIPO_ALERTA_BANIDO,
      motivo: motivo ?? null,
    })
    return
  }

  if (estado === "disconnected") {
    await abrirAlertaDeNumero({
      supabase,
      workspaceId,
      connectionId,
      tipo: TIPO_ALERTA_DESCONECTADO,
      motivo: motivo ?? null,
    })
    return
  }

  if (estado === "connected") {
    // Voltou: desconexão e risco alto deixam de valer. Banimento não se
    // resolve por reconexão — se o número voltou, o gateway manda `connected`
    // e o alerta de banido some junto, porque o fato mudou.
    await resolverAlertaDeNumero({
      supabase,
      connectionId,
      tipos: [TIPO_ALERTA_DESCONECTADO, TIPO_ALERTA_BANIDO],
    })
  }
}

export type AlertaDeNumero = {
  id: string
  tipo: TipoAlertaDeNumero
  motivo: string | null
  mensagensParadas: number | null
  criadoEm: string
  connectionId: string | null
  /** Número, quando conhecido; senão o nome de exibição ou nada. */
  numero: string | null
  nomeExibicao: string | null
}

type LinhaDeAlerta = {
  id: string
  tipo: string
  motivo: string | null
  queued_count: number | null
  created_at: string
  connection_id: string | null
  conexao: { phone_number: string | null; display_name: string | null } | null
}

/** O mínimo que a leitura precisa de um cliente Supabase. */
export type BancoDeAlertas = {
  from(tabela: string): {
    select(colunas: string): {
      eq(
        coluna: string,
        valor: string
      ): {
        is(
          coluna: string,
          valor: null
        ): {
          order(
            coluna: string,
            opcoes: { ascending: boolean }
          ): Promise<{ data: LinhaDeAlerta[] | null }>
        }
      }
    }
  }
}

/**
 * Alertas de número em aberto do workspace, mais recentes primeiro.
 *
 * Lido com o cliente do usuário: a RLS de `operational_alerts` já restringe ao
 * workspace, e alerta de número não é segredo dentro da empresa.
 */
export async function listarAlertasDeNumero(
  supabase: BancoDeAlertas,
  workspaceId: string
): Promise<AlertaDeNumero[]> {
  const { data } = await supabase
    .from("operational_alerts")
    .select(
      "id, tipo, motivo, queued_count, created_at, connection_id, conexao:whatsapp_connections!connection_id(phone_number, display_name)"
    )
    .eq("workspace_id", workspaceId)
    .is("resolved_at", null)
    .order("created_at", { ascending: false })

  return (data ?? []).map((linha) => ({
    id: linha.id,
    tipo: linha.tipo as TipoAlertaDeNumero,
    motivo: linha.motivo,
    mensagensParadas: linha.queued_count,
    criadoEm: linha.created_at,
    connectionId: linha.connection_id,
    numero: linha.conexao?.phone_number ?? null,
    nomeExibicao: linha.conexao?.display_name ?? null,
  }))
}
