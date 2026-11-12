// Auditoria run-2 (pista 6, 06/11/2026): o endereço do CRM nos links que saem por
// e-mail (senha nova, convite).
//
// Antes, o link usava o domínio da requisição (`x-forwarded-host` ou `host`), para quem
// pede na prévia receber link da prévia. Mas esse cabeçalho é de quem pede: um link de
// senha nova podia sair apontando para outro site e entregar o código a ele. Agora o
// domínio vem das variáveis que a própria Vercel define em cada deploy, e a prévia
// continua levando à prévia.
//
// **Só backend.**

const PRODUCAO = "https://crmatacadoexp.com"
const LOCAL = "http://localhost:3000"

/** Origem do CRM neste deploy, sem barra no fim. */
export function enderecoDoApp(): string {
  const configurado = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "")
  if (process.env.VERCEL_ENV === "production") return configurado || PRODUCAO
  const previa = process.env.VERCEL_BRANCH_URL || process.env.VERCEL_URL
  if (previa) return `https://${previa}`
  return configurado || LOCAL
}
