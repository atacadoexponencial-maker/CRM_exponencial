"use server"

// B48-14: o fuso da empresa. Só o Admin troca, e vale para todos da empresa.

import { revalidatePath } from "next/cache"
import { sessaoAtual } from "@/lib/sessao"
import { createServiceClient } from "@/integrations/supabase/service"
import { FUSOS_DO_BRASIL } from "@/lib/datas"

export async function salvarFuso(fuso: string): Promise<{ erro?: string }> {
  const { user, perfil } = await sessaoAtual()
  if (!user || perfil?.role !== "admin") return { erro: "Sem permissão" }
  if (!FUSOS_DO_BRASIL.some((f) => f.id === fuso)) return { erro: "Escolha um dos fusos da lista." }

  // `workspaces` não tem política de update: a conferência de quem pode é a de cima
  const { error } = await createServiceClient().from("workspaces").update({ fuso }).eq("id", perfil.workspace_id)
  if (error) return { erro: "Não foi possível salvar o fuso. Tente novamente." }

  // Todas as telas leem o fuso no layout
  revalidatePath("/", "layout")
  return {}
}
