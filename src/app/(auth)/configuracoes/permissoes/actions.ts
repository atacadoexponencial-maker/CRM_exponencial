"use server"

// B63-02: o que Atendente e Gerente veem é escolha do Admin. O que a escolha faz fica
// no banco (B63-01, `alcance_do_usuario`); aqui só se lê e grava a escolha da empresa.

import { revalidatePath } from "next/cache"
import { sessaoAtual } from "@/lib/sessao"
import { createServiceClient } from "@/integrations/supabase/service"
import { ALCANCES, type Alcance } from "@/lib/alcance"

export type Permissoes = { atendente: Alcance; gerente: Alcance }

const valido = (v: unknown): v is Alcance => (ALCANCES as readonly unknown[]).includes(v)

/** A escolha atual da empresa de quem está logado. Só para o Admin; para os outros, null. */
export async function carregarPermissoes(): Promise<Permissoes | null> {
  const { supabase, user, perfil } = await sessaoAtual()
  if (!user || perfil?.role !== "admin") return null

  const { data } = await supabase
    .from("workspaces")
    .select("alcance_atendente, alcance_gerente")
    .eq("id", perfil.workspace_id)
    .maybeSingle()
  return {
    atendente: valido(data?.alcance_atendente) ? data.alcance_atendente : "atribuidos",
    gerente: valido(data?.alcance_gerente) ? data.alcance_gerente : "todos",
  }
}

export async function salvarPermissoes(escolha: Permissoes): Promise<{ erro?: string }> {
  const { user, perfil } = await sessaoAtual()
  if (!user || perfil?.role !== "admin") return { erro: "Sem permissão" }
  if (!valido(escolha?.atendente) || !valido(escolha?.gerente)) return { erro: "Escolha uma das opções." }

  // `workspaces` não tem política de update: a conferência de quem pode é a de cima
  const { error } = await createServiceClient()
    .from("workspaces")
    .update({ alcance_atendente: escolha.atendente, alcance_gerente: escolha.gerente })
    .eq("id", perfil.workspace_id)
  if (error) return { erro: "Não foi possível salvar as permissões. Tente novamente." }

  // Chat, Contatos, Pipeline e o menu leem o que cada um vê na próxima carga
  revalidatePath("/", "layout")
  return {}
}
