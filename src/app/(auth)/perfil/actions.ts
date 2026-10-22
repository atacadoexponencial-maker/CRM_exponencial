"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createClient } from "@/integrations/supabase/server"
import { COOKIE_TEMA, OPCOES_COOKIE_TEMA, type Tema } from "@/lib/tema"

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
  // QA baixos (06/10): o Auth recusava a senha curta com erro genérico.
  if (novaSenha.length < 8) return { erro: "A nova senha precisa ter pelo menos 8 caracteres." }

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

/**
 * B36-01: grava o tema escolhido no perfil (vale em qualquer aparelho) e no cookie
 * que o layout raiz lê para já mandar a página no tema certo.
 */
export async function trocarTema(tema: Tema): Promise<{ erro?: string }> {
  if (tema !== "claro" && tema !== "escuro") return { erro: "Tema inválido." }

  const ssrClient = await createClient()
  const { data: { user } } = await ssrClient.auth.getUser()
  if (!user) return { erro: "Não autorizado" }

  const { error } = await ssrClient.from("profiles").update({ tema }).eq("id", user.id)
  if (error) return { erro: "Não foi possível trocar o tema. Tente novamente." }

  ;(await cookies()).set(COOKIE_TEMA, tema, OPCOES_COOKIE_TEMA)
  return {}
}

export async function realizarLogout() {
  const ssrClient = await createClient()
  await ssrClient.auth.signOut()
  // B36-01: o próximo login grava o tema de quem entrar.
  ;(await cookies()).delete(COOKIE_TEMA)
  redirect("/login")
}
