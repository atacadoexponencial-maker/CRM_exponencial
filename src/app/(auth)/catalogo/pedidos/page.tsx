import { redirect } from "next/navigation"
import { sessaoAtual } from "@/lib/sessao"
import { carregarPedido, listarPedidos } from "./actions"
import { PedidosClient } from "./pedidos-client"

// Pedidos: todos os papéis (Atendente também).
export default async function PedidosPage({ searchParams }: { searchParams: Promise<{ pedido?: string }> }) {
  const { user, perfil } = await sessaoAtual()
  if (!user) redirect("/login")
  if (!perfil) redirect("/perfil")

  const { pedido: pedidoId } = await searchParams
  const [pedidos, aberto] = await Promise.all([listarPedidos(), pedidoId ? carregarPedido(pedidoId) : Promise.resolve(null)])
  return <PedidosClient inicial={pedidos} abertoInicial={aberto} papel={perfil.role} />
}
