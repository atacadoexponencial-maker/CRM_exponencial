// Formas do mesmo celular brasileiro (veio de `catalogo/pedidos.ts`, B21-07). Num
// arquivo próprio para o motor das automações usar sem importar a loja (auditoria
// run-2, pista 7).

/**
 * Formas do mesmo celular brasileiro: o WhatsApp às vezes entrega o número sem o nono
 * dígito (55 + DDD + 8 dígitos), e a cliente digita com ele (55 + DDD + 9 + 8 dígitos).
 */
export function formasDoNumero(whatsapp: string): string[] {
  const m = /^55(\d{2})(9?)(\d{8})$/.exec(whatsapp)
  if (!m) return [whatsapp]
  const [, ddd, , resto] = m
  return [`55${ddd}9${resto}`, `55${ddd}${resto}`]
}
