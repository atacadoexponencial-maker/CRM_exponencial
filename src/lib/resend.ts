// B51-03 / B52-01: envio de e-mail pela API do Resend (domínio disparos.atacadoexponencial.com,
// verificado). Serve ao convite e à senha nova.
//
// **Só backend.** Usa a chave do Resend.

const ENDERECO_DO_RESEND = "https://api.resend.com/emails"
export const TEMPO_LIMITE_EMAIL_MS = 10_000

export function escaparHtml(texto: string): string {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

/** `true` se o Resend aceitou. Sem chave, não manda. */
export async function enviarEmail(email: { de: string; para: string; assunto: string; html: string; texto: string }): Promise<boolean> {
  const chave = process.env.RESEND_API_KEY
  if (!chave) return false

  try {
    const resposta = await fetch(ENDERECO_DO_RESEND, {
      method: "POST",
      headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: email.de, to: [email.para], subject: email.assunto, html: email.html, text: email.texto }),
      signal: AbortSignal.timeout(TEMPO_LIMITE_EMAIL_MS),
    })
    return resposta.ok
  } catch {
    return false
  }
}

/** O desenho dos e-mails do CRM: título, um parágrafo, o botão e o rodapé com o endereço. */
export function htmlComBotao(c: { titulo: string; paragrafo: string; botao: string; link: string; rodape: string }): string {
  return `<!doctype html>
<html lang="pt-BR"><body style="margin:0;padding:24px;background:#F6F4EF;font-family:Arial,sans-serif;color:#1F1D1A">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:8px;padding:32px">
    <h1 style="font-size:20px;margin:0 0 16px">${escaparHtml(c.titulo)}</h1>
    <p style="font-size:15px;line-height:1.5;margin:0 0 24px">${escaparHtml(c.paragrafo)}</p>
    <a href="${escaparHtml(c.link)}" style="display:inline-block;background:#1F1D1A;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;font-size:15px">${escaparHtml(c.botao)}</a>
    <p style="font-size:13px;line-height:1.5;color:#6B665E;margin:24px 0 0">${escaparHtml(c.rodape)} Se o botão não abrir, copie este endereço no navegador:<br>${escaparHtml(c.link)}</p>
  </div>
</body></html>`
}
