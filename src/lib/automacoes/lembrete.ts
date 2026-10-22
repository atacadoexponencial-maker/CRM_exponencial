// Ação "criar lembrete na Agenda" (B28-01). Substitui a etapa de lembrete das
// sequências, que saem na B28-06: grava em `reminders` um item que aparece na
// Agenda de quem vai fazer, com o contato, o texto e o vencimento.
//
// Quem recebe: a pessoa escolhida no bloco ou, no padrão, o responsável pela
// conversa do contato. Sem responsável (ou com um desativado), vai para o
// primeiro admin ativo da empresa, que é o que a sequência fazia
// (`resolverAtendente`, em src/lib/sequencias.ts). A pessoa escolhida no bloco
// não tem essa reserva: se foi desativada, a ação falha com o motivo, como o
// "atribuir atendente" (B22-02), porque o admin escolheu alguém de propósito.
//
// O texto aceita as variáveis das mensagens, trocadas como no envio (`envio.ts`).
// O lembrete guarda uma cópia do nome da regra, como o histórico das execuções.
// Decisões: pre-desenvolvimento/decisoes/B11-automacoes-em-fluxo.md, seção 33.

import { vencimentoDoLembrete, type Parametros, type ResultadoAcao } from "@/lib/fluxo-automacao"
import { conversaDoEvento, type ContextoDaExecucao } from "./contexto"
import { preencherVariaveis } from "./envio"

const falhou = (motivo: string): ResultadoAcao => ({ ok: false, motivo })
const ERRO_NO_BANCO = falhou("Erro ao gravar no banco")

const MS_POR_UNIDADE = { horas: 3_600_000, dias: 86_400_000 } as const

export async function criarLembrete(
  contexto: ContextoDaExecucao,
  contactId: string,
  parametros: Parametros
): Promise<ResultadoAcao> {
  const { supabase, gatilho } = contexto
  const texto = (parametros.texto ?? "").trim()
  const vencimento = vencimentoDoLembrete(parametros)
  if (!texto || !vencimento) return falhou("A ação está sem configuração")

  const destino = parametros.responsavel_id
    ? await pessoaEscolhida(contexto, parametros.responsavel_id)
    : await responsavelOuAdmin(contexto)
  if ("motivo" in destino) return falhou(destino.motivo)

  const { error } = await supabase.from("reminders").insert({
    workspace_id: gatilho.workspaceId,
    contact_id: contactId,
    atendente_id: destino.id,
    origem: "automacao",
    automacao_nome: contexto.regra?.nome ?? null,
    instrucao: await preencherVariaveis(contexto, contactId, texto),
    due_at: new Date(Date.now() + vencimento.quantidade * MS_POR_UNIDADE[vencimento.unidade]).toISOString(),
  })
  return error ? ERRO_NO_BANCO : { ok: true }
}

type Destino = { id: string } | { motivo: string }

async function pessoaEscolhida({ supabase, gatilho }: ContextoDaExecucao, id: string): Promise<Destino> {
  const { data: perfil, error } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", id)
    .eq("workspace_id", gatilho.workspaceId)
    .maybeSingle()
  if (error) return { motivo: "Erro ao consultar o banco" }
  if (!perfil) return { motivo: "A pessoa escolhida não existe mais" }
  return perfil.status === "active" ? { id } : { motivo: "A pessoa escolhida está desativada" }
}

async function responsavelOuAdmin(contexto: ContextoDaExecucao): Promise<Destino> {
  const { supabase, gatilho } = contexto
  const conversaId = await conversaDoEvento(contexto)
  if (conversaId) {
    const { data: conversa } = await supabase.from("conversations").select("assigned_to").eq("id", conversaId).maybeSingle()
    if (conversa?.assigned_to) {
      const responsavel = await pessoaEscolhida(contexto, conversa.assigned_to)
      if ("id" in responsavel) return responsavel
    }
  }

  const { data: admin, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("workspace_id", gatilho.workspaceId)
    .eq("role", "admin")
    .eq("status", "active")
    .order("created_at")
    .limit(1)
    .maybeSingle()
  if (error) return { motivo: "Erro ao consultar o banco" }
  return admin ? { id: admin.id } : { motivo: "Ninguém para receber o lembrete: a empresa não tem admin ativo" }
}
