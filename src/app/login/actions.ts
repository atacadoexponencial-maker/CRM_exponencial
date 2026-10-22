"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { AVISO_CONTA_DESATIVADA, AVISO_MUITAS_TENTATIVAS } from "./avisos"
import { destinoSeguro } from "./destino"
import { COOKIE_TEMA, OPCOES_COOKIE_TEMA, temaValido } from "@/lib/tema"
import { chaveDoEmail, chaveDoIp, ipDaRequisicao, passouDoLimite, registrarTentativa } from "@/lib/limite-de-tentativas"

// B20-05: senhas erradas em 15 minutos — por e-mail e por endereço de internet.
const JANELA_LOGIN_MINUTOS = 15
const LIMITE_ERROS_POR_EMAIL = 10
const LIMITE_ERROS_POR_IP = 30

/**
 * Login feito no servidor, ao lado do banco: uma única ida do navegador.
 *
 * Em sucesso, os cookies da sessão e a página de destino voltam na mesma
 * resposta (`redirect` dentro da action).
 */
export async function realizarLogin(email: string, senha: string, voltar?: string | null): Promise<{ erro: string }> {
  const chaves = [chaveDoEmail(email), chaveDoIp(await ipDaRequisicao())]
  const travado = await passouDoLimite(
    "login",
    [{ chave: chaves[0], limite: LIMITE_ERROS_POR_EMAIL }, { chave: chaves[1], limite: LIMITE_ERROS_POR_IP }],
    JANELA_LOGIN_MINUTOS
  )
  if (travado) return { erro: AVISO_MUITAS_TENTATIVAS }

  const supabase = await createSsrClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha })
  // B20-02: usuário desativado é banido no Auth.
  if (error?.code === "user_banned") return { erro: AVISO_CONTA_DESATIVADA }
  if (error || !data.user) {
    await registrarTentativa("login", chaves)
    return { erro: "E-mail ou senha incorretos" }
  }

  const { data: perfil } = await supabase
    .from("profiles")
    .select("role, tema")
    .eq("id", data.user.id)
    .single()

  // Perfil inativo não aparece para o próprio usuário (RLS): conta desativada.
  if (!perfil) {
    await supabase.auth.signOut()
    return { erro: AVISO_CONTA_DESATIVADA }
  }

  // B36-01: o tema do perfil vem junto para qualquer aparelho em que a pessoa entrar.
  ;(await cookies()).set(COOKIE_TEMA, temaValido((perfil as { tema?: string }).tema), OPCOES_COOKIE_TEMA)

  // QA baixos (06/10): volta para a página que a pessoa tentou abrir; sem ela, o
  // Dashboard, que todo papel vê. Antes, atendente caía em /perfil e admin em
  // /configuracoes/whatsapp.
  redirect(destinoSeguro(voltar) ?? "/dashboard")
}
