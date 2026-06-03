"use server"

import { createClient } from "@/integrations/supabase/server"
import type { Contato, ClassificacaoContato, TipoContato } from "./mock-contatos"

const CONTACT_SELECT = "id, name, phone_number, classificacao, tipo, nicho, cidade, created_at, profiles!contacts_atendente_id_fkey(name)"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapContato(c: any): Contato {
  return {
    id: c.id,
    nome: c.name ?? c.phone_number,
    telefone: c.phone_number,
    classificacao: (c.classificacao ?? "sem_historico") as ClassificacaoContato,
    tipo: (c.tipo ?? null) as TipoContato | null,
    nicho: c.nicho ?? null,
    cidade: c.cidade ?? null,
    atendente: c.profiles?.name ?? null,
    created_at: c.created_at,
  }
}

export async function criarContato(dados: {
  nome: string
  telefone: string
  tipo?: string | null
  nicho?: string | null
  cidade?: string | null
}): Promise<{ erro?: string; id?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: "Não autenticado" }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, workspace_id")
    .eq("id", user.id)
    .single()

  if (!profile) return { erro: "Perfil não encontrado" }
  if (profile.role === "atendente") return { erro: "Sem permissão para criar contatos" }

  const { data, error } = await supabase
    .from("contacts")
    .insert({
      workspace_id: profile.workspace_id,
      phone_number: dados.telefone,
      name: dados.nome,
      tipo: dados.tipo ?? null,
      nicho: dados.nicho ?? null,
      cidade: dados.cidade ?? null,
    })
    .select("id")
    .single()

  if (error) {
    if (error.code === "23505") return { erro: "Número já cadastrado neste workspace" }
    return { erro: "Erro ao criar contato. Tente novamente." }
  }

  return { id: data.id }
}

export async function listarContatos(): Promise<Contato[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, workspace_id")
    .eq("id", user.id)
    .single()

  if (!profile) return []

  if (profile.role === "admin" || profile.role === "gerente") {
    const { data } = await supabase
      .from("contacts")
      .select(CONTACT_SELECT)
      .eq("workspace_id", profile.workspace_id)
      .order("name")

    return (data ?? []).map(mapContato)
  }

  // Atendente: filtra por conversas e cards atribuídos
  const [{ data: convData }, { data: cardData }] = await Promise.all([
    supabase
      .from("conversations")
      .select("contact_id")
      .eq("assigned_to", user.id),
    supabase
      .from("pipeline_cards")
      .select("contact_id")
      .eq("atendente_id", user.id),
  ])

  const contactIds = Array.from(new Set([
    ...(convData ?? []).map((c) => c.contact_id as string),
    ...(cardData ?? []).map((c) => c.contact_id as string),
  ]))

  if (contactIds.length === 0) return []

  const { data } = await supabase
    .from("contacts")
    .select(CONTACT_SELECT)
    .in("id", contactIds)
    .order("name")

  return (data ?? []).map(mapContato)
}
