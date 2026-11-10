"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { AVISO_CONFIRME_QUE_E_PESSOA, AVISO_CONTA_DESATIVADA, AVISO_MUITAS_TENTATIVAS } from "./avisos"
import { destinoSeguro } from "./destino"
import { COOKIE_TEMA, OPCOES_COOKIE_TEMA, temaValido } from "@/lib/tema"
import {
  chaveDoEmail,
  chaveDoIp,
  ipDaRequisicao,
  liberarTentativa,
  limparTentativasAntigas,
  registrarTentativa,
  reservarTentativa,
} from "@/lib/limite-de-tentativas"
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
  const chaveEmail = chaveDoEmail(email)

  // Detalhes da auditoria (09/11/2026): a vaga é reservada antes de conferir a senha, numa
  // operação só no banco (como a loja, B44-09). Antes, o limite era lido e a tentativa
  // gravada depois: pedidos disparados juntos liam a mesma contagem e passavam todos,
  // sem trava de endereço nem conferência. A vaga é devolvida quando a tentativa não
  // conta: login certo, conta desativada, conferência que falta ou falha.
  const vagaIp = await reservarTentativa("login", chaveDoIp(ip), LIMITE_ERROS_POR_IP, JANELA_LOGIN_MINUTOS)
  if (!vagaIp.reservada) return { erro: AVISO_MUITAS_TENTATIVAS }
  const vagaEmail = await reservarTentativa("login", chaveEmail, LIMITE_ERROS_POR_EMAIL, JANELA_LOGIN_MINUTOS)
  // Detalhes da auditoria (10/11/2026): com o contador fora do ar, a vaga não foi contada e
  // a senha ficaria sem limite. Pede a conferência humana, como no e-mail no limite;
  // ninguém fica de fora, porque ela passa quando a Cloudflare não responde.
  const emailNoLimite = !vagaEmail.reservada || vagaIp.contadorFora === true || vagaEmail.contadorFora === true
  const devolverVagas = () => Promise.all([liberarTentativa(vagaIp.id), liberarTentativa(vagaEmail.id)])

  if (emailNoLimite) {
    // Sem conferência (null), a tela ainda não mostrou o desafio: nem chama a Cloudflare.
    // Depois de mostrar, ela manda texto, vazio se o desafio falhou no navegador; esse vai
    // à Cloudflare, para valer a regra do B50 de passar quando ela está fora do ar.
    if (conferencia === null || conferencia === undefined) {
      await devolverVagas()
      return { erro: AVISO_CONFIRME_QUE_E_PESSOA, pedirConferencia: true }
    }
    if (!(await passouNaConferenciaHumana(conferencia, ip))) {
      await devolverVagas()
      return { erro: AVISO_CONFERENCIA_HUMANA, pedirConferencia: true }
    }
  }

  const supabase = await createSsrClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha })
  // B20-02: usuário desativado é banido no Auth.
  if (error?.code === "user_banned") {
    await devolverVagas()
    return { erro: AVISO_CONTA_DESATIVADA }
  }
  if (error || !data.user) {
    // As vagas reservadas ficam: são a contagem desta senha errada. Com o e-mail no
    // limite não houve vaga; a tentativa entra na conta dele do mesmo jeito.
    if (emailNoLimite) await registrarTentativa("login", [chaveEmail])
    // Com o e-mail no limite, a próxima tentativa também precisa de conferência nova
    return emailNoLimite ? { erro: "E-mail ou senha incorretos", pedirConferencia: true } : { erro: "E-mail ou senha incorretos" }
  }
  await devolverVagas()
  // A limpeza da tabela vinha junto do registro de cada erro; o login quase não registra mais
  await limparTentativasAntigas()

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
