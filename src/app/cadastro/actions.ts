"use server"

import { createServiceClient } from "@/integrations/supabase/service"
import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { schema } from "./schema"
import { chaveDoIp, ipDaRequisicao, passouDoLimite, registrarTentativa } from "@/lib/limite-de-tentativas"
import { passouNaConferenciaHumana } from "@/lib/conferencia-humana"

// B20-05: até 5 cadastros por hora por endereço de internet.
const LIMITE_CADASTROS_POR_HORA = 5

export type ResultadoCadastro =
  | { ok: true }
  | { erro: "email_em_uso" | "dados_invalidos" | "falha" | "falha_login" | "limite" | "conferencia" }

// B19-01: o cadastro é uma operação só. Esta é a única action pública da tela — não
// recebe código de empresa de fora: a empresa nasce aqui, junto com o Admin dela.
export async function cadastrarEmpresa(dados: unknown): Promise<ResultadoCadastro> {
  const validacao = schema.safeParse(dados)
  if (!validacao.success) return { erro: "dados_invalidos" }

  const nomeEmpresa = validacao.data.nomeEmpresa.trim()
  const nomeResponsavel = validacao.data.nomeResponsavel.trim()
  const email = validacao.data.email.trim()
  const { senha } = validacao.data
  if (!nomeEmpresa || !nomeResponsavel) return { erro: "dados_invalidos" }

  // B50-02: só pessoa cadastra empresa (Cloudflare Turnstile)
  const ip = await ipDaRequisicao()
  const conferencia = (dados as { conferencia?: unknown }).conferencia
  if (!(await passouNaConferenciaHumana(conferencia, ip))) return { erro: "conferencia" }

  const chaveIp = chaveDoIp(ip)
  if (await passouDoLimite("cadastro", [{ chave: chaveIp, limite: LIMITE_CADASTROS_POR_HORA }], 60)) {
    return { erro: "limite" }
  }
  await registrarTentativa("cadastro", [chaveIp])

  const adminClient = createServiceClient()

  const { data: userData, error: userError } = await adminClient.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
  })
  if (userError) {
    if (userError.code === "email_exists") return { erro: "email_em_uso" }
    return { erro: "falha" }
  }

  const userId = userData.user.id

  const { data: workspaceId, error: cadastroError } = await adminClient.rpc("cadastrar_empresa", {
    p_user_id: userId,
    p_nome_empresa: nomeEmpresa,
    p_nome_responsavel: nomeResponsavel,
  })
  if (cadastroError || !workspaceId) {
    // A transação do banco já desfez empresa, perfil e times; falta o usuário do Auth.
    await adminClient.auth.admin.deleteUser(userId)
    return { erro: "falha" }
  }

  // B28-06: a empresa nova não ganha mais as quatro sequências prontas (B10-08):
  // as sequências saíram, e a automação faz o que elas faziam.

  const ssrClient = await createSsrClient()
  const { error: signInError } = await ssrClient.auth.signInWithPassword({ email, password: senha })
  if (signInError) return { erro: "falha_login" }

  return { ok: true }
}
