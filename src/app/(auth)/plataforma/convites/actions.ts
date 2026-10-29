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
import { enviarEmailDoConvite } from "@/lib/email-do-convite"
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
const EMAIL_INVALIDO = "Digite um e-mail válido ou deixe em branco."
const EMAIL_COM_CONTA = "Este e-mail já tem conta no CRM."
const EMAIL_SIMPLES = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** `emailEnviado` só vem quando o convite tem e-mail (B51-03). */
export type ResultadoDoLink = { link: string; emailEnviado?: boolean } | { erro: string }

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

/** B51-03: manda (ou manda de novo) o e-mail do convite, no fuso da empresa de quem criou. */
async function enviar(email: string, link: string, expiraEm: string): Promise<boolean> {
  return enviarEmailDoConvite(email, link, expiraEm, await fusoDaEmpresa())
}

export async function criarConvite(dados: { email?: string; validade: Validade }): Promise<ResultadoDoLink> {
  const userId = await quemDaPlataforma()
  if (!userId) return { erro: SEM_PERMISSAO }

  const expiraEm = dados?.validade ? await vencimento(dados.validade) : null
  if (!expiraEm || !validadeAceita(expiraEm)) return { erro: AVISO_VALIDADE }

  // B51-03: com e-mail, o convite só vale para ele; sem, é link avulso
  const email = typeof dados.email === "string" ? dados.email.trim().toLowerCase() : ""
  if (email && !EMAIL_SIMPLES.test(email)) return { erro: EMAIL_INVALIDO }

  const service = createServiceClient()
  if (email) {
    const { data: temConta, error } = await service.rpc("email_ja_tem_conta", { p_email: email })
    if (error) return { erro: "Não foi possível criar o convite. Tente novamente." }
    if (temConta) return { erro: EMAIL_COM_CONTA }
  }

  const codigo = novoCodigoDeConvite()
  const { error } = await service.from("convites").insert({
    token_hash: hashDoCodigo(codigo),
    email: email || null,
    criado_por: userId,
    expira_em: expiraEm.toISOString(),
  })
  if (error) return { erro: "Não foi possível criar o convite. Tente novamente." }

  const link = await linkDoConvite(codigo)
  if (!email) return { link }
  return { link, emailEnviado: await enviar(email, link, expiraEm.toISOString()) }
}

/** Troca o código do convite pendente; o link anterior para de valer e a validade fica (SUP-B51-05). */
export async function gerarLinkNovo(id: string): Promise<ResultadoDoLink> {
  if (!(await quemDaPlataforma())) return { erro: SEM_PERMISSAO }

  const codigo = novoCodigoDeConvite()
  const { data, error } = await createServiceClient()
    .from("convites")
    .update({ token_hash: hashDoCodigo(codigo) })
    .eq("id", id)
    .is("usado_em", null)
    .is("cancelado_em", null)
    .gt("expira_em", new Date().toISOString())
    .select("email, expira_em")
  if (error) return { erro: "Não foi possível gerar o link. Tente novamente." }
  if (!data?.length) return { erro: NAO_PENDENTE }

  const link = await linkDoConvite(codigo)
  const { email, expira_em } = data[0] as { email: string | null; expira_em: string }
  if (!email) return { link }
  return { link, emailEnviado: await enviar(email, link, expira_em) }
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
