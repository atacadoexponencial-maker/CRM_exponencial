// Motor de sequências (Módulo 4): inicia execuções por gatilho automático ou
// manual, processa etapas vencidas (mensagem automática via WhatsApp ou
// lembrete na Agenda do vendedor) e avança a execução quando um lembrete é
// concluído. Roda no backend com service client e nunca propaga erro para o
// fluxo que disparou o gatilho.

import { createServiceClient } from "@/integrations/supabase/service"
import { enviarTextoWhatsApp, buscarConversaAberta } from "@/lib/whatsapp-envio"

export type GatilhoSequencia = "card_lead" | "catalogo_enviado" | "onboarding" | "inativo"

export type SequenceStepRow = {
  id: string
  ordem: number
  tipo: "mensagem" | "lembrete"
  prazo_dias: number
  conteudo: string | null
  instrucao: string | null
}

type ServiceClient = ReturnType<typeof createServiceClient>

// ── Helpers puros (testáveis) ─────────────────────────────────────────

export function substituirVariaveis(
  texto: string,
  contexto: { nomeContato: string; nomeVendedor: string }
): string {
  return texto
    .replaceAll("{{nome_contato}}", contexto.nomeContato)
    .replaceAll("{{nome_vendedor}}", contexto.nomeVendedor)
}

export function calcularProximaExecucao(base: Date, prazoDias: number): Date {
  const proxima = new Date(base)
  proxima.setDate(proxima.getDate() + prazoDias)
  return proxima
}

// ── Início de execução ───────────────────────────────────────────────

export async function iniciarExecucaoSequencia(
  supabase: ServiceClient,
  params: {
    workspaceId: string
    sequenceId: string
    contactId: string
    atendenteId: string | null
  }
): Promise<{ erro?: string }> {
  // Não inicia a mesma sequência duas vezes enquanto há execução em andamento
  const { data: existente } = await supabase
    .from("sequence_runs")
    .select("id")
    .eq("sequence_id", params.sequenceId)
    .eq("contact_id", params.contactId)
    .eq("status", "em_andamento")
    .maybeSingle()

  if (existente) return { erro: "Esta sequência já está em andamento para este contato" }

  const { data: primeiraEtapa } = await supabase
    .from("sequence_steps")
    .select("prazo_dias")
    .eq("sequence_id", params.sequenceId)
    .order("ordem")
    .limit(1)
    .maybeSingle()

  if (!primeiraEtapa) return { erro: "Sequência sem etapas" }

  const { error } = await supabase.from("sequence_runs").insert({
    workspace_id: params.workspaceId,
    sequence_id: params.sequenceId,
    contact_id: params.contactId,
    atendente_id: params.atendenteId,
    status: "em_andamento",
    etapa_atual: 0,
    proxima_execucao: calcularProximaExecucao(new Date(), primeiraEtapa.prazo_dias).toISOString(),
  })

  if (error) return { erro: "Não foi possível iniciar a sequência" }
  return {}
}

// ── Gatilho automático (chamado pelo pipeline) ───────────────────────

export async function processarGatilhoSequencia(params: {
  workspaceId: string
  contactId: string | null
  atendenteId: string | null
  gatilho: GatilhoSequencia
}): Promise<void> {
  try {
    if (!params.contactId) return
    const supabase = createServiceClient()

    const { data: sequencias } = await supabase
      .from("sequences")
      .select("id")
      .eq("workspace_id", params.workspaceId)
      .eq("gatilho", params.gatilho)
      .eq("ativa", true)

    for (const seq of sequencias ?? []) {
      await iniciarExecucaoSequencia(supabase, {
        workspaceId: params.workspaceId,
        sequenceId: seq.id,
        contactId: params.contactId,
        atendenteId: params.atendenteId,
      })
    }
  } catch {
    // Gatilho de sequência nunca derruba o fluxo principal
  }
}

// ── Processamento das etapas vencidas ────────────────────────────────

