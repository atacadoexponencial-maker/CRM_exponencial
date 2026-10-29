// B50-02: conferência de que quem cadastra uma empresa ou fecha um pedido na loja é uma
// pessoa (Cloudflare Turnstile). A tela gera a conferência; aqui o servidor a confirma
// com a Cloudflare.
//
// Decisão da Marcelle (29/10/2026, PER-B50-01): se a Cloudflare não responde, passa,
// para não perder venda. Com ela no ar, conferência ausente ou inválida é recusada.
//
// **Só backend.** Usa a chave secreta.

const ENDERECO_DA_CONFERENCIA = "https://challenges.cloudflare.com/turnstile/v0/siteverify"
export const TEMPO_LIMITE_CONFERENCIA_MS = 5_000

export const AVISO_CONFERENCIA_HUMANA = "Não foi possível confirmar que você é uma pessoa. Tente de novo."

/** A conferência vale? `true` também quando a Cloudflare não responde. */
export async function passouNaConferenciaHumana(conferencia: unknown, ip: string | null): Promise<boolean> {
  const segredo = process.env.TURNSTILE_SECRET_KEY
  // Sem a chave, nada a confirmar: recusa, para a falta dela não desligar a proteção calada
  if (!segredo) return false

  const corpo = new URLSearchParams({ secret: segredo, response: typeof conferencia === "string" ? conferencia : "" })
  if (ip && ip !== "desconhecido") corpo.set("remoteip", ip)

  let resposta: Response
  try {
    resposta = await fetch(ENDERECO_DA_CONFERENCIA, {
      method: "POST",
      body: corpo,
      signal: AbortSignal.timeout(TEMPO_LIMITE_CONFERENCIA_MS),
    })
  } catch {
    return true // a Cloudflare não respondeu (rede ou tempo esgotado)
  }
  // Fora do ar responde 5xx; a recusa da conferência vem com 200 e success false
  if (resposta.status >= 500) return true

  const dados = (await resposta.json().catch(() => null)) as { success?: unknown } | null
  return dados?.success === true
}
