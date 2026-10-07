import Link from "next/link"
import { formatarDataCurta } from "@/lib/datas"
import { formatarPreco } from "./lista-produtos"
import { SeloSituacao, type PedidoResumo } from "./lista-pedidos"

/** Seção "Pedidos do catálogo" do perfil do contato. */
export function SecaoPedidosContato({ pedidos, hrefPedido }: { pedidos: PedidoResumo[]; hrefPedido: (id: string) => string }) {
  return (
    <section className="rounded-lg border p-4 space-y-3">
      <h2 className="text-sm font-semibold">Pedidos do catálogo</h2>
      {pedidos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum pedido feito pela loja.</p>
      ) : (
        <ul className="divide-y">
          {pedidos.map((p) => (
            <li key={p.id}>
              <Link href={hrefPedido(p.id)} className="flex items-center gap-3 py-2 hover:bg-muted/30 rounded-md px-1">
                <span className="text-sm font-medium">#{p.numero}</span>
                <span className="text-xs text-muted-foreground flex-1">{formatarDataCurta(p.criadoEm)}</span>
                <span className="text-sm">{formatarPreco(p.total)}</span>
                <SeloSituacao situacao={p.situacao} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