async function resolverAtendente(
  supabase: ServiceClient,
  workspaceId: string,
  contactId: string,
  atendenteId: string | null
): Promise<string | null> {
  if (atendenteId) return atendenteId

  // Fallback: responsável pela conversa aberta, senão o primeiro admin
  const conversaId = await buscarConversaAberta(supabase, workspaceId, contactId)
  if (conversaId) {
    const { data: conversa } = await supabase
      .from("conversations")
      .select("assigned_to")
      .eq("id", conversaId)
      .single()
    if (conversa?.assigned_to) return conversa.assigned_to
  }

  const { data: admin } = await supabase
    .from("profiles")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("role", "admin")
    .eq("status", "active")
    .limit(1)
    .maybeSingle()

  return admin?.id ?? null
}

export async function processarSequenciasPendentes(): Promise<number> {
  const supabase = createServiceClient()
  const agora = new Date().toISOString()

  const { data: runs } = await supabase
    .from("sequence_runs")
    .select("id, workspace_id, sequence_id, contact_id, atendente_id, etapa_atual")
    .eq("status", "em_andamento")
    .not("proxima_execucao", "is", null)
    .lte("proxima_execucao", agora)
    .limit(50)

  let processadas = 0

  for (const run of runs ?? []) {
    try {
      const { data: stepsData } = await supabase
        .from("sequence_steps")
        .select("id, ordem, tipo, prazo_dias, conteudo, instrucao")
        .eq("sequence_id", run.sequence_id)
        .order("ordem")

      const steps = (stepsData ?? []) as SequenceStepRow[]
      const step = steps[run.etapa_atual]

      if (!step) {
        await supabase
          .from("sequence_runs")
          .update({ status: "concluida", proxima_execucao: null, finished_at: agora })
          .eq("id", run.id)
        continue
      }

      if (step.tipo === "mensagem") {
        const [{ data: contato }, { data: vendedor }] = await Promise.all([
          supabase.from("contacts").select("name, phone_number").eq("id", run.contact_id).single(),
          run.atendente_id
            ? supabase.from("profiles").select("name").eq("id", run.atendente_id).single()
            : Promise.resolve({ data: null }),
        ])

        const texto = substituirVariaveis(step.conteudo ?? "", {
          nomeContato: contato?.name ?? contato?.phone_number ?? "",
          nomeVendedor: (vendedor as { name?: string } | null)?.name ?? "",
        })

        if (texto.trim()) {
          await enviarTextoWhatsApp(supabase, run.workspace_id, run.contact_id, texto)
        }

        // Agenda a próxima etapa (mensagens não bloqueiam a execução)
        const proxima = steps[run.etapa_atual + 1]
        await supabase
          .from("sequence_runs")
          .update(
            proxima
              ? {
                  etapa_atual: run.etapa_atual + 1,
                  proxima_execucao: calcularProximaExecucao(new Date(), proxima.prazo_dias).toISOString(),
                }
              : { status: "concluida", proxima_execucao: null, finished_at: agora }
          )
          .eq("id", run.id)
      } else {
        // Lembrete: cria item na Agenda e pausa a execução até ser marcado como feito
        const atendenteId = await resolverAtendente(
          supabase,
          run.workspace_id,
          run.contact_id,
          run.atendente_id
        )

        if (atendenteId) {
          await supabase.from("reminders").insert({
            workspace_id: run.workspace_id,
            contact_id: run.contact_id,
            atendente_id: atendenteId,
            origem: "sequencia",
            sequence_run_id: run.id,
            instrucao: step.instrucao ?? "Executar etapa da sequência",
            due_at: agora,
          })
        }

        await supabase
          .from("sequence_runs")
          .update({ etapa_atual: run.etapa_atual + 1, proxima_execucao: null })
          .eq("id", run.id)
      }

      processadas++
    } catch {
      // Falha em uma execução não interrompe as demais
    }
  }

  return processadas
}

// ── Avanço após lembrete concluído ───────────────────────────────────

export async function avancarAposLembrete(sequenceRunId: string): Promise<void> {
  try {
    const supabase = createServiceClient()
    const agora = new Date().toISOString()

    const { data: run } = await supabase
      .from("sequence_runs")
      .select("id, sequence_id, etapa_atual, status")
      .eq("id", sequenceRunId)
      .single()

    if (!run || run.status !== "em_andamento") return

    const { data: stepsData } = await supabase
      .from("sequence_steps")
      .select("prazo_dias, ordem")
      .eq("sequence_id", run.sequence_id)
      .order("ordem")

    const proxima = (stepsData ?? [])[run.etapa_atual]

    await supabase
      .from("sequence_runs")
      .update(
        proxima
          ? { proxima_execucao: calcularProximaExecucao(new Date(), proxima.prazo_dias).toISOString() }
          : { status: "concluida", proxima_execucao: null, finished_at: agora }
      )
      .eq("id", run.id)
  } catch {
    // nunca propaga
  }
}

