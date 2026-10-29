// B52-01: o e-mail com o link de criar senha nova, pela API do Resend (src/lib/resend.ts).
//
// **Só backend.** Usa a chave do Resend.

import { enviarEmail, htmlComBotao } from "@/lib/resend"

/** Decisão do Luan em 29/10/2026 (SUP-B52-02). */
export const REMETENTE_DA_SENHA_NOVA = "crmatacado exp <conta@disparos.atacadoexponencial.com>"
export const ASSUNTO_DA_SENHA_NOVA = "Criar uma senha nova no crmatacado exp"

/** `true` se o Resend aceitou. */
export async function enviarEmailDeSenhaNova(para: string, link: string): Promise<boolean> {
  const paragrafo = "Recebemos um pedido para criar uma senha nova na sua conta do crmatacado exp."
  const rodape = "O link vale por 1 hora e serve uma vez. Se não foi você quem pediu, ignore este e-mail: sua senha continua a mesma."
  return enviarEmail({
    de: REMETENTE_DA_SENHA_NOVA,
    para,
    assunto: ASSUNTO_DA_SENHA_NOVA,
    html: htmlComBotao({ titulo: ASSUNTO_DA_SENHA_NOVA, paragrafo, botao: "Criar senha nova", link, rodape }),
    texto: [paragrafo, "", `Crie a senha nova por este link: ${link}`, "", rodape].join("\n"),
  })
}
