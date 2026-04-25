"use server"

import { createClient } from "@supabase/supabase-js"

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
