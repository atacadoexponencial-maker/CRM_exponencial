"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { AbasCatalogo } from "../components/abas-catalogo"
import { ListaPedidos, type PedidoResumo } from "../components/lista-pedidos"
import { DetalhePedido, type PedidoDetalhe } from "../components/detalhe-pedido"
import { hrefsDoCatalogo } from "../produtos-client"
import { carregarPedido, mudarSituacaoPedido } from "./actions"

interface PedidosClientProps {
  inicial: PedidoResumo[]
  abertoInicial: PedidoDetalhe | null
  papel: string
}

export function PedidosClient({ inicial, abertoInicial, papel }: PedidosClientProps) {
  const router = useRouter()
  const [pedidos, setPedidos] = useState(inicial)
  const [aberto, setAberto] = useState<PedidoDetalhe | null>(abertoInicial)
  const [carregando, iniciar] = useTransition()
  const novos = pedidos.filter((p) => p.situacao === "novo").length

  function abrir(id: string) {
    iniciar(async () => setAberto(await carregarPedido(id)))
  }

  return (
    <div className="max-w-6xl mx-auto w-full px-4 py-8">
      <h1 className="text-xl font-semibold mb-4">{papel === "atendente" ? "Pedidos" : "Catálogo"}</h1>
      <AbasCatalogo ativa="pedidos" hrefs={hrefsDoCatalogo(papel)} contadores={{ pedidos: novos }} />
      <div className="grid gap-6 lg:grid-cols-[1fr_24rem] items-start">
        <ListaPedidos pedidos={pedidos} selecionadoId={aberto?.id ?? null} onSelecionar={abrir} />
        {aberto ? (
          <div className="fixed inset-0 z-30 bg-background p-3 overflow-y-auto lg:static lg:z-auto lg:bg-transparent lg:p-0">
            <DetalhePedido
              key={aberto.id + aberto.situacao}
              pedido={aberto}
              onFechar={() => setAberto(null)}
              onMudarSituacao={async (para) => {
                const r = await mudarSituacaoPedido(aberto.id, para)
                if (r.erro) return { erro: r.erro }
                if (r.pedido) {
                  setAberto(r.pedido)
                  setPedidos((ps) => ps.map((p) => (p.id === r.pedido!.id ? { ...p, situacao: r.pedido!.situacao } : p)))
                  router.refresh() // contador do menu
                }
                return {}
              }}
            />
          </div>
        ) : (
          <p className="hidden lg:block rounded-lg border border-dashed p-6 text-sm text-muted-foreground text-center">
            {carregando ? "Abrindo o pedido..." : "Escolha um pedido para ver os detalhes."}
          </p>
        )}
      </div>
    </div>
  )
}
