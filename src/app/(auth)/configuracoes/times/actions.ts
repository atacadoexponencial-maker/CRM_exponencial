"use server"

import { createClient as createSsrClient } from "@/integrations/supabase/server"

export type MembroTime = {
  id: string
  name: string
}

export type TimeListado = {
  id: string
  name: string
  isDefault: boolean
  membros: MembroTime[]
}

export async function listarTimes(): Promise<TimeListado[]> {
  const ssrClient = await createSsrClient()
  const { data: { user } } = await ssrClient.auth.getUser()
  if (!user) return []

  const { data: times } = await ssrClient
    .from("teams")
    .select("id, name, is_default, user_teams(profiles(id, name))")
    .order("is_default", { ascending: false })
    .order("name")

  if (!times) return []

  return times.map((t) => ({
    id: t.id,
    name: t.name,
    isDefault: t.is_default,
    membros: ((t.user_teams ?? []) as unknown as { profiles: { id: string; name: string } | null }[])
      .map((ut) => ut.profiles)
      .filter((p): p is { id: string; name: string } => p !== null),
  }))
}
