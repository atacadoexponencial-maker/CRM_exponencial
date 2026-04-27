"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/integrations/supabase/server"

export async function editarNomePerfil(
  nome: string
): Promise<{ erro?: string }> {
  const nomeTrimado = nome.trim()
  if (!nomeTrimado) return { erro: "O nome não pode ser vazio." }

  const ssrClient = await createClient()
  const { data: { user } } = await ssrClient.auth.getUser()
  if (!user) return { erro: "Não autorizado" }

  const { error } = await ssrClient
    .from("profiles")
    .update({ name: nomeTrimado })
    .eq("id", user.id)

  if (error) return { erro: "Não foi possível salvar. Tente novamente." }

  revalidatePath("/perfil")
  return {}
}

export async function alterarSenha(
  senhaAtual: string,
  novaSenha: string,
  confirmarSenha: string
): Promise<{ erro?: string }> {
  if (novaSenha !== confirmarSenha) return { erro: "As senhas não coincidem." }

  const ssrClient = await createClient()
  const { data: { user } } = await ssrClient.auth.getUser()
  if (!user || !user.email) return { erro: "Não autorizado" }

  const { error: signInError } = await ssrClient.auth.signInWithPassword({
    email: user.email,
    password: senhaAtual,
  })

  if (signInError) return { erro: "Senha atual incorreta." }

  const { error: updateError } = await ssrClient.auth.updateUser({
    password: novaSenha,
  })

  if (updateError) return { erro: "Não foi possível alterar a senha. Tente novamente." }

  return {}
}
