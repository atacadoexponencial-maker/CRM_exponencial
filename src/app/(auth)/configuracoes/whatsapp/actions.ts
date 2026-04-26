"use server"

import { revalidatePath } from "next/cache"
import { createClient as createSsrClient } from "@/integrations/supabase/server"

export type ConexaoWhatsApp = {
  id: string
  phoneNumber: string
  displayName: string
  status: string
}

export async function listarConexaoWhatsApp(): Promise<ConexaoWhatsApp | null> {
  const ssrClient = await createSsrClient()
  const { data: { user } } = await ssrClient.auth.getUser()
  if (!user) return null

  const { data: perfil } = await ssrClient
    .from("profiles")
    .select("workspace_id")
    .eq("id", user.id)
    .single()

  if (!perfil) return null

  const { data } = await ssrClient
    .from("whatsapp_connections")
    .select("id, phone_number, display_name, status")
    .eq("workspace_id", perfil.workspace_id)
    .maybeSingle()

  if (!data) return null

  return {
    id: data.id,
    phoneNumber: data.phone_number,
    displayName: data.display_name,
    status: data.status,
  }
}

export async function completarConexaoWhatsApp(params: {
  code: string
  phoneNumberId: string
  wabaId: string
}): Promise<{ erro?: string }> {
  const ssrClient = await createSsrClient()
  const { data: { user } } = await ssrClient.auth.getUser()
  if (!user) return { erro: "Não autorizado" }

  const { data: perfil } = await ssrClient
    .from("profiles")
    .select("role, workspace_id")
    .eq("id", user.id)
    .single()

  if (perfil?.role !== "admin") return { erro: "Sem permissão" }

  const workspaceId: string = perfil.workspace_id

  const { data: existente } = await ssrClient
    .from("whatsapp_connections")
    .select("id")
    .eq("workspace_id", workspaceId)
    .maybeSingle()

  if (existente) return { erro: "Já existe um número conectado" }

  const appId = process.env.NEXT_PUBLIC_META_APP_ID!
  const appSecret = process.env.META_APP_SECRET!

  const tokenRes = await fetch(
    `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&code=${params.code}`
  )

  if (!tokenRes.ok) return { erro: "Não foi possível conectar o número. Tente novamente." }

  const tokenData = await tokenRes.json()
  const accessToken: string = tokenData.access_token
  if (!accessToken) return { erro: "Não foi possível conectar o número. Tente novamente." }

  const phoneRes = await fetch(
    `https://graph.facebook.com/v21.0/${params.phoneNumberId}?fields=display_phone_number,verified_name&access_token=${accessToken}`
  )

  if (!phoneRes.ok) return { erro: "Não foi possível conectar o número. Tente novamente." }

  const phoneData = await phoneRes.json()
  const phoneNumber: string = phoneData.display_phone_number
  const displayName: string = phoneData.verified_name

  if (!phoneNumber || !displayName) return { erro: "Não foi possível conectar o número. Tente novamente." }

  const { error } = await ssrClient
    .from("whatsapp_connections")
    .insert({
      workspace_id: workspaceId,
      phone_number: phoneNumber,
      display_name: displayName,
      status: "connected",
      waba_id: params.wabaId,
      phone_number_id: params.phoneNumberId,
      access_token: accessToken,
    })

  if (error) return { erro: "Não foi possível conectar o número. Tente novamente." }

  revalidatePath("/configuracoes/whatsapp")
  return {}
}
