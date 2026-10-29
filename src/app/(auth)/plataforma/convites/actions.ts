"use server"

// B51-01: convites para criar conta. Só quem está em `plataforma_admins` cria, lista,
// cancela e gera link novo; a tabela não tem política, então tudo passa pela chave de
// serviço depois desta conferência.

import { headers } from "next/headers"
import { sessaoAtual } from "@/lib/sessao"
import { ehDaPlataforma } from "@/lib/plataforma"
import { fusoDaEmpresa } from "@/lib/fuso-da-empresa"
import { instanteNoFuso } from "@/lib/datas"
import { createServiceClient } from "@/integrations/supabase/service"
import {
  AVISO_VALIDADE,
  PRAZOS_PRONTOS_DIAS,
  hashDoCodigo,
  novoCodigoDeConvite,
  situacaoDoConvite,
  validadeAceita,
  vencimentoEmDias,
  type SituacaoConvite,
} from "@/lib/convites"

const SEM_PERMISSAO = "Sem permissão"
const NAO_PENDENTE = "Este convite não está mais pendente."

/** 1, 7 ou 30 dias, ou um dia e hora no fuso da empresa de quem cria. */
export type Validade = { dias: number } | { dia: string; hora: string }

export type ConviteListado = {
  id: string
  email: string | null
  criadoPor: string | null
  criadoEm: string
  expiraEm: string
  situacao: SituacaoConvite
  empresa: string | null
}

async function quemDaPlataforma(): Promise<string | null> {
  const { user } = await sessaoAtual()
  if (!user || !(await ehDaPlataforma(user.email))) return null
  return user.id
}

/** Como em Catálogo → Configurações: o host de quem pediu, para o preview levar ao preview. */
async function linkDoConvite(codigo: string): Promise<string> {
  const h = await headers()
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "crm-exponencial.vercel.app"
  const protocolo = h.get("x-forwarded-proto") ?? "https"
  return `${protocolo}://${host}/cadastro?convite=${codigo}`
}

async function vencimento(validade: Validade): Promise<Date | null> {
  if ("dias" in validade) {
    return (PRAZOS_PRONTOS_DIAS as readonly number[]).includes(validade.dias) ? vencimentoEmDias(validade.dias) : null
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(validade.dia) || !/^\d{2}:\d{2}$/.test(validade.hora)) return null
  return instanteNoFuso(validade.dia, validade.hora, await fusoDaEmpresa())
}

export async function listarConvites(): Promise<ConviteListado[]> {
  if (!(await quemDaPlataforma())) return []
  const service = createServiceClient()

  const { data } = await service
    .from("convites")
    .select("id, email, criado_por, criado_em, expira_em, usado_em, cancelado_em, workspaces(name)")
    .order("criado_em", { ascending: false })
    .limit(200)
  const convites = (data ?? []) as unknown as {
    id: string
    email: string | null
    criado_por: string | null
    criado_em: string
    expira_em: string
    usado_em: string | null
    cancelado_em: string | null
    workspaces: { name: string } | null
  }[]

  // `criado_por` aponta para auth.users; o nome vem de profiles
  const ids = [...new Set(convites.map((c) => c.criado_por).filter((id): id is string => !!id))]
  const { data: perfis } = ids.length ? await service.from("profiles").select("id, name").in("id", ids) : { data: [] }
  const nomes = new Map((perfis ?? []).map((p: { id: string; name: string }) => [p.id, p.name]))

  const agora = new Date()
  return convites.map((c) => ({
    id: c.id,
    email: c.email,
    criadoPor: c.criado_por ? nomes.get(c.criado_por) ?? null : null,
    criadoEm: c.criado_em,
    expiraEm: c.expira_em,
    situacao: situacaoDoConvite(c, agora),
    empresa: c.workspaces?.name ?? null,
  }))
}

export async function criarConvite(dados: { validade: Validade }): Promise<{ link: string } | { erro: string }> {
  const userId = await quemDaPlataforma()
  if (!userId) return { erro: SEM_PERMISSAO }

  const expiraEm = dados?.validade ? await vencimento(dados.validade) : null
  if (!expiraEm || !validadeAceita(expiraEm)) return { erro: AVISO_VALIDADE }

  const codigo = novoCodigoDeConvite()
  const { error } = await createServiceClient().from("convites").insert({
    token_hash: hashDoCodigo(codigo),
    criado_por: userId,
    expira_em: expiraEm.toISOString(),
  })
  if (error) return { erro: "Não foi possível criar o convite. Tente novamente." }

  return { link: await linkDoConvite(codigo) }
}

/** Troca o código do convite pendente; o link anterior para de valer e a validade fica (SUP-B51-05). */
export async function gerarLinkNovo(id: string): Promise<{ link: string } | { erro: string }> {
  if (!(await quemDaPlataforma())) return { erro: SEM_PERMISSAO }

  const codigo = novoCodigoDeConvite()
  const { data, error } = await createServiceClient()
    .from("convites")
    .update({ token_hash: hashDoCodigo(codigo) })
    .eq("id", id)
    .is("usado_em", null)
    .is("cancelado_em", null)
    .gt("expira_em", new Date().toISOString())
    .select("id")
  if (error) return { erro: "Não foi possível gerar o link. Tente novamente." }
  if (!data?.length) return { erro: NAO_PENDENTE }

  return { link: await linkDoConvite(codigo) }
}

export async function cancelarConvite(id: string): Promise<{ erro?: string }> {
  if (!(await quemDaPlataforma())) return { erro: SEM_PERMISSAO }

  const { data, error } = await createServiceClient()
    .from("convites")
    .update({ cancelado_em: new Date().toISOString() })
    .eq("id", id)
    .is("usado_em", null)
    .is("cancelado_em", null)
    .gt("expira_em", new Date().toISOString())
    .select("id")
  if (error) return { erro: "Não foi possível cancelar o convite. Tente novamente." }
  if (!data?.length) return { erro: NAO_PENDENTE }
  return {}
}
