"use server"

import { sessaoAtual } from "@/lib/sessao"
import { createServiceClient } from "@/integrations/supabase/service"
import { conferirNomeDoTemplate } from "./nome-do-template"
import {
  AVISO_SEM_EXEMPLO_DO_CABECALHO,
  componentsParaMeta,
  motivoDaRecusaDaMeta,
  type ExemplosDoTemplate,
  type PartesDoTemplate,
} from "@/lib/templates-da-meta"
import { buscarTemplatesDaMeta } from "@/lib/templates-da-meta-graph"
import { GRAPH } from "@/lib/whatsapp/versao-da-graph"

export type Template = {
  id: string
  name: string
  status: string
  category: string
  language: string
  /** B48-15: só no rejeitado; o motivo da Meta em português, ou o aviso de que ela não disse. */
  motivo?: string
  /** B54-01: cabeçalho, corpo, rodapé e botões lidos do `components` da Meta; `null` quando ela não mandou. */
  partes?: PartesDoTemplate | null
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

  // B54-04 (CA-B54-22): o Gerente vê e mexe em templates como o Admin.
  if (!perfil || !["admin", "gerente"].includes(perfil.role)) return null

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

export async function listarTemplates(): Promise<{ templates: Template[]; erro?: string }> {
  const conexao = await obterConexao()
  if (!conexao) return { templates: [] }

  // B53-08: erro da Meta vira aviso na tela, não lista vazia.
  // B54-04: a consulta é a mesma da campanha (`buscarTemplatesDaMeta`).
  const { templates, erro } = await buscarTemplatesDaMeta(conexao.waba_id, conexao.access_token)
  if (erro) return { templates: [], erro }

  return {
    templates: templates.map(({ rejectedReason, ...t }) => ({
      ...t,
      ...(t.status === "REJECTED" ? { motivo: motivoDaRejeicao(rejectedReason) } : {}),
    })),
  }
}

// ── B54-02: criar, editar e apagar ───────────────────────────────────

const ERRO_NO_EXEMPLO = "Não foi possível enviar o arquivo de exemplo à Meta"
const LIMITE_DO_EXEMPLO = 4 * 1024 * 1024

export type DadosDoTemplate = {
  name: string
  category: string
  language: string
  partes: PartesDoTemplate
  /** Handle devolvido por `enviarExemploDoCabecalho`; obrigatório quando o cabeçalho é mídia. */
  headerHandle?: string | null
  /** Um exemplo por variável, pedido na tela (SUP-B54-09). */
  exemplos?: ExemplosDoTemplate
}

function cabecalhoEhMidia(partes: PartesDoTemplate): boolean {
  const tipo = partes.cabecalho?.tipo
  return tipo === "imagem" || tipo === "video" || tipo === "documento"
}

export async function criarTemplate(params: DadosDoTemplate): Promise<{ erro?: string; id?: string }> {
  // B53-08: a mesma conversão da tela; nome que continua inválido nem chega à Meta.
  const conferido = conferirNomeDoTemplate(params.name)
  if ("erro" in conferido) return { erro: conferido.erro }
  if (!params.partes.corpo.trim()) return { erro: "Corpo da mensagem é obrigatório" }
  if (cabecalhoEhMidia(params.partes) && !params.headerHandle) return { erro: AVISO_SEM_EXEMPLO_DO_CABECALHO }

  const conexao = await obterConexao()
  if (!conexao) return { erro: "Sem permissão ou WhatsApp não conectado" }

  const res = await fetch(
    `${GRAPH}/${conexao.waba_id}/message_templates?access_token=${conexao.access_token}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: conferido.nome,
        category: params.category,
        language: params.language,
        components: componentsParaMeta(params.partes, { headerHandle: params.headerHandle, exemplos: params.exemplos }),
      }),
    }
  )

  const data = await res.json()
  if (!res.ok) return { erro: motivoDaRecusaDaMeta(data?.error, "Erro ao criar template") }
  return { id: typeof data?.id === "string" ? data.id : undefined }
}

/**
 * Edita o que a Meta deixa: as partes e a categoria. Nome e idioma não vão (a Meta não
 * aceita). Template aprovado editado volta a PENDING na Meta.
 */
export async function editarTemplate(params: {
  id: string
  category: string
  partes: PartesDoTemplate
  headerHandle?: string | null
  exemplos?: ExemplosDoTemplate
}): Promise<{ erro?: string }> {
  if (!params.partes.corpo.trim()) return { erro: "Corpo da mensagem é obrigatório" }
  if (cabecalhoEhMidia(params.partes) && !params.headerHandle) return { erro: AVISO_SEM_EXEMPLO_DO_CABECALHO }

  const conexao = await obterConexao()
  if (!conexao) return { erro: "Sem permissão ou WhatsApp não conectado" }

  const res = await fetch(`${GRAPH}/${params.id}?access_token=${conexao.access_token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      category: params.category,
      components: componentsParaMeta(params.partes, { headerHandle: params.headerHandle, exemplos: params.exemplos }),
    }),
  })

  const data = await res.json()
  if (!res.ok) return { erro: motivoDaRecusaDaMeta(data?.error, "Erro ao editar template") }
  return {}
}

