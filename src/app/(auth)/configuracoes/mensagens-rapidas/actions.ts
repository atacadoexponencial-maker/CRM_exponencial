"use server"

import { createClient } from "@/integrations/supabase/server"
import { redirect } from "next/navigation"

export type MensagemRapidaListada = {
  id: string
  titulo: string
  conteudo: string
}

export async function listarMensagensRapidas(): Promise<MensagemRapidaListada[]> {
  const supabase = await createClient()

  const { data: perfil } = await supabase
    .from("profiles")
    .select("workspace_id, role")
    .single()

  if (!perfil || perfil.role !== "admin") redirect("/perfil")

  const { data } = await supabase
    .from("quick_replies")
    .select("id, title, content")
    .eq("workspace_id", perfil.workspace_id)
    .order("created_at", { ascending: true })

  if (!data) return []

  return data.map((r) => ({ id: r.id, titulo: r.title, conteudo: r.content }))
}
