// B51-03: o e-mail do convite, pela API do Resend (domínio disparos.atacadoexponencial.com,
// verificado). Se o envio falha, quem criou o convite manda o link por outro meio.
//
// **Só backend.** Usa a chave do Resend.

import { formatarDataEHora } from "@/lib/datas"

const ENDERECO_DO_RESEND = "https://api.resend.com/emails"
export const TEMPO_LIMITE_EMAIL_MS = 10_000

/** Decisão do Luan em 29/10/2026 (PER-B51-06). */
export const REMETENTE_DO_CONVITE = "crmatacado exp <convite@disparos.atacadoexponencial.com>"
export const ASSUNTO_DO_CONVITE = "Seu convite para o crmatacado exp"

function escapar(texto: string): string {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

/** Manda o convite; `true` se o Resend aceitou. Sem chave, não manda. */
export async function enviarEmailDoConvite(para: string, link: string, expiraEm: string, fuso: string): Promise<boolean> {
  const chave = process.env.RESEND_API_KEY
  if (!chave) return false

  const validade = formatarDataEHora(expiraEm, fuso)
  const texto = [
    "Você recebeu um convite para criar a conta da sua empresa no crmatacado exp.",
    "",
    `Crie sua conta por este link: ${link}`,
    "",
    `O convite vale até ${validade} e serve para uma conta só.`,
  ].join("\n")
  const html = `<!doctype html>
<html lang="pt-BR"><body style="margin:0;padding:24px;background:#F6F4EF;font-family:Arial,sans-serif;color:#1F1D1A">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:8px;padding:32px">
    <h1 style="font-size:20px;margin:0 0 16px">Seu convite para o crmatacado exp</h1>
    <p style="font-size:15px;line-height:1.5;margin:0 0 24px">Você recebeu um convite para criar a conta da sua empresa no crmatacado exp.</p>
    <a href="${escapar(link)}" style="display:inline-block;background:#1F1D1A;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;font-size:15px">Criar minha conta</a>
    <p style="font-size:13px;line-height:1.5;color:#6B665E;margin:24px 0 0">O convite vale até ${escapar(validade)} e serve para uma conta só. Se o botão não abrir, copie este endereço no navegador:<br>${escapar(link)}</p>
  </div>
</body></html>`

  try {
    const resposta = await fetch(ENDERECO_DO_RESEND, {
      method: "POST",
      headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: REMETENTE_DO_CONVITE, to: [para], subject: ASSUNTO_DO_CONVITE, html, text: texto }),
      signal: AbortSignal.timeout(TEMPO_LIMITE_EMAIL_MS),
    })
    return resposta.ok
  } catch {
    return false
  }
}
