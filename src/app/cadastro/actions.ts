"use server"

import { createClient } from "@supabase/supabase-js"
import { createClient as createSsrClient } from "@/integrations/supabase/server"

export async function verificarEmailEmUso(email: string): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })

  if (error) throw new Error("Erro ao verificar e-mail")

  return data.users.some((u) => u.email === email)
}

export async function criarWorkspace(nomeEmpresa: string): Promise<string> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data, error } = await supabase
    .from("workspaces")
    .insert({ name: nomeEmpresa })
    .select("id")
    .single()

  if (error) throw new Error("Erro ao criar workspace")

  return data.id
}

export async function criarAdminETimesPadrao(
  workspaceId: string,
  nomeResponsavel: string,
  email: string,
  senha: string
): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const adminClient = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: userData, error: userError } = await adminClient.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
  })
  if (userError) throw new Error("Erro ao criar usuário")

  const userId = userData.user.id

  const { error: profileError } = await adminClient
    .from("profiles")
    .insert({ id: userId, workspace_id: workspaceId, name: nomeResponsavel, role: "admin" })
  if (profileError) throw new Error("Erro ao criar perfil")

  const { error: teamsError } = await adminClient
    .from("teams")
    .insert([
      { workspace_id: workspaceId, name: "Expansão", is_default: true },
      { workspace_id: workspaceId, name: "Retenção", is_default: true },
    ])
  if (teamsError) throw new Error("Erro ao criar times padrão")

  const ssrClient = await createSsrClient()
  const { error: signInError } = await ssrClient.auth.signInWithPassword({ email, password: senha })
  if (signInError) throw new Error("Erro ao autenticar usuário")
}
