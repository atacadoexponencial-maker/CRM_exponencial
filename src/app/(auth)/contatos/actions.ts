"use server"

import { createClient } from "@/integrations/supabase/server"
import type { Contato } from "./mock-contatos"

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
      .select("id, name, phone_number")
      .eq("workspace_id", profile.workspace_id)
      .order("name")

    return (data ?? []).map((c) => ({
      id: c.id,
      nome: c.name ?? c.phone_number,
      telefone: c.phone_number,
      classificacao: "sem_historico" as const,
      tipo: null,
      nicho: null,
      cidade: null,
      atendente: null,
    }))
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
    .select("id, name, phone_number")
    .in("id", contactIds)
    .order("name")

  return (data ?? []).map((c) => ({
    id: c.id,
    nome: c.name ?? c.phone_number,
    telefone: c.phone_number,
    classificacao: "sem_historico" as const,
    tipo: null,
    nicho: null,
    cidade: null,
    atendente: null,
  }))
}