/** Apaga pelo nome: a Meta remove todas as versões de idioma daquele nome (SUP-B54-08). */
export async function apagarTemplate(name: string): Promise<{ erro?: string }> {
  const conexao = await obterConexao()
  if (!conexao) return { erro: "Sem permissão ou WhatsApp não conectado" }

  const res = await fetch(
    `${GRAPH}/${conexao.waba_id}/message_templates?name=${encodeURIComponent(name)}&access_token=${conexao.access_token}`,
    { method: "DELETE" }
  )

  const data = await res.json()
  if (!res.ok) return { erro: motivoDaRecusaDaMeta(data?.error, "Erro ao apagar template") }
  return {}
}

/**
 * Sobe o arquivo de exemplo do cabeçalho pela Resumable Upload API da Meta e devolve o
 * handle (`h`) que entra em `example.header_handle`. O arquivo não fica guardado no CRM
 * (SUP-B54-10).
 */
export async function enviarExemploDoCabecalho(formData: FormData): Promise<{ handle?: string; erro?: string }> {
  const conexao = await obterConexao()
  if (!conexao) return { erro: "Sem permissão ou WhatsApp não conectado" }

  const arquivo = formData.get("arquivo")
  if (!(arquivo instanceof File) || arquivo.size === 0) return { erro: "Arquivo inválido" }
  if (arquivo.size > LIMITE_DO_EXEMPLO) return { erro: "Arquivo de exemplo muito grande (máximo 4 MB)" }

  const appId = process.env.NEXT_PUBLIC_META_APP_ID
  if (!appId) return { erro: ERRO_NO_EXEMPLO }

  try {
    const sessao = await fetch(
      `${GRAPH}/${appId}/uploads?file_name=${encodeURIComponent(arquivo.name)}&file_length=${arquivo.size}&file_type=${encodeURIComponent(arquivo.type)}&access_token=${conexao.access_token}`,
      { method: "POST" }
    )
    const sessaoData = await sessao.json()
    if (!sessao.ok || typeof sessaoData?.id !== "string") return { erro: ERRO_NO_EXEMPLO }

    const envio = await fetch(`${GRAPH}/${sessaoData.id}`, {
      method: "POST",
      headers: { Authorization: `OAuth ${conexao.access_token}`, file_offset: "0", "Content-Type": arquivo.type || "application/octet-stream" },
      body: Buffer.from(await arquivo.arrayBuffer()),
    })
    const envioData = await envio.json()
    if (!envio.ok || typeof envioData?.h !== "string") return { erro: ERRO_NO_EXEMPLO }
    return { handle: envioData.h }
  } catch {
    return { erro: ERRO_NO_EXEMPLO }
  }
}
