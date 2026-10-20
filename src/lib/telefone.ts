// QA M13 (06/10/2026): telefone de contato no CRM, na mesma forma da loja: só dígitos,
// com 55 e DDD. "(11) 98888-0001" e "5511988880001" são o mesmo número.
export { normalizarWhatsapp } from "@/app/loja/components/pedido"

export const TELEFONE_INVALIDO = "Informe o WhatsApp com DDD, ex.: (21) 99999-0000."
