"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { AVISO_CONFIRME_QUE_E_PESSOA, AVISO_CONTA_DESATIVADA, AVISO_MUITAS_TENTATIVAS } from "./avisos"
import { destinoSeguro } from "./destino"
import { COOKIE_TEMA, OPCOES_COOKIE_TEMA, temaValido } from "@/lib/tema"
import { chaveDoEmail, chaveDoIp, ipDaRequisicao, passouDoLimite, registrarTentativa } from "@/lib/limite-de-tentativas"
import { AVISO_CONFERENCIA_HUMANA, passouNaConferenciaHumana } from "@/lib/conferencia-humana"

// B20-05: senhas erradas em 15 minutos — por e-mail e por endereço de internet.
const JANELA_LOGIN_MINUTOS = 15
const LIMITE_ERROS_POR_EMAIL = 10
const LIMITE_ERROS_POR_IP = 30

export type ResultadoDoLogin = { erro: string; pedirConferencia?: boolean }

/**
 * Login feito no servidor, ao lado do banco: uma única ida do navegador.
 *
 * Em sucesso, os cookies da sessão e a página de destino voltam na mesma
 * resposta (`redirect` dentro da action).
 *
 * Pista 10 da auditoria run-2: o limite por endereço trava, porque só pesa para quem
 * erra daquele endereço. O limite por e-mail não trava mais: qualquer um podia errar
 * 10 vezes o e-mail de outra pessoa e deixá-la de fora por 15 minutos, mesmo com a
 * senha certa. Agora, passado esse limite, a senha só é conferida junto com a
 * conferência humana (Turnstile), que a tela mostra quando recebe `pedirConferencia`.
 */
export async function realizarLogin(
  email: string,
  senha: string,
  voltar?: string | null,
  conferencia?: string | null
): Promise<ResultadoDoLogin> {
  const ip = await ipDaRequisicao()
  const chaves = [chaveDoEmail(email), chaveDoIp(ip)]
  const [emailNoLimite, ipNoLimite] = await Promise.all([
    passouDoLimite("login", [{ chave: chaves[0], limite: LIMITE_ERROS_POR_EMAIL }], JANELA_LOGIN_MINUTOS),
    passouDoLimite("login", [{ chave: chaves[1], limite: LIMITE_ERROS_POR_IP }], JANELA_LOGIN_MINUTOS),
  ])
  if (ipNoLimite) return { erro: AVISO_MUITAS_TENTATIVAS }
  if (emailNoLimite) {
    // Sem conferência (null), a tela ainda não mostrou o desafio: nem chama a Cloudflare.
    // Depois de mostrar, ela manda texto, vazio se o desafio falhou no navegador; esse vai
    // à Cloudflare, para valer a regra do B50 de passar quando ela está fora do ar.
    if (conferencia === null || conferencia === undefined) {
      return { erro: AVISO_CONFIRME_QUE_E_PESSOA, pedirConferencia: true }
    }
    if (!(await passouNaConferenciaHumana(conferencia, ip))) {
      return { erro: AVISO_CONFERENCIA_HUMANA, pedirConferencia: true }
    }
  }

  const supabase = await createSsrClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha })
  // B20-02: usuário desativado é banido no Auth.
  if (error?.code === "user_banned") return { erro: AVISO_CONTA_DESATIVADA }
  if (error || !data.user) {
    await registrarTentativa("login", chaves)
    // Com o e-mail no limite, a próxima tentativa também precisa de conferência nova
    return emailNoLimite ? { erro: "E-mail ou senha incorretos", pedirConferencia: true } : { erro: "E-mail ou senha incorretos" }
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
