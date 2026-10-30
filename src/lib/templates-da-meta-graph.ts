// B54-04: a consulta dos templates de uma conta da Meta (WABA), usada pela tela de
// templates e pela campanha. Só servidor: leva o `access_token` da conexão, que nunca
// chega ao navegador (B19-03). O que é conversão pura fica em `templates-da-meta.ts`.

import { partesDoTemplate, type PartesDoTemplate } from "./templates-da-meta"

export type TemplateDaMeta = {
  id: string
  name: string
  status: string
  category: string
  language: string
  /** O código bruto da Meta no rejeitado (`rejected_reason`); quem mostra traduz. */
  rejectedReason?: string
  partes: PartesDoTemplate | null
}

export const ERRO_AO_CARREGAR_TEMPLATES = "Não foi possível carregar os templates da Meta"

const CAMPOS = "id,name,status,category,language,rejected_reason,components"

export async function buscarTemplatesDaMeta(
  wabaId: string,
  accessToken: string
): Promise<{ templates: TemplateDaMeta[]; erro?: string }> {
  let data: { data?: unknown[] }
  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${wabaId}/message_templates?fields=${CAMPOS}&limit=50&access_token=${accessToken}`
    )
    if (!res.ok) return { templates: [], erro: ERRO_AO_CARREGAR_TEMPLATES }
    data = await res.json()
  } catch {
    return { templates: [], erro: ERRO_AO_CARREGAR_TEMPLATES }
  }

  type Bruto = { id: string; name: string; status: string; category: string; language: string; rejected_reason?: unknown; components?: unknown }
  return {
    templates: ((data.data ?? []) as Bruto[]).map(({ rejected_reason, components, ...t }) => ({
      ...t,
      ...(typeof rejected_reason === "string" ? { rejectedReason: rejected_reason } : {}),
      partes: partesDoTemplate(components),
    })),
  }
}
