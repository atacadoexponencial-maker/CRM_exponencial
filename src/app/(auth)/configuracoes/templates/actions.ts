"use server"

import { sessaoAtual } from "@/lib/sessao"
import { createServiceClient } from "@/integrations/supabase/service"

export type Template = {
  id: string
  name: string
  status: string
  category: string
  language: string
}

async function obterConexao() {
  const { user, perfil } = await sessaoAtual()
  if (!user) return null

  if (perfil?.role !== "admin") return null

  // B19-03: `access_token` só é legível pela chave de serviço; o filtro de empresa fica.
  const { data: conexao } = await createServiceClient()
    .from("whatsapp_connections")
    .select("waba_id, access_token")
    .eq("workspace_id", perfil.workspace_id)
    .maybeSingle()

  return conexao
}

export async function listarTemplates(): Promise<Template[]> {
  const conexao = await obterConexao()
  if (!conexao) return []

  const res = await fetch(
    `https://graph.facebook.com/v21.0/${conexao.waba_id}/message_templates?fields=id,name,status,category,language&limit=50&access_token=${conexao.access_token}`
  )

  if (!res.ok) return []

  const data = await res.json()
  return (data.data ?? []) as Template[]
}

export async function criarTemplate(params: {
  name: string
  category: string
  language: string
  body: string
}): Promise<{ erro?: string }> {
  const conexao = await obterConexao()
  if (!conexao) return { erro: "Sem permissão ou WhatsApp não conectado" }

  const res = await fetch(
    `https://graph.facebook.com/v21.0/${conexao.waba_id}/message_templates?access_token=${conexao.access_token}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: params.name,
        category: params.category,
        language: params.language,
        components: [{ type: "BODY", text: params.body }],
      }),
    }
  )

  const data = await res.json()

  if (!res.ok) {
    const msg = data?.error?.error_user_msg ?? data?.error?.message ?? "Erro ao criar template"
    return { erro: msg }
  }

  return {}
}
