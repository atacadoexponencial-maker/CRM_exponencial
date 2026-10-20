"use server"

import { createClient } from "@/integrations/supabase/server"
import { escaparLike } from "@/lib/escapar-like"

const NOME_DE_ETIQUETA_MAXIMO = 30

/** QA M19/M20 (06/10): nome limpo, com limite, e sem repetir na empresa (sem diferença de maiúscula). */
async function conferirNomeDeEtiqueta(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceId: string,
  nome: string,
  ignorarId?: string
): Promise<{ erro: string } | { nome: string }> {
  const limpo = nome.trim()
  if (!limpo) return { erro: "Informe o nome da etiqueta." }
  if (limpo.length > NOME_DE_ETIQUETA_MAXIMO) return { erro: `O nome passa de ${NOME_DE_ETIQUETA_MAXIMO} caracteres.` }
  let q = supabase.from("labels").select("id").eq("workspace_id", workspaceId).ilike("name", escaparLike(limpo))
  if (ignorarId) q = q.neq("id", ignorarId)
  const { data } = await q.limit(1).maybeSingle()
  if (data) return { erro: "Já existe uma etiqueta com esse nome." }
  return { nome: limpo }
}
import { sessaoAtual } from "@/lib/sessao"

export type EtiquetaListada = {
  id: string
  nome: string
  cor: string
  conversas: number
}

export async function listarEtiquetas(): Promise<EtiquetaListada[]> {
  const { supabase, user, perfil } = await sessaoAtual()
  if (!user) return []

  if (perfil?.role !== "admin") return []

  const { data } = await supabase
    .from("labels")
    .select("id, name, color, conversation_labels(conversation_id)")
    .eq("workspace_id", perfil.workspace_id)
    .order("name")

  if (!data) return []

  return data.map((l) => ({
    id: l.id,
    nome: l.name,
    cor: l.color,
    conversas: (l.conversation_labels ?? []).length,
  }))
}

export async function criarEtiqueta(
  nome: string,
  cor: string
): Promise<{ etiqueta?: EtiquetaListada; erro?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: "Não autorizado" }

  const { data: perfil } = await supabase
    .from("profiles")
    .select("role, workspace_id")
    .eq("id", user.id)
    .single()

  if (perfil?.role !== "admin") return { erro: "Sem permissão" }

  const conferido = await conferirNomeDeEtiqueta(supabase, perfil.workspace_id, nome)
  if ("erro" in conferido) return { erro: conferido.erro }

  const { data, error } = await supabase
    .from("labels")
    .insert({ name: conferido.nome, color: cor, workspace_id: perfil.workspace_id })
    .select("id, name, color")
    .single()

  if (error || !data) return { erro: "Não foi possível criar a etiqueta. Tente novamente." }

  return {
    etiqueta: { id: data.id, nome: data.name, cor: data.color, conversas: 0 },
  }
}

export async function editarEtiqueta(
  id: string,
  nome: string,
  cor: string
): Promise<{ erro?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: "Não autorizado" }

  const { data: perfil } = await supabase
    .from("profiles")
    .select("role, workspace_id")
    .eq("id", user.id)
    .single()

  if (perfil?.role !== "admin") return { erro: "Sem permissão" }

  const conferido = await conferirNomeDeEtiqueta(supabase, perfil.workspace_id, nome, id)
  if ("erro" in conferido) return { erro: conferido.erro }

  const { error } = await supabase
    .from("labels")
    .update({ name: conferido.nome, color: cor })
    .eq("id", id)
    .eq("workspace_id", perfil.workspace_id)

  if (error) return { erro: "Não foi possível editar a etiqueta. Tente novamente." }

  return {}
}

export async function excluirEtiqueta(id: string): Promise<{ erro?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: "Não autorizado" }

  const { data: perfil } = await supabase
    .from("profiles")
    .select("role, workspace_id")
    .eq("id", user.id)
    .single()

  if (perfil?.role !== "admin") return { erro: "Sem permissão" }

  const { error } = await supabase
    .from("labels")
    .delete()
    .eq("id", id)
    .eq("workspace_id", perfil.workspace_id)

  if (error) return { erro: "Não foi possível excluir a etiqueta. Tente novamente." }

  return {}
}
