"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { AbasCatalogo } from "../components/abas-catalogo"
import { ListaPedidos, type PedidoResumo } from "../components/lista-pedidos"
import { DetalhePedido, type PedidoDetalhe } from "../components/detalhe-pedido"
import { BarraFiltrosPedidos } from "../components/filtros-pedidos"
import { ExportarPedidos } from "../components/exportar-pedidos"
import { hrefsDoCatalogo } from "../produtos-client"
import { carregarPedido, filtrarPedidos, mudarSituacaoPedido, type ProdutoDoFiltro } from "./actions"
import { ALVOS_TOQUE_CELULAR } from "../components/alvos-toque"
import { FILTROS_PADRAO, filtrosProntos, type FiltrosPedidos } from "@/lib/catalogo/filtros-pedidos"
import { CLASSE_DA_PAGINA } from "@/lib/pagina"
import { cn } from "@/lib/utils"

interface PedidosClientProps {
  inicial: PedidoResumo[]
  /** B39-01: total do resultado com os filtros padrão. */
  totalInicial: number
  /** Pedidos novos da empresa, para o contador da aba. */
  novos: number
  abertoInicial: PedidoDetalhe | null
  papel: string
  produtos: ProdutoDoFiltro[]
  atendentes: Array<{ id: string; nome: string }>
}

export function PedidosClient({ inicial, totalInicial, novos, abertoInicial, papel, produtos, atendentes }: PedidosClientProps) {
  const router = useRouter()
  const [pedidos, setPedidos] = useState(inicial)
  const [total, setTotal] = useState(totalInicial)
  const [aberto, setAberto] = useState<PedidoDetalhe | null>(abertoInicial)
  const [carregando, iniciar] = useTransition()

  // B39-01: filtros aplicados no servidor, sobre todos os pedidos da empresa.
  const [filtros, setFiltros] = useState<FiltrosPedidos>(FILTROS_PADRAO)
  const [carregandoMais, setCarregandoMais] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const chave = JSON.stringify(filtros)
  const chaveInicial = useRef(chave)
  const pedido = useRef(0)
  const comFiltros = chave !== JSON.stringify(FILTROS_PADRAO)

  useEffect(() => {
    // A primeira página com o padrão já veio do servidor.
    if (chave === chaveInicial.current) return
    chaveInicial.current = ""
    if (!filtrosProntos(filtros)) return
    const meu = ++pedido.current
    const t = setTimeout(() => {
      filtrarPedidos(filtros)
        .then((r) => {
          if (meu !== pedido.current) return
          if ("erro" in r) { setErro(r.erro); return }
          setErro(null)
          setPedidos(r.pedidos)
          setTotal(r.total)
        })
        .catch(() => { if (meu === pedido.current) setErro("Não foi possível aplicar os filtros.") })
    }, 300)
    return () => clearTimeout(t)
    // `filtros` muda junto com `chave`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave])

  async function carregarMais() {
    if (carregandoMais) return
    const meu = pedido.current
    setCarregandoMais(true)
    try {
      const r = await filtrarPedidos(filtros, pedidos.length)
      if (meu !== pedido.current) return
      if ("erro" in r) { setErro(r.erro); return }
      setPedidos((ps) => {
        const ids = new Set(ps.map((p) => p.id))
        return [...ps, ...r.pedidos.filter((p) => !ids.has(p.id))]
      })
    } catch {
      setErro("Não foi possível carregar mais pedidos.")
    } finally {
      setCarregandoMais(false)
    }
  }

  function abrir(id: string) {
    iniciar(async () => setAberto(await carregarPedido(id)))
  }

  return (
    <div className={cn(CLASSE_DA_PAGINA, ALVOS_TOQUE_CELULAR)}>
      <h1 className="text-[26px] font-semibold leading-tight tracking-tight mb-4">{papel === "atendente" ? "Pedidos" : "Catálogo"}</h1>
      <AbasCatalogo ativa="pedidos" hrefs={hrefsDoCatalogo(papel)} contadores={{ pedidos: novos }} />
      <div className="grid gap-6 lg:grid-cols-[1fr_24rem] items-start">
        <div className="space-y-3 min-w-0">
          <BarraFiltrosPedidos
            filtros={filtros}
            onChange={setFiltros}
            onLimpar={() => setFiltros(FILTROS_PADRAO)}
            produtos={produtos}
            atendentes={atendentes}
          />
          {/* B39-02: exportar, com os filtros e o total de agora */}
          <div className="flex justify-end">
            <ExportarPedidos filtros={filtros} totalFiltrado={total} />
          </div>
          {erro && <p className="text-xs text-erro">{erro}</p>}
          <ListaPedidos
            pedidos={pedidos}
            total={total}
            comFiltros={comFiltros}
            selecionadoId={aberto?.id ?? null}
            onSelecionar={abrir}
            onCarregarMais={carregarMais}
            carregandoMais={carregandoMais}
          />
        </div>
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
          <p className="hidden lg:block rounded-md border border-dashed bg-card/60 p-6 text-sm text-muted-foreground text-center">
            {carregando ? "Abrindo o pedido..." : "Escolha um pedido para ver os detalhes."}
          </p>
        )}
      </div>
    </div>
  )
}
