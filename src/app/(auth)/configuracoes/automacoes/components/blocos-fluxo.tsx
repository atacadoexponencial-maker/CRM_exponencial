"use client"

// Os blocos e as setas do canvas do editor de fluxo (React Flow).
// O que cada bloco mostra além do próprio conteúdo (pendências, simulação,
// o "+" das saídas livres) vem do contexto do editor.

import { createContext, useContext, useLayoutEffect, useRef } from "react"
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
import { Copy, Hourglass, Plus, Split, StickyNote, Trash2, X, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  TEXTO_MAXIMO_DA_ANOTACAO,
  saidasDaEspera,
  type Bloco,
  type Repeticao,
  type ResultadoSimulacao,
  type Saida,
  type SaidaDaEspera,
} from "@/lib/fluxo-automacao"
import { ACOES, GATILHOS, type OpcoesEditor } from "./catalogo"
import { fraseBloco, fraseRepeticao, rotuloDaSaidaDaEspera } from "./frases-fluxo"

export type DadosBloco = { bloco: Bloco }
export type NoFluxo = Node<DadosBloco, Bloco["tipo"]>
export type LigacaoFluxo = Edge<Record<string, never>, "ligacao">

interface ContextoEditor {
  opcoes: OpcoesEditor
  pendencias: Record<string, string[]>
  /** Depois de uma tentativa de salvar, os blocos com pendência ganham borda vermelha. */
  destacarErros: boolean
  simulacao: ResultadoSimulacao | null
  /** Aparece no bloco do gatilho, onde ela é escolhida. */
  repeticao: Repeticao
  aoAdicionar: (de: string, saida: Saida) => void
  /** B59-01: a anotação edita, duplica e apaga no próprio bloco, sem o painel lateral. */
  aoMudarAnotacao: (id: string, texto: string) => void
  aoDuplicar: (id: string) => void
  aoApagar: (id: string) => void
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
  gatilho: { rotulo: "Gatilho", classe: "bg-aviso-fundo text-aviso border-aviso/30" },
  condicao: { rotulo: "Condição", classe: "bg-info-fundo text-info border-info/30" },
  acao: { rotulo: "Ação", classe: "bg-sucesso-fundo text-sucesso border-sucesso/30" },
  espera: { rotulo: "Esperar", classe: "bg-accent text-accent-foreground border-border" },
  anotacao: { rotulo: "Anotação", classe: "bg-muted text-muted-foreground border-border" },
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
  const { opcoes, pendencias, destacarErros, simulacao, repeticao } = useEditor()
  const conexoes = useNodeConnections({ handleType: "source" })
  const saidasOcupadas = new Set(conexoes.map((c) => c.sourceHandle ?? "proximo"))

  const bloco = data.bloco
  const cabecalho = CABECALHO[bloco.tipo]
  const Icone =
    bloco.tipo === "gatilho"
      ? (GATILHOS[bloco.gatilho]?.icone ?? Zap)
      : bloco.tipo === "acao"
        ? (ACOES[bloco.acao]?.icone ?? Zap)
        : bloco.tipo === "espera"
          ? Hourglass
          : Split
  const problemas = pendencias[id] ?? []
  const noCaminho = simulacao ? simulacao.blocos.includes(id) : null
  const saidaSimulada = simulacao?.saidas[id]

  // B28-02: o bloco "esperar" tem uma saída por opção ligada, espalhadas por igual
  const saidas: Array<{ saida: Saida; esquerda: string }> =
    bloco.tipo === "condicao"
      ? [
          { saida: "sim", esquerda: "28%" },
          { saida: "nao", esquerda: "72%" },
        ]
      : bloco.tipo === "espera"
        ? saidasDaEspera(bloco).map((saida, i, todas) => ({ saida, esquerda: `${((i + 0.5) / todas.length) * 100}%` }))
        : [{ saida: "proximo", esquerda: "50%" }]

