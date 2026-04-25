"use server"

import { createClient as createSsrClient } from "@/integrations/supabase/server"

export async function realizarLogin(email: string, senha: string): Promise<void> {
  const supabase = await createSsrClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
  if (error) throw new Error("Credenciais inválidas")
}
