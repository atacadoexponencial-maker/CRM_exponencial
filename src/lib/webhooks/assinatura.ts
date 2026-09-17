// Validação de assinatura HMAC-SHA256 de webhook, no esquema `sha256=<hex>`.
//
// A Meta usa isso em `X-Hub-Signature-256` e o nosso gateway usa o mesmo
// esquema, de propósito (seção 2 do contrato) — por isso uma função só, com o
// segredo e a assinatura recebida como parâmetro.
//
// A comparação é em tempo constante: comparar com `===` vazaria, pelo tempo de
// resposta, quantos bytes do prefixo estão certos, e isso permite descobrir uma
// assinatura válida por tentativa e erro.
//
// O segredo nunca sai daqui: não vai para log, nem para mensagem de erro, nem
// para a resposta.

import { createHmac, timingSafeEqual } from "node:crypto"

export function assinaturaHmacValida({
  corpoBruto,
  assinatura,
  segredo,
}: {
  /** Corpo exatamente como chegou, antes de qualquer parse. */
  corpoBruto: string
  /** Valor do header, no formato `sha256=<hex>`. */
  assinatura: string | null
  segredo: string
}): boolean {
  if (!assinatura) return false

  const esperada = "sha256=" + createHmac("sha256", segredo).update(corpoBruto).digest("hex")
  const a = Buffer.from(esperada)
  const b = Buffer.from(assinatura)
  return a.length === b.length && timingSafeEqual(a, b)
}
