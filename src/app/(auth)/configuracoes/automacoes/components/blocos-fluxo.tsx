"use client"

// Os blocos e as setas do canvas do editor de fluxo (React Flow).
// O que cada bloco mostra além do próprio conteúdo (pendências, simulação,
// o "+" das saídas livres) vem do contexto do editor.

import { createContext, useContext } from "react"
import {
  BaseEdge,
  EdgeLabelRenderer,
  Handle,
  Position,
  getSmoothStepPath,
  useNodeConnections,
  useReactFlow,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
} from "@xyflow/react"
import { Plus, Split, X, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Bloco, ResultadoSimulacao, Saida } from "@/lib/fluxo-automacao"
import { ACOES, GATILHOS, type OpcoesEditor } from "./catalogo"
import { fraseBloco } from "./frases-fluxo"

export type DadosBloco = { bloco: Bloco }
export type NoFluxo = Node<DadosBloco, Bloco["tipo"]>
export type LigacaoFluxo = Edge<Record<string, never>, "ligacao">

interface ContextoEditor {
  opcoes: OpcoesEditor
  pendencias: Record<string, string[]>
  /** Depois de uma tentativa de salvar, os blocos com pendência ganham borda vermelha. */
  destacarErros: boolean
  simulacao: ResultadoSimulacao | null
  aoAdicionar: (de: string, saida: Saida) => void
}

export const ContextoEditorFluxo = createContext<ContextoEditor | null>(null)

function useEditor(): ContextoEditor {
  const ctx = useContext(ContextoEditorFluxo)
  if (!ctx) throw new Error("Bloco do fluxo fora do editor")
  return ctx
}

/** A seta de → para foi percorrida na simulação? */
function ligacaoPercorrida(simulacao: ResultadoSimulacao, de: string, para: string): boolean {
  return simulacao.blocos.some((id, i) => id === de && simulacao.blocos[i + 1] === para)
}

