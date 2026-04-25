"use server"

import { createClient } from "@supabase/supabase-js"

export async function verificarEmailEmUso(email: string): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data, error } = await supabase.auth.admin.getUserByEmail(email)

  if (error) {
    if (error.message.toLowerCase().includes("not found")) return false
    throw new Error("Erro ao verificar e-mail")
  }

  return !!data.user
}
