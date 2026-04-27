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
