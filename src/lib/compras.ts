// B30-01: o que a compra do contato guarda além de data e valor. Compartilhado
// pelo diálogo (validação na tela) e pela ação do servidor (validação de verdade).

import { z } from "zod"

export const FORMAS_PAGAMENTO = [
  "pix",
  "boleto",
  "cartao_credito",
  "cartao_debito",
  "transferencia",
  "dinheiro",
  "cheque",
  "outro",
] as const
export type FormaPagamento = (typeof FORMAS_PAGAMENTO)[number]

export const ROTULO_FORMA_PAGAMENTO: Record<FormaPagamento, string> = {
  pix: "Pix",
  boleto: "Boleto",
  cartao_credito: "Cartão de crédito",
  cartao_debito: "Cartão de débito",
  transferencia: "Transferência",
  dinheiro: "Dinheiro",
  cheque: "Cheque",
  outro: "Outro",
}

export const ORIGENS_COMPRA = ["manual", "catalogo", "externa"] as const
export type OrigemCompra = (typeof ORIGENS_COMPRA)[number]

export const ROTULO_ORIGEM_COMPRA: Record<OrigemCompra, string> = {
  manual: "Manual",
  catalogo: "Catálogo",
  externa: "Externa",
}

/** O que chega do diálogo: texto cru dos campos. Vazio = não informado. */
const numeroOpcional = (texto: string) => texto.trim() === "" ? null : Number(texto.replace(",", "."))

export const esquemaCompra = z.object({
  data: z.string().min(1, "Data é obrigatória"),
  valor: z
    .string()
    .min(1, "Valor é obrigatório")
    .transform((v) => parseFloat(v.replace(",", ".")))
    .refine((v) => !isNaN(v) && v > 0, "Valor deve ser maior que zero"),
  pecas: z
    .string()
    .default("")
    .transform(numeroOpcional)
    .refine((n) => n === null || (Number.isInteger(n) && n >= 0), "Peças deve ser um número inteiro maior ou igual a zero"),
  desconto: z
    .string()
    .default("")
    .transform(numeroOpcional)
    .refine((n) => n === null || (!isNaN(n) && n >= 0), "Desconto não pode ser negativo"),
  formaPagamento: z
    .string()
    .default("")
    .transform((v) => (v === "" ? null : v))
    .refine((v): v is FormaPagamento | null => v === null || (FORMAS_PAGAMENTO as readonly string[]).includes(v), "Forma de pagamento inválida"),
  atendenteId: z
    .string()
    .default("")
    .transform((v) => (v === "" ? null : v)),
})

export type CompraEntrada = z.input<typeof esquemaCompra>
export type CompraValidada = z.output<typeof esquemaCompra>

/**
 * Quem vem marcado no diálogo de registrar compra: o atendente do contato,
 * senão quem está registrando.
 */
export function atendenteSugerido(atendenteDoContato: string | null | undefined, usuarioLogado: string): string {
  return atendenteDoContato ?? usuarioLogado
}