// ── Sequências pré-definidas do método ───────────────────────────────

const PREDEFINIDAS: Array<{
  nome: string
  gatilho: GatilhoSequencia
  etapas: Array<Omit<SequenceStepRow, "id" | "ordem">>
}> = [
  {
    nome: "Qualificação",
    gatilho: "card_lead",
    etapas: [
      {
        tipo: "mensagem",
        prazo_dias: 0,
        conteudo:
          "Olá {{nome_contato}}! Aqui é {{nome_vendedor}}. Recebemos seu contato — me conta um pouco sobre o seu negócio para eu te atender melhor?",
        instrucao: null,
      },
      {
        tipo: "lembrete",
        prazo_dias: 1,
        conteudo: null,
        instrucao: "Verificar se o lead respondeu e qualificar (tipo de negócio, volume de compra)",
      },
      {
        tipo: "mensagem",
        prazo_dias: 2,
        conteudo:
          "Oi {{nome_contato}}, tudo bem? Ainda quer conhecer nossas condições para lojistas? Estou à disposição!",
        instrucao: null,
      },
    ],
  },
  {
    nome: "Pós-catálogo",
    gatilho: "catalogo_enviado",
    etapas: [
      {
        tipo: "mensagem",
        prazo_dias: 1,
        conteudo:
          "Oi {{nome_contato}}! Conseguiu dar uma olhada no catálogo? Qualquer dúvida sobre preços ou pedido mínimo é só chamar.",
        instrucao: null,
      },
      {
        tipo: "lembrete",
        prazo_dias: 2,
        conteudo: null,
        instrucao: "Perguntar se o cliente já analisou o catálogo e oferecer ajuda na montagem do primeiro pedido",
      },
    ],
  },
  {
    nome: "Onboarding",
    gatilho: "onboarding",
    etapas: [
      {
        tipo: "mensagem",
        prazo_dias: 0,
        conteudo:
          "{{nome_contato}}, seu pedido foi confirmado! 🎉 Qualquer coisa que precisar, fala comigo por aqui.",
        instrucao: null,
      },
      {
        tipo: "lembrete",
        prazo_dias: 7,
        conteudo: null,
        instrucao: "Perguntar como foi a chegada do primeiro pedido e se o produto está girando bem",
      },
    ],
  },
  {
    nome: "Reativação",
    gatilho: "inativo",
    etapas: [
      {
        tipo: "mensagem",
        prazo_dias: 0,
        conteudo:
          "Oi {{nome_contato}}, sentimos sua falta por aqui! Temos novidades no catálogo que têm tudo a ver com o seu público. Quer dar uma olhada?",
        instrucao: null,
      },
      {
        tipo: "lembrete",
        prazo_dias: 3,
        conteudo: null,
        instrucao: "Ligar ou mandar áudio para o cliente inativo — entender por que parou de comprar",
      },
    ],
  },
]

export async function garantirSequenciasPredefinidas(workspaceId: string): Promise<void> {
  try {
    const supabase = createServiceClient()

    const { count } = await supabase
      .from("sequences")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("predefinida", true)

    if ((count ?? 0) > 0) return

    for (const def of PREDEFINIDAS) {
      const { data: seq } = await supabase
        .from("sequences")
        .insert({
          workspace_id: workspaceId,
          nome: def.nome,
          gatilho: def.gatilho,
          predefinida: true,
          ativa: true,
        })
        .select("id")
        .single()

      if (!seq) continue

      await supabase.from("sequence_steps").insert(
        def.etapas.map((e, i) => ({
          sequence_id: seq.id,
          ordem: i,
          tipo: e.tipo,
          prazo_dias: e.prazo_dias,
          conteudo: e.conteudo,
          instrucao: e.instrucao,
        }))
      )
    }
  } catch {
    // seed é oportunista — falha silenciosa
  }
}
