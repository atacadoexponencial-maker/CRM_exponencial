// Exportação do histórico de compras do contato (B30-04): as mesmas colunas da tabela
// do perfil, na mesma ordem, prontas para `gerarPlanilha`.

import type { Compra } from "@/app/(auth)/contatos/mock-contatos"
import { ROTULO_FORMA_PAGAMENTO, ROTULO_ORIGEM_COMPRA } from "@/lib/compras"
import type { ColunaPlanilha } from "@/lib/exportar-planilha"

/** "dd/mm/aaaa" (como o perfil mostra) → Date local à meia-noite. */
export function dataDaCompra(data: string): Date | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(data)
  if (!m) return null
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]))
}

export const COLUNAS_EXPORTACAO_COMPRAS: ColunaPlanilha<Compra>[] = [
  { titulo: "Data", tipo: "data", valor: (c) => dataDaCompra(c.data) },
  { titulo: "Valor", tipo: "moeda", valor: (c) => c.valor, largura: 14 },
  { titulo: "Peças", tipo: "numero", valor: (c) => c.pecas ?? null },
  { titulo: "Desconto", tipo: "moeda", valor: (c) => c.desconto ?? null, largura: 14 },
  { titulo: "Forma de pagamento", tipo: "texto", valor: (c) => (c.formaPagamento ? ROTULO_FORMA_PAGAMENTO[c.formaPagamento] : null) },
  { titulo: "Atendente", tipo: "texto", valor: (c) => c.atendente ?? null, largura: 24 },
  { titulo: "Origem", tipo: "texto", valor: (c) => ROTULO_ORIGEM_COMPRA[c.origem ?? "manual"] },
  { titulo: "Pedido", tipo: "texto", valor: (c) => (c.pedidoNumero ? `#${c.pedidoNumero}` : null) },
]

export const TITULOS_EXPORTACAO_COMPRAS = COLUNAS_EXPORTACAO_COMPRAS.map((c) => c.titulo)
