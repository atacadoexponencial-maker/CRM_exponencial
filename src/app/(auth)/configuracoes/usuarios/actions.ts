"use server"

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { sessaoAtual } from "@/lib/sessao"

/** B44-02: Admin pode dar qualquer um dos três papéis, inclusive Admin. */
export type Papel = "admin" | "gerente" | "atendente"
const PAPEIS: Papel[] = ["admin", "gerente", "atendente"]
const DONO_PROTEGIDO = "O dono da empresa não pode ser alterado"

type ClienteDeServico = SupabaseClient

/** B44-02: quem criou a empresa só muda pelo suporte (`workspaces.dono_id`). */
async function ehDonoDaEmpresa(adminClient: ClienteDeServico, workspaceId: string, usuarioId: string) {
  const { data } = await adminClient.from("workspaces").select("dono_id").eq("id", workspaceId).single()
  return (data as { dono_id: string | null } | null)?.dono_id === usuarioId
}

/** B44-02: todos os times pedidos são da empresa do Admin. */
async function timesSaoDaEmpresa(adminClient: ClienteDeServico, workspaceId: string, timesIds: string[]) {
  if (timesIds.length === 0) return true
  const { data } = await adminClient.from("teams").select("id").eq("workspace_id", workspaceId).in("id", timesIds)
  return (data ?? []).length === new Set(timesIds).size
}

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
  const { supabase: ssrClient, user, perfil } = await sessaoAtual()
  if (!user) return []

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
    // QA M8 (06/10): o PostgREST devolve `teams` como objeto (relação N:1), não lista.
    times: (p.user_teams ?? [])
      .map((ut: { team_id: string; teams: { name: string } | { name: string }[] | null }) =>
        Array.isArray(ut.teams) ? (ut.teams[0]?.name ?? "") : (ut.teams?.name ?? "")
      )
      .filter(Boolean),
    timesIds: (p.user_teams ?? [])
      .map((ut: { team_id: string; teams: { name: string }[] | null }) => ut.team_id)
      .filter(Boolean),
  }))
}

export async function editarPapel(
  usuarioId: string,
  novoPapel: Papel
): Promise<{ erro?: string }> {
  const ssrClient = await createSsrClient()
  const { data: { user } } = await ssrClient.auth.getUser()
  if (!user) return { erro: "Não autorizado" }

  if (user.id === usuarioId) return { erro: "Você não pode alterar o próprio papel" }
  if (!PAPEIS.includes(novoPapel)) return { erro: "Papel inválido" }

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

  if (await ehDonoDaEmpresa(adminClient, perfil.workspace_id, usuarioId)) return { erro: DONO_PROTEGIDO }

  const { data: alterado, error } = await adminClient
    .from("profiles")
    .update({ role: novoPapel })
    .eq("id", usuarioId)
    .eq("workspace_id", perfil.workspace_id)
    .select("id")
    .maybeSingle()

  if (error || !alterado) return { erro: "Não foi possível alterar o papel. Tente novamente." }

  return {}
}

export async function adicionarUsuario(data: {
  nome: string
  email: string
  senha: string
  papel: Papel
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

  // QA M14 (06/10): o servidor confere nome, papel e times, não só a tela.
  const nome = data.nome.trim()
  if (!nome) return { erro: "Informe o nome do usuário." }
  if (nome.length > 80) return { erro: "O nome passa de 80 caracteres." }
  if (!PAPEIS.includes(data.papel)) return { erro: "Papel inválido" }
  if (!Array.isArray(data.times) || data.times.some((t) => typeof t !== "string")) return { erro: "Times inválidos" }
  // B44-02: só times da própria empresa, conferido antes de criar o login.
  if (!(await timesSaoDaEmpresa(adminClient, workspaceId, data.times))) return { erro: "Times inválidos" }

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
    .insert({ id: userId, workspace_id: workspaceId, name: nome, role: data.papel })

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

  const { data: reativado, error } = await adminClient
    .from("profiles")
    .update({ status: "active" })
    .eq("id", usuarioId)
    .eq("workspace_id", perfil.workspace_id)
    .select("id")
    .maybeSingle()

  if (error || !reativado) return { erro: "Não foi possível reativar o usuário. Tente novamente." }

  // B20-02: tira o ban do Auth. Se falhar, volta a inativo para não ficar meio-reativado.
  const { error: banError } = await adminClient.auth.admin.updateUserById(usuarioId, { ban_duration: "none" })
  if (banError) {
    await adminClient.from("profiles").update({ status: "inactive" }).eq("id", usuarioId)
    return { erro: "Não foi possível reativar o usuário. Tente novamente." }
  }

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

  if (await ehDonoDaEmpresa(adminClient, perfil.workspace_id, usuarioId)) return { erro: DONO_PROTEGIDO }

  const { data: desativado, error } = await adminClient
    .from("profiles")
    .update({ status: "inactive" })
    .eq("id", usuarioId)
    .eq("workspace_id", perfil.workspace_id)
    .select("id")
    .maybeSingle()

  if (error || !desativado) return { erro: "Não foi possível desativar o usuário. Tente novamente." }

  // B20-02: bane no Auth — derruba login, renovação da sessão e getUser na hora. O
  // banco já fecha os dados para perfil inativo (o token antigo vale até expirar).
  const { error: banError } = await adminClient.auth.admin.updateUserById(usuarioId, { ban_duration: "876000h" })
  if (banError) return { erro: "Não foi possível desativar o usuário. Tente novamente." }

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

  // B44-02: o usuário e cada time pedido precisam ser da empresa do Admin. O gatilho
  // do banco só exige usuário e time da mesma empresa entre si, não a do Admin.
  if (!Array.isArray(timesIds) || timesIds.some((t) => typeof t !== "string")) return { erro: "Times inválidos" }
  const { data: usuarioDaEmpresa } = await adminClient
    .from("profiles")
    .select("id")
    .eq("id", usuarioId)
    .eq("workspace_id", workspaceId)
    .maybeSingle()
  if (!usuarioDaEmpresa || !(await timesSaoDaEmpresa(adminClient, workspaceId, timesIds))) {
    return { erro: "Usuário ou time não encontrado nesta empresa." }
  }

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
