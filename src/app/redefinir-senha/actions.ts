"use server"

// B52-02: salvar a senha nova pelo link do e-mail. A pessoa entra direto (PER-B52-02) e as
// outras sessões da conta são encerradas (PER-B52-03).

import { createServiceClient } from "@/integrations/supabase/service"
import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { hashDoCodigo } from "@/lib/convites"

export type ResultadoDaSenhaNova = { ok: true } | { erro: "senha_curta" | "senhas_diferentes" | "link_invalido" | "falha" }

export async function salvarSenhaNova(dados: { codigo: unknown; senha: unknown; confirmarSenha: unknown }): Promise<ResultadoDaSenhaNova> {
  const { codigo, senha, confirmarSenha } = dados ?? {}
  if (typeof codigo !== "string" || !codigo) return { erro: "link_invalido" }
  // A senha é conferida antes de gastar o link: erro de digitação não perde o link
  if (typeof senha !== "string" || senha.length < 8) return { erro: "senha_curta" }
  if (senha !== confirmarSenha) return { erro: "senhas_diferentes" }

  const service = createServiceClient()
  const tokenHash = hashDoCodigo(codigo)
  const { data: userId, error } = await service.rpc("usar_redefinicao_de_senha", { p_token_hash: tokenHash })
  if (error || !userId) return { erro: "link_invalido" }

  const { data: atualizado, error: erroSenha } = await service.auth.admin.updateUserById(userId as string, { password: senha })
  if (erroSenha || !atualizado.user.email) {
    // A senha não mudou: o link volta a valer para outra tentativa
    await service.from("redefinicoes_de_senha").update({ usado_em: null }).eq("token_hash", tokenHash)
    return { erro: "falha" }
  }

  // Entra com a senha nova (os cookies vão para o navegador) e derruba as outras sessões
  const ssr = await createSsrClient()
  const { error: erroLogin } = await ssr.auth.signInWithPassword({ email: atualizado.user.email, password: senha })
  // A senha já mudou: sem a sessão, o Dashboard manda ao login, onde ela vale
  if (!erroLogin) await ssr.auth.signOut({ scope: "others" })

  return { ok: true }
}
