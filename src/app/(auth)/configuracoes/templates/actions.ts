"use server"

import { sessaoAtual } from "@/lib/sessao"
import { createServiceClient } from "@/integrations/supabase/service"
import { conferirNomeDoTemplate } from "./nome-do-template"

export type Template = {
  id: string
  name: string
  status: string
  category: string
  language: string
  /** B48-15: só no rejeitado; o motivo da Meta em português, ou o aviso de que ela não disse. */
  motivo?: string
}

// B48-15: os valores de `rejected_reason` da Graph API (WhatsApp Message Template).
// Valor que não está aqui aparece como veio, para não esconder o motivo.
const MOTIVO_DA_REJEICAO: Record<string, string> = {
  ABUSIVE_CONTENT: "Conteúdo considerado abusivo pela Meta",
  INVALID_FORMAT: "Formato inválido: confira as variáveis e os exemplos",
  PROMOTIONAL: "Conteúdo promocional fora da categoria Marketing",
  TAG_CONTENT_MISMATCH: "A categoria não combina com o texto",
  INCORRECT_CATEGORY: "Categoria errada para este texto",
  SCAM: "Suspeita de golpe",
}
const SEM_MOTIVO = "A Meta não informou o motivo"

function motivoDaRejeicao(codigo: unknown): string {
  if (typeof codigo !== "string" || !codigo || codigo === "NONE") return SEM_MOTIVO
  return MOTIVO_DA_REJEICAO[codigo] ?? codigo
}

async function obterConexao() {
  const { user, perfil } = await sessaoAtual()
  if (!user) return null

  if (perfil?.role !== "admin") return null

  // B19-03: `access_token` só é legível pela chave de serviço; o filtro de empresa fica.
  // B53-08: template só existe na API Oficial; com chip na mesma empresa, o filtro só
  // por empresa achava duas conexões e o `maybeSingle` falhava.
  const { data: conexao } = await createServiceClient()
    .from("whatsapp_connections")
    .select("waba_id, access_token")
    .eq("workspace_id", perfil.workspace_id)
    .eq("canal", "meta")
    .limit(1)
    .maybeSingle()

  return conexao
}

const ERRO_AO_CARREGAR_TEMPLATES = "Não foi possível carregar os templates da Meta"

export async function listarTemplates(): Promise<{ templates: Template[]; erro?: string }> {
  const conexao = await obterConexao()
  if (!conexao) return { templates: [] }

  // B53-08: erro da Meta vira aviso na tela, não lista vazia.
  let data: { data?: unknown[] }
  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${conexao.waba_id}/message_templates?fields=id,name,status,category,language,rejected_reason&limit=50&access_token=${conexao.access_token}`
    )
    if (!res.ok) return { templates: [], erro: ERRO_AO_CARREGAR_TEMPLATES }
    data = await res.json()
  } catch {
    return { templates: [], erro: ERRO_AO_CARREGAR_TEMPLATES }
  }

  return {
    templates: ((data.data ?? []) as Array<Template & { rejected_reason?: unknown }>).map(({ rejected_reason, ...t }) =>
      t.status === "REJECTED" ? { ...t, motivo: motivoDaRejeicao(rejected_reason) } : t
    ),
  }
}

export async function criarTemplate(params: {
  name: string
  category: string
  language: string
  body: string
}): Promise<{ erro?: string }> {
  // B53-08: a mesma conversão da tela; nome que continua inválido nem chega à Meta.
  const conferido = conferirNomeDoTemplate(params.name)
  if ("erro" in conferido) return { erro: conferido.erro }

  const conexao = await obterConexao()
  if (!conexao) return { erro: "Sem permissão ou WhatsApp não conectado" }

  const res = await fetch(
    `https://graph.facebook.com/v21.0/${conexao.waba_id}/message_templates?access_token=${conexao.access_token}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: conferido.nome,
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