const CABECALHO = {
  gatilho: { rotulo: "Gatilho", classe: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  condicao: { rotulo: "Condição", classe: "bg-sky-500/15 text-sky-300 border-sky-500/30" },
  acao: { rotulo: "Ação", classe: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
} as const

const classeAlca = "size-3! border-2! border-background! bg-muted-foreground!"

function BotaoAdicionar({ de, saida, esquerda }: { de: string; saida: Saida; esquerda: string }) {
  const { aoAdicionar } = useEditor()
  return (
    <button
      type="button"
      aria-label="Adicionar o próximo bloco"
      title="Adicionar o próximo bloco"
      onClick={() => aoAdicionar(de, saida)}
      className="nodrag nopan absolute top-full mt-3 flex size-6 -translate-x-1/2 items-center justify-center rounded-full border border-dashed border-muted-foreground/60 bg-background text-muted-foreground transition-colors hover:border-primary hover:text-primary"
      style={{ left: esquerda }}
    >
      <Plus className="size-3.5" />
    </button>
  )
}

function BlocoDoFluxo({ id, data, selected }: NodeProps<NoFluxo>) {
  const { opcoes, pendencias, destacarErros, simulacao } = useEditor()
  const conexoes = useNodeConnections({ handleType: "source" })
  const saidasOcupadas = new Set(conexoes.map((c) => c.sourceHandle ?? "proximo"))

  const bloco = data.bloco
  const cabecalho = CABECALHO[bloco.tipo]
  const Icone =
    bloco.tipo === "gatilho"
      ? (GATILHOS[bloco.gatilho]?.icone ?? Zap)
      : bloco.tipo === "acao"
        ? (ACOES[bloco.acao]?.icone ?? Zap)
        : Split
  const problemas = pendencias[id] ?? []
  const noCaminho = simulacao ? simulacao.blocos.includes(id) : null
  const saidaSimulada = simulacao?.saidas[id]

  const saidas: Array<{ saida: Saida; esquerda: string }> =
    bloco.tipo === "condicao"
      ? [
          { saida: "sim", esquerda: "28%" },
          { saida: "nao", esquerda: "72%" },
        ]
      : [{ saida: "proximo", esquerda: "50%" }]

  return (
    <div
      className={cn(
        "relative w-64 rounded-xl border bg-card text-card-foreground shadow-sm transition-[opacity,box-shadow]",
        selected && "ring-2 ring-primary",
        destacarErros && problemas.length > 0 && "border-destructive ring-1 ring-destructive/40",
        noCaminho === true && "ring-2 ring-emerald-500",
        noCaminho === false && "opacity-35"
      )}
    >
      {bloco.tipo !== "gatilho" && <Handle type="target" position={Position.Top} className={classeAlca} />}

      <div
        className={cn(
          "flex items-center gap-1.5 rounded-t-xl border-b px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-wide",
          cabecalho.classe
        )}
      >
        <Icone className="size-3.5" />
        {cabecalho.rotulo}
      </div>

      <p className="px-3 py-2.5 text-sm leading-snug">{fraseBloco(bloco, opcoes)}</p>

      {problemas.length > 0 && (
        <ul className="space-y-0.5 px-3 pb-2.5 text-xs text-destructive">
          {problemas.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}

      {bloco.tipo === "condicao" && (
        <div className="flex justify-between border-t px-3 py-1.5 text-xs font-medium">
          <span
            className={cn(
              "rounded px-1.5 text-emerald-400",
              saidaSimulada === "sim" && "bg-emerald-500/20 ring-1 ring-emerald-500"
            )}
          >
            sim
          </span>
          <span
            className={cn("rounded px-1.5 text-rose-400", saidaSimulada === "nao" && "bg-rose-500/20 ring-1 ring-rose-500")}
          >
            não
          </span>
        </div>
      )}

      {saidas.map(({ saida, esquerda }) => (
        <Handle
          key={saida}
          type="source"
          position={Position.Bottom}
          id={saida}
          className={classeAlca}
          style={{ left: esquerda }}
        />
      ))}

      {saidas
        .filter(({ saida }) => !saidasOcupadas.has(saida))
        .map(({ saida, esquerda }) => (
          <BotaoAdicionar key={saida} de={id} saida={saida} esquerda={esquerda} />
        ))}
    </div>
  )
}

function LigacaoComBotao({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
}: EdgeProps<LigacaoFluxo>) {
  const { setEdges } = useReactFlow()
  const { simulacao } = useEditor()
  const [caminho, meioX, meioY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 12,
  })
  const percorrida = simulacao ? ligacaoPercorrida(simulacao, source, target) : null

  return (
    <>
      <BaseEdge
        id={id}
        path={caminho}
        markerEnd={markerEnd}
        style={{
          stroke: percorrida ? "#10b981" : undefined,
          strokeWidth: percorrida ? 2.5 : 1.5,
          opacity: percorrida === false ? 0.3 : 1,
        }}
      />
      <EdgeLabelRenderer>
        <button
          type="button"
          aria-label="Remover ligação"
          title="Remover ligação"
          onClick={() => setEdges((ligacoes) => ligacoes.filter((l) => l.id !== id))}
          className="nodrag nopan pointer-events-auto absolute flex size-5 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm transition-colors hover:border-destructive hover:text-destructive"
          style={{ transform: `translate(-50%, -50%) translate(${meioX}px, ${meioY}px)` }}
        >
          <X className="size-3" />
        </button>
      </EdgeLabelRenderer>
    </>
  )
}

// Fora do componente, como pede a documentação: recriar a cada render remonta os blocos.
export const TIPOS_DE_BLOCO = {
  gatilho: BlocoDoFluxo,
  condicao: BlocoDoFluxo,
  acao: BlocoDoFluxo,
}

export const TIPOS_DE_LIGACAO = { ligacao: LigacaoComBotao }
