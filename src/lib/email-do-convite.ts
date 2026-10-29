// B51-03: o e-mail do convite, pela API do Resend (src/lib/resend.ts). Se o envio falha,
// quem criou o convite manda o link por outro meio.
//
// **Só backend.** Usa a chave do Resend.

import { formatarDataEHora } from "@/lib/datas"
import { enviarEmail, htmlComBotao } from "@/lib/resend"

/** Decisão do Luan em 29/10/2026 (PER-B51-06). */
export const REMETENTE_DO_CONVITE = "crmatacado exp <convite@disparos.atacadoexponencial.com>"
export const ASSUNTO_DO_CONVITE = "Seu convite para o crmatacado exp"

/** Manda o convite; `true` se o Resend aceitou. Sem chave, não manda. */
export async function enviarEmailDoConvite(para: string, link: string, expiraEm: string, fuso: string): Promise<boolean> {
  const validade = formatarDataEHora(expiraEm, fuso)
  const paragrafo = "Você recebeu um convite para criar a conta da sua empresa no crmatacado exp."
  const rodape = `O convite vale até ${validade} e serve para uma conta só.`
  return enviarEmail({
    de: REMETENTE_DO_CONVITE,
    para,
    assunto: ASSUNTO_DO_CONVITE,
    html: htmlComBotao({ titulo: ASSUNTO_DO_CONVITE, paragrafo, botao: "Criar minha conta", link, rodape }),
    texto: [paragrafo, "", `Crie sua conta por este link: ${link}`, "", rodape].join("\n"),
  })
}