  return (
    <div
      className={cn(
        "relative w-64 rounded-xl border bg-card text-card-foreground shadow-sm transition-[opacity,box-shadow]",
        selected && "ring-2 ring-primary",
        destacarErros && problemas.length > 0 && "border-destructive ring-1 ring-destructive/40",
        noCaminho === true && "ring-2 ring-sucesso",
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

      {bloco.tipo === "gatilho" && (
        <p className="-mt-1.5 px-3 pb-2.5 text-xs text-muted-foreground">{fraseRepeticao(repeticao)}</p>
      )}

      {/* Antes da primeira tentativa de salvar, o que falta é orientação, e não erro (B22-33) */}
      {problemas.length > 0 && (
        <ul className={cn("space-y-0.5 px-3 pb-2.5 text-xs", destacarErros ? "text-destructive" : "text-muted-foreground")}>
          {problemas.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}

      {bloco.tipo === "condicao" && (
        <div className="flex justify-between border-t px-3 py-1.5 text-xs font-medium">
          <span
            className={cn(
              "rounded px-1.5 text-sucesso",
              saidaSimulada === "sim" && "bg-sucesso-fundo ring-1 ring-sucesso"
            )}
          >
            sim
          </span>
          <span
            className={cn("rounded px-1.5 text-erro", saidaSimulada === "nao" && "bg-erro-fundo ring-1 ring-erro")}
          >
            não
          </span>
        </div>
      )}

      {bloco.tipo === "espera" && simulacao?.espera === id && (
        <p className="px-3 pb-2.5 text-xs font-medium text-sucesso">Aqui o contato esperaria</p>
      )}

      {bloco.tipo === "espera" && saidas.length > 0 && (
        <div
          className="grid gap-1 border-t px-1 py-1.5 text-center text-xs font-medium text-muted-foreground"
          style={{ gridTemplateColumns: `repeat(${saidas.length}, minmax(0, 1fr))` }}
        >
          {saidas.map(({ saida }) => (
            <span key={saida}>{rotuloDaSaidaDaEspera(bloco, saida as SaidaDaEspera)}</span>
          ))}
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

/**
 * B59-01: texto solto no desenho, com borda tracejada para não parecer um passo do
 * caminho. Sem alças, sem "+" e fora da simulação. Arrasta pelo cabeçalho, porque o
 * campo de texto usa o clique para escrever.
 */
function BlocoDeAnotacao({ id, data, selected }: NodeProps<NoFluxo>) {
  const { aoMudarAnotacao, aoDuplicar, aoApagar } = useEditor()
  const texto = data.bloco.tipo === "anotacao" ? data.bloco.texto : ""
  const campo = useRef<HTMLTextAreaElement>(null)

  // O campo cresce com o texto (SUP-B59-01)
  useLayoutEffect(() => {
    if (!campo.current) return
    campo.current.style.height = "auto"
    campo.current.style.height = `${campo.current.scrollHeight}px`
  }, [texto])

  return (
    <div
      className={cn(
        "w-64 rounded-xl border border-dashed border-muted-foreground/50 bg-card text-card-foreground shadow-sm",
        selected && "ring-2 ring-primary"
      )}
    >
      <div
        className={cn(
          "flex min-h-8 items-center gap-1.5 rounded-t-xl border-b px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-wide",
          CABECALHO.anotacao.classe
        )}
      >
        <StickyNote className="size-3.5" />
        <span className="flex-1">{CABECALHO.anotacao.rotulo}</span>
        {selected && (
          <>
            <Button type="button" variant="ghost" size="icon-xs" className="nodrag" aria-label="Duplicar" title="Duplicar" onClick={() => aoDuplicar(id)}>
              <Copy />
            </Button>
            <Button type="button" variant="ghost" size="icon-xs" className="nodrag" aria-label="Apagar" title="Apagar" onClick={() => aoApagar(id)}>
              <Trash2 />
            </Button>
          </>
        )}
      </div>
      <textarea
        ref={campo}
        aria-label="Texto da anotação"
        placeholder="Escreva aqui uma explicação…"
        rows={2}
        maxLength={TEXTO_MAXIMO_DA_ANOTACAO}
        value={texto}
        onChange={(e) => aoMudarAnotacao(id, e.target.value)}
        className="nodrag nopan nowheel block w-full resize-none overflow-hidden rounded-b-xl bg-transparent px-3 py-2.5 text-sm leading-snug outline-none placeholder:text-muted-foreground"
      />
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
          stroke: percorrida ? "var(--sucesso)" : undefined,
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
  espera: BlocoDoFluxo,
  anotacao: BlocoDeAnotacao,
}

export const TIPOS_DE_LIGACAO = { ligacao: LigacaoComBotao }
