import { redirect } from "next/navigation"
import { sessaoAtual } from "@/lib/sessao"
import { carregarPedido, contarPedidosNovos, filtrarPedidos, opcoesDosFiltros } from "./actions"
import { PedidosClient } from "./pedidos-client"

export const metadata = { title: "Pedidos" }

// Pedidos: todos os papéis (Atendente também).
export default async function PedidosPage({ searchParams }: { searchParams: Promise<{ pedido?: string }> }) {
  const { user, perfil } = await sessaoAtual()
  if (!user) redirect("/login")
  if (!perfil) redirect("/perfil")

  const { pedido: pedidoId } = await searchParams
  // B39-01: primeira página com os filtros padrão, o total e as opções dos filtros.
  const [pagina, novos, opcoes, aberto] = await Promise.all([
    filtrarPedidos(),
    contarPedidosNovos(),
    opcoesDosFiltros(),
    pedidoId ? carregarPedido(pedidoId) : Promise.resolve(null),
  ])
  const { pedidos, total } = "erro" in pagina ? { pedidos: [], total: 0 } : pagina
  return (
    <PedidosClient
      inicial={pedidos}
      totalInicial={total}
      novos={novos}
      abertoInicial={aberto}
      papel={perfil.role}
      produtos={opcoes.produtos}
      atendentes={opcoes.atendentes}
    />
  )
}
