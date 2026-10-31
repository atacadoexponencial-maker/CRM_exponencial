/**
 * Versão da Graph API da Meta usada em todo o CRM (B57, 31/10/2026).
 *
 * A Meta aposenta cada versão cerca de dois anos depois do lançamento (a v21.0, que
 * o CRM usava, expira em 21/01/2027). Para a próxima troca, muda-se só esta linha e
 * leem-se os changelogs da Graph API e da WhatsApp Business Platform entre as duas
 * versões. Este arquivo não tem segredo: os componentes do Embedded Signup também
 * importam daqui.
 */
export const VERSAO_DA_GRAPH = "v26.0"

/** Base das chamadas: `https://graph.facebook.com/<versão>`. */
export const GRAPH = `https://graph.facebook.com/${VERSAO_DA_GRAPH}`
