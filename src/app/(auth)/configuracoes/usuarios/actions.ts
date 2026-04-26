"use server"

import { createClient } from "@supabase/supabase-js"
import { createClient as createSsrClient } from "@/integrations/supabase/server"

export type UsuarioListado = {
  id: string
  name: string
  email: string
  role: string
  status: string
  times: string[]
  timesIds: string[]
}

export async function listarUsuarios(): Promise<UsuarioListado[]> {
  const ssrClient = await createSsrClient()
  const { data: { user } } = await ssrClient.auth.getUser()
  if (!user) return []

  const { data: perfil } = await ssrClient
    .from("profiles")
    .select("role, workspace_id")
    .eq("id", user.id)
    .single()

  if (perfil?.role !== "admin") return []

  const workspaceId: string = perfil.workspace_id

  const { data: profiles } = await ssrClient
    .from("profiles")
    .select("id, name, role, status, user_teams(team_id, teams(name))")
    .eq("workspace_id", workspaceId)
    .order("name")

  if (!profiles || profiles.length === 0) return []

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const adminClient = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const userIds = profiles.map((p) => p.id)
  const { data: authData } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const emailMap = new Map(
    (authData?.users ?? [])
      .filter((u) => userIds.includes(u.id))
      .map((u) => [u.id, u.email ?? ""])
  )

  return profiles.map((p) => ({
    id: p.id,
    name: p.name,
    email: emailMap.get(p.id) ?? "",
    role: p.role,
    status: p.status,
    times: (p.user_teams ?? [])
      .map((ut: { team_id: string; teams: { name: string }[] | null }) => ut.teams?.[0]?.name ?? "")
      .filter(Boolean),
    timesIds: (p.user_teams ?? [])
      .map((ut: { team_id: string; teams: { name: string }[] | null }) => ut.team_id)
      .filter(Boolean),
  }))
}

export async function editarPapel(
  usuarioId: string,
  novoPapel: "gerente" | "atendente"
): Promise<{ erro?: string }> {
  const ssrClient = await createSsrClient()
  const { data: { user } } = await ssrClient.auth.getUser()
  if (!user) return { erro: "Não autorizado" }

  if (user.id === usuarioId) return { erro: "Você não pode alterar o próprio papel" }

  const { data: perfil } = await ssrClient
    .from("profiles")
    .select("role, workspace_id")
    .eq("id", user.id)
    .single()

  if (perfil?.role !== "admin") return { erro: "Sem permissão" }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const adminClient = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { error } = await adminClient
    .from("profiles")
    .update({ role: novoPapel })
    .eq("id", usuarioId)
    .eq("workspace_id", perfil.workspace_id)

  if (error) return { erro: "Não foi possível alterar o papel. Tente novamente." }

  return {}
}

export async function adicionarUsuario(data: {
  nome: string
  email: string
  senha: string
  papel: "gerente" | "atendente"
  times: string[]
}): Promise<{ erro?: string }> {
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

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const adminClient = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: userData, error: userError } = await adminClient.auth.admin.createUser({
    email: data.email,
    password: data.senha,
    email_confirm: true,
  })

  if (userError) {
    if (userError.message.toLowerCase().includes("already")) {
      return { erro: "E-mail já está em uso" }
    }
    return { erro: "Não foi possível criar o usuário. Tente novamente." }
  }

  const userId = userData.user.id

  const { error: profileError } = await adminClient
    .from("profiles")
    .insert({ id: userId, workspace_id: workspaceId, name: data.nome, role: data.papel })

  if (profileError) {
    return { erro: "Não foi possível criar o usuário. Tente novamente." }
  }

  if (data.times.length > 0) {
    const userTeams = data.times.map((teamId) => ({ user_id: userId, team_id: teamId }))
    await adminClient.from("user_teams").insert(userTeams)
  }

  return {}
}

export async function reativarUsuario(
  usuarioId: string
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

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const adminClient = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { error } = await adminClient
    .from("profiles")
    .update({ status: "active" })
    .eq("id", usuarioId)
    .eq("workspace_id", perfil.workspace_id)

  if (error) return { erro: "Não foi possível reativar o usuário. Tente novamente." }

  return {}
}

export async function desativarUsuario(
  usuarioId: string
): Promise<{ erro?: string }> {
  const ssrClient = await createSsrClient()
  const { data: { user } } = await ssrClient.auth.getUser()
  if (!user) return { erro: "Não autorizado" }

  if (user.id === usuarioId) return { erro: "Você não pode desativar a si mesmo" }

  const { data: perfil } = await ssrClient
    .from("profiles")
    .select("role, workspace_id")
    .eq("id", user.id)
    .single()

  if (perfil?.role !== "admin") return { erro: "Sem permissão" }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const adminClient = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { error } = await adminClient
    .from("profiles")
    .update({ status: "inactive" })
    .eq("id", usuarioId)
    .eq("workspace_id", perfil.workspace_id)

  if (error) return { erro: "Não foi possível desativar o usuário. Tente novamente." }

  return {}
}

export async function gerenciarTimes(
  usuarioId: string,
  timesIds: string[]
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

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const adminClient = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: timesDoWorkspace } = await adminClient
    .from("teams")
    .select("id")
    .eq("workspace_id", workspaceId)

  const teamIds = (timesDoWorkspace ?? []).map((t: { id: string }) => t.id)

  if (teamIds.length > 0) {
    const { error: deleteError } = await adminClient
      .from("user_teams")
      .delete()
      .eq("user_id", usuarioId)
      .in("team_id", teamIds)

    if (deleteError) return { erro: "Não foi possível salvar os times. Tente novamente." }
  }

  if (timesIds.length > 0) {
    const novasAssociacoes = timesIds.map((teamId) => ({ user_id: usuarioId, team_id: teamId }))
    const { error: insertError } = await adminClient.from("user_teams").insert(novasAssociacoes)
    if (insertError) return { erro: "Não foi possível salvar os times. Tente novamente." }
  }

  return {}
}
