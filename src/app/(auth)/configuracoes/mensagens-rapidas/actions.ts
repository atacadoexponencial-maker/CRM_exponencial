"use server"

import { sessaoAtual } from "@/lib/sessao"
import { escaparLike } from "@/lib/escapar-like"
import { avisoDeSemReserva } from "@/lib/variaveis-mensagem"

const ATALHO_MAXIMO = 40
const CONTEUDO_MAXIMO = 2000

/** QA M19/M20 (06/10): atalho limpo, com limite, sem repetir na empresa; conteúdo com limite. */
async function conferirMensagemRapida(
  supabase: Awaited<ReturnType<typeof sessaoAtual>>["supabase"],
  workspaceId: string,
  titulo: string,
  conteudo: string,
  ignorarId?: string
): Promise<{ erro: string } | { titulo: string; conteudo: string }> {
  const atalho = titulo.trim()
  const texto = conteudo.trim()
  if (!atalho) return { erro: "Informe o atalho." }
  if (atalho.length > ATALHO_MAXIMO) return { erro: `O atalho passa de ${ATALHO_MAXIMO} caracteres.` }
  if (!texto) return { erro: "Escreva a mensagem." }
  if (texto.length > CONTEUDO_MAXIMO) return { erro: `A mensagem passa de ${CONTEUDO_MAXIMO} caracteres.` }
  // B38-05: toda variável tem texto reserva (CA-B38-63)
  const semReserva = avisoDeSemReserva(texto)
  if (semReserva) return { erro: semReserva }
  let q = supabase.from("quick_replies").select("id").eq("workspace_id", workspaceId).ilike("title", escaparLike(atalho))
  if (ignorarId) q = q.neq("id", ignorarId)
  const { data } = await q.limit(1).maybeSingle()
  if (data) return { erro: "Já existe uma mensagem rápida com esse atalho." }
  return { titulo: atalho, conteudo: texto }
}
import { redirect } from "next/navigation"

export type MensagemRapidaListada = {
  id: string
  titulo: string
  conteudo: string
}

export async function listarMensagensRapidas(): Promise<MensagemRapidaListada[]> {
  const { supabase, perfil } = await sessaoAtual()

  if (!perfil || perfil.role !== "admin") redirect("/perfil?motivo=sem-permissao")

  const { data } = await supabase
    .from("quick_replies")
    .select("id, title, content")
    .eq("workspace_id", perfil.workspace_id)
    .order("created_at", { ascending: true })

  if (!data) return []

  return data.map((r) => ({ id: r.id, titulo: r.title, conteudo: r.content }))
}

export async function criarMensagemRapida(
  titulo: string,
  conteudo: string
): Promise<{ mensagem?: MensagemRapidaListada; erro?: string }> {
  const { supabase, perfil } = await sessaoAtual()

  if (!perfil || perfil.role !== "admin") return { erro: "Sem permissão" }

  const conferida = await conferirMensagemRapida(supabase, perfil.workspace_id, titulo, conteudo)
  if ("erro" in conferida) return { erro: conferida.erro }

  const { data, error } = await supabase
    .from("quick_replies")
    .insert({ title: conferida.titulo, content: conferida.conteudo, workspace_id: perfil.workspace_id })
    .select("id, title, content")
    .single()

  if (error || !data) return { erro: "Não foi possível criar a mensagem. Tente novamente." }

  return { mensagem: { id: data.id, titulo: data.title, conteudo: data.content } }
}

export async function editarMensagemRapida(
  id: string,
  titulo: string,
  conteudo: string
): Promise<{ erro?: string }> {
  const { supabase, perfil } = await sessaoAtual()

  if (!perfil || perfil.role !== "admin") return { erro: "Sem permissão" }

  const conferida = await conferirMensagemRapida(supabase, perfil.workspace_id, titulo, conteudo, id)
  if ("erro" in conferida) return { erro: conferida.erro }

  const { error } = await supabase
    .from("quick_replies")
    .update({ title: conferida.titulo, content: conferida.conteudo })
    .eq("id", id)
    .eq("workspace_id", perfil.workspace_id)

  if (error) return { erro: "Não foi possível editar a mensagem. Tente novamente." }

  return {}
}

export async function excluirMensagemRapida(id: string): Promise<{ erro?: string }> {
  const { supabase, perfil } = await sessaoAtual()

  if (!perfil || perfil.role !== "admin") return { erro: "Sem permissão" }

  const { error } = await supabase
    .from("quick_replies")
    .delete()
    .eq("id", id)
    .eq("workspace_id", perfil.workspace_id)

  if (error) return { erro: "Não foi possível excluir a mensagem. Tente novamente." }

  return {}
}
