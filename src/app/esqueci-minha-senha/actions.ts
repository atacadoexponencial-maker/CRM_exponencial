"use server"

// B52-01: pedir o link de criar senha nova. A resposta é a mesma para quem tem conta e
// para quem não tem: quem pede não descobre se o e-mail está no CRM.

import { headers } from "next/headers"
import { createServiceClient } from "@/integrations/supabase/service"
import { passouNaConferenciaHumana } from "@/lib/conferencia-humana"
import { chaveDoEmail, chaveDoIp, ipDaRequisicao, passouDoLimite, registrarTentativa } from "@/lib/limite-de-tentativas"
import { hashDoCodigo, novoCodigoDeConvite } from "@/lib/convites"
import { enviarEmailDeSenhaNova } from "@/lib/email-de-senha-nova"

// SUP-B52-01: 3 pedidos por e-mail e 10 por endereço, por hora
const LIMITE_POR_EMAIL = 3
const LIMITE_POR_IP = 10
// PER-B52-01: o link vale 1 hora
const VALIDADE_MS = 60 * 60 * 1000
const EMAIL_SIMPLES = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type ResultadoDoPedido = { ok: true } | { erro: "dados_invalidos" | "conferencia" | "limite" }

async function linkDeSenhaNova(codigo: string): Promise<string> {
  const h = await headers()
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "crmatacadoexp.com"
  const protocolo = h.get("x-forwarded-proto") ?? "https"
  return `${protocolo}://${host}/redefinir-senha?codigo=${codigo}`
}

export async function pedirLinkDeSenhaNova(dados: unknown): Promise<ResultadoDoPedido> {
  const bruto = (dados as { email?: unknown } | null)?.email
  const email = typeof bruto === "string" ? bruto.trim().toLowerCase() : ""
  if (!EMAIL_SIMPLES.test(email)) return { erro: "dados_invalidos" }

  // B50-02: só pessoa pede (Cloudflare Turnstile)
  const ip = await ipDaRequisicao()
  if (!(await passouNaConferenciaHumana((dados as { conferencia?: unknown }).conferencia, ip))) return { erro: "conferencia" }

  const chaves = [chaveDoEmail(email), chaveDoIp(ip)]
  const limites = [
    { chave: chaves[0], limite: LIMITE_POR_EMAIL },
    { chave: chaves[1], limite: LIMITE_POR_IP },
  ]
  if (await passouDoLimite("senha_nova", limites, 60)) return { erro: "limite" }
  await registrarTentativa("senha_nova", chaves)

  const service = createServiceClient()
  const { data: userId } = await service.rpc("conta_ativa_por_email", { p_email: email })
  // Sem conta ativa: a mesma resposta, sem gravar nem mandar nada
  if (!userId) return { ok: true }

  // Pedido novo derruba os links que ainda não foram usados
  await service
    .from("redefinicoes_de_senha")
    .update({ cancelado_em: new Date().toISOString() })
    .eq("user_id", userId)
    .is("usado_em", null)
    .is("cancelado_em", null)

  const codigo = novoCodigoDeConvite()
  const { error } = await service.from("redefinicoes_de_senha").insert({
    user_id: userId,
    token_hash: hashDoCodigo(codigo),
    expira_em: new Date(Date.now() + VALIDADE_MS).toISOString(),
  })
  if (error) return { ok: true }

  // SUP-B52-03: se o e-mail não sair, a resposta é a mesma (avisar revelaria a conta)
  await enviarEmailDeSenhaNova(email, await linkDeSenhaNova(codigo))
  return { ok: true }
}
