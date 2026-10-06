"use server"

import { redirect } from "next/navigation"
import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { AVISO_CONTA_DESATIVADA } from "./avisos"

/**
 * Login feito no servidor, ao lado do banco: uma única ida do navegador.
 *
 * Em sucesso, os cookies da sessão e a página de destino voltam na mesma
 * resposta (`redirect` dentro da action). O destino sai do papel, para quem não
 * é admin não passar por `/configuracoes/whatsapp` só para ser mandado a
 * `/perfil`.
 */
export async function realizarLogin(email: string, senha: string): Promise<{ erro: string }> {
  const supabase = await createSsrClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha })
  // B20-02: usuário desativado é banido no Auth.
  if (error?.code === "user_banned") return { erro: AVISO_CONTA_DESATIVADA }
  if (error || !data.user) return { erro: "E-mail ou senha incorretos" }

  const { data: perfil } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single()

  // Perfil inativo não aparece para o próprio usuário (RLS): conta desativada.
  if (!perfil) {
    await supabase.auth.signOut()
    return { erro: AVISO_CONTA_DESATIVADA }
  }

  redirect(perfil?.role === "admin" ? "/configuracoes/whatsapp" : "/perfil")
}
