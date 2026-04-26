"use server"

import { createClient as createSsrClient } from "@/integrations/supabase/server"

export async function criarTime(nome: string): Promise<{ erro?: string }> {
  const nomeTrimado = nome.trim()
  if (!nomeTrimado) return { erro: "Nome é obrigatório" }

  const ssrClient = await createSsrClient()
  const { data: { user } } = await ssrClient.auth.getUser()
  if (!user) return { erro: "Não autorizado" }

  const { data: perfil } = await ssrClient
    .from("profiles")
    .select("role, workspace_id")
    .eq("id", user.id)
    .single()

  if (perfil?.role !== "admin") return { erro: "Sem permissão" }

  const workspaceId: string = perfil.workspace_id

  const { data: existente } = await ssrClient
    .from("teams")
    .select("id")
    .eq("workspace_id", workspaceId)
    .ilike("name", nomeTrimado)
    .maybeSingle()

  if (existente) return { erro: "Já existe um time com esse nome" }

  const { error } = await ssrClient
    .from("teams")
    .insert({ workspace_id: workspaceId, name: nomeTrimado, is_default: false })

  if (error) return { erro: "Não foi possível criar o time. Tente novamente." }

  return {}
}

export async function editarNomeTime(timeId: string, novoNome: string): Promise<{ erro?: string }> {
  const nomeTrimado = novoNome.trim()
  if (!nomeTrimado) return { erro: "Nome é obrigatório" }

  const ssrClient = await createSsrClient()
  const { data: { user } } = await ssrClient.auth.getUser()
  if (!user) return { erro: "Não autorizado" }

  const { data: perfil } = await ssrClient
    .from("profiles")
    .select("role, workspace_id")
    .eq("id", user.id)
    .single()

  if (perfil?.role !== "admin") return { erro: "Sem permissão" }

  const workspaceId: string = perfil.workspace_id

  const { data: time } = await ssrClient
    .from("teams")
    .select("is_default")
    .eq("id", timeId)
    .eq("workspace_id", workspaceId)
    .maybeSingle()

  if (!time) return { erro: "Time não encontrado" }
  if (time.is_default) return { erro: "Não é possível editar times padrão" }

  const { data: duplicado } = await ssrClient
    .from("teams")
    .select("id")
    .eq("workspace_id", workspaceId)
    .ilike("name", nomeTrimado)
    .neq("id", timeId)
    .maybeSingle()

  if (duplicado) return { erro: "Já existe um time com esse nome" }

  const { error } = await ssrClient
    .from("teams")
    .update({ name: nomeTrimado })
    .eq("id", timeId)
    .eq("workspace_id", workspaceId)
    .eq("is_default", false)

  if (error) return { erro: "Não foi possível salvar. Tente novamente." }

  return {}
}

export async function excluirTime(timeId: string): Promise<{ erro?: string }> {
  const ssrClient = await createSsrClient()
  const { data: { user } } = await ssrClient.auth.getUser()
  if (!user) return { erro: "Não autorizado" }

  const { data: perfil } = await ssrClient
    .from("profiles")
    .select("role, workspace_id")
    .eq("id", user.id)
    .single()

  if (perfil?.role !== "admin") return { erro: "Sem permissão" }

  const workspaceId: string = perfil.workspace_id

  const { data: time } = await ssrClient
    .from("teams")
    .select("is_default")
    .eq("id", timeId)
    .eq("workspace_id", workspaceId)
    .maybeSingle()

  if (!time) return { erro: "Time não encontrado" }
  if (time.is_default) return { erro: "Não é possível excluir times padrão" }

  const { error } = await ssrClient
    .from("teams")
    .delete()
    .eq("id", timeId)
    .eq("workspace_id", workspaceId)
    .eq("is_default", false)

  if (error) return { erro: "Não foi possível excluir o time. Tente novamente." }

  return {}
}

export async function listarUsuariosDoWorkspace(): Promise<{ id: string; name: string }[]> {
  const ssrClient = await createSsrClient()
  const { data: { user } } = await ssrClient.auth.getUser()
  if (!user) return []

  const { data: perfil } = await ssrClient
    .from("profiles")
    .select("workspace_id")
    .eq("id", user.id)
    .single()

  if (!perfil) return []

  const { data: usuarios } = await ssrClient
    .from("profiles")
    .select("id, name")
    .eq("workspace_id", perfil.workspace_id)
    .order("name")

  return (usuarios ?? []).map((u) => ({ id: u.id, name: u.name }))
}

export async function gerenciarMembrosTime(
  timeId: string,
  usuariosIds: string[]
): Promise<{ erro?: string }> {
  const ssrClient = await createSsrClient()
  const { data: { user } } = await ssrClient.auth.getUser()
  if (!user) return { erro: "Não autorizado" }

  const { data: perfil } = await ssrClient
    .from("profiles")
    .select("role, workspace_id")
    .eq("id", user.id)
    .single()

  if (perfil?.role !== "admin") return { erro: "Sem permissão" }

  const workspaceId: string = perfil.workspace_id

  const { data: time } = await ssrClient
    .from("teams")
    .select("id")
    .eq("id", timeId)
    .eq("workspace_id", workspaceId)
    .maybeSingle()

  if (!time) return { erro: "Time não encontrado" }

  const { error: deleteError } = await ssrClient
    .from("user_teams")
    .delete()
    .eq("team_id", timeId)

  if (deleteError) return { erro: "Não foi possível salvar. Tente novamente." }

  if (usuariosIds.length > 0) {
    const novasAssociacoes = usuariosIds.map((userId) => ({ user_id: userId, team_id: timeId }))
    const { error: insertError } = await ssrClient.from("user_teams").insert(novasAssociacoes)
    if (insertError) return { erro: "Não foi possível salvar. Tente novamente." }
  }

  return {}
}

export type MembroTime = {
  id: string
  name: string
}

export type TimeListado = {
  id: string
  name: string
  isDefault: boolean
  membros: MembroTime[]
}

export async function listarTimes(): Promise<TimeListado[]> {
  const ssrClient = await createSsrClient()
  const { data: { user } } = await ssrClient.auth.getUser()
  if (!user) return []

  const { data: times } = await ssrClient
    .from("teams")
    .select("id, name, is_default, user_teams(profiles(id, name))")
    .order("is_default", { ascending: false })
    .order("name")

  if (!times) return []

  return times.map((t) => ({
    id: t.id,
    name: t.name,
    isDefault: t.is_default,
    membros: ((t.user_teams ?? []) as unknown as { profiles: { id: string; name: string } | null }[])
      .map((ut) => ut.profiles)
      .filter((p): p is { id: string; name: string } => p !== null),
  }))
}
