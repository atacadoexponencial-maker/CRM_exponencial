"use client"

// Protótipo da B16-04: lista e detalhe de pedidos com dados fixos. Mudar a situação vale só
// nesta tela. A B16-10 troca por actions do servidor e apaga esta pasta.

import { useState } from "react"
import { AbasCatalogo, type AbaCatalogo } from "../../components/abas-catalogo"
import { ListaPedidos } from "../../components/lista-pedidos"
import { DetalhePedido, type PedidoDetalhe } from "../../components/detalhe-pedido"
import { SecaoPedidosContato } from "../../components/secao-pedidos-contato"
import { pedidosExemplo } from "../dados-exemplo"
import { FaixaPrototipo, HREFS_PROTOTIPO } from "../compartilhado"

export function PrototipoPedidosClient({ agoraMs, papel }: { agoraMs: number; papel: string }) {
  const [pedidos, setPedidos] = useState<PedidoDetalhe[]>(() => pedidosExemplo(agoraMs))
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null)
  const selecionado = pedidos.find((p) => p.id === selecionadoId) ?? null
  const novos = pedidos.filter((p) => p.situacao === "novo").length

  // Atendente só enxerga Pedidos.
  const hrefs: Record<AbaCatalogo, string | null> =
    papel === "atendente" ? { produtos: null, aparencia: null, configuracoes: null, pedidos: HREFS_PROTOTIPO.pedidos } : HREFS_PROTOTIPO

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <FaixaPrototipo>Mudar a situação vale só nesta tela; o estoque não muda.</FaixaPrototipo>
      <div className="max-w-6xl mx-auto w-full px-4 py-8">
        <h1 className="text-xl font-semibold mb-4">Catálogo</h1>
        <AbasCatalogo ativa="pedidos" hrefs={hrefs} contadores={{ pedidos: novos }} />
        <div className="grid gap-6 lg:grid-cols-[1fr_24rem] items-start">
          <ListaPedidos pedidos={pedidos} selecionadoId={selecionadoId} onSelecionar={setSelecionadoId} agora={new Date(agoraMs)} />
          {selecionado ? (
            <div className="fixed inset-0 z-30 bg-background p-3 overflow-y-auto lg:static lg:z-auto lg:bg-transparent lg:p-0 space-y-4">
              <DetalhePedido
                pedido={selecionado}
                onFechar={() => setSelecionadoId(null)}
                onMudarSituacao={async (para) => {
                  setPedidos((ps) =>
                    ps.map((p) =>
                      p.id === selecionado.id
                        ? { ...p, situacao: para, historico: [...p.historico, { de: p.situacao, para, por: "Você", em: new Date().toISOString() }] }
                        : p
                    )
                  )
                  return {}
                }}
              />
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Como aparece no perfil de {selecionado.cliente.nome}:</p>
                <SecaoPedidosContato
                  pedidos={pedidos.filter((p) => p.cliente.whatsapp === selecionado.cliente.whatsapp)}
                  hrefPedido={() => "/catalogo/prototipo/pedidos"}
                />
              </div>
            </div>
          ) : (
            <p className="hidden lg:block rounded-lg border border-dashed p-6 text-sm text-muted-foreground text-center">Escolha um pedido para ver os detalhes.</p>
          )}
        </div>
      </div>
    </div>
  )
}
