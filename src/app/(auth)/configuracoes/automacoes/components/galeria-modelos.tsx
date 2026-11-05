"use client"

// B59-02: os modelos de automação, em cartões. Aparecem na galeria do botão "Modelos"
// e, com a lista vazia, direto na tela, embaixo de "Criar a primeira automação".

import { Button } from "@/components/ui/button"
import { Dialog, DialogDescription, DialogPopup, DialogTitle } from "@/components/ui/dialog"
import { MODELOS, type ModeloDeAutomacao } from "@/lib/automacoes/modelos"
import { cn } from "@/lib/utils"
import { ACOES, GATILHOS } from "./catalogo"

/**
 * Prévia do caminho do modelo, do gatilho em diante, em uma linha: "Mensagem recebida
 * do cliente → Condição → Mover card para etapa". Blocos lado a lado (as saídas de uma
 * condição ou de uma espera) vão separados por " / ". Anotações não entram.
 */
export function passosDoModelo(modelo: ModeloDeAutomacao): string {
  const porId = new Map(modelo.fluxo.blocos.map((b) => [b.id, b]))
  let nivel = modelo.fluxo.blocos.filter((b) => b.tipo === "gatilho").map((b) => b.id)
  const vistos = new Set<string>()
  const partes: string[] = []
  while (nivel.length > 0) {
    nivel.forEach((id) => vistos.add(id))
    const nomes = nivel.map((id) => {
      const b = porId.get(id)!
      if (b.tipo === "gatilho") return GATILHOS[b.gatilho].rotulo
      if (b.tipo === "acao") return ACOES[b.acao].rotulo
      return b.tipo === "espera" ? "Esperar" : "Condição"
    })
    partes.push(nomes.join(" / "))
    nivel = modelo.fluxo.ligacoes.filter((l) => nivel.includes(l.de) && !vistos.has(l.para)).map((l) => l.para)
  }
  return partes.join(" → ")
}

export function CartoesDeModelos({ onUsar, className }: { onUsar: (modeloId: string) => void; className?: string }) {
  return (
    <ul className={cn("grid gap-2 sm:grid-cols-2", className)}>
      {MODELOS.map((modelo) => (
        <li key={modelo.id} className="flex flex-col gap-2 rounded-lg border bg-card p-3 text-left">
          <p className="text-sm font-medium">{modelo.titulo}</p>
          <p className="text-xs text-muted-foreground">{modelo.descricao}</p>
          <p className="flex-1 rounded-md bg-muted/60 px-2 py-1.5 text-xs text-muted-foreground">{passosDoModelo(modelo)}</p>
          <Button size="sm" variant="outline" className="self-start" aria-label={`Usar modelo: ${modelo.titulo}`} onClick={() => onUsar(modelo.id)}>
            Usar modelo
          </Button>
        </li>
      ))}
    </ul>
  )
}

export function GaleriaModelos({
  aberta,
  onFechar,
  onUsar,
}: {
  aberta: boolean
  onFechar: () => void
  onUsar: (modeloId: string) => void
}) {
  return (
    <Dialog open={aberta} onOpenChange={(open) => !open && onFechar()}>
      <DialogPopup className="max-h-[85dvh] max-w-md overflow-y-auto sm:max-w-2xl">
        <DialogTitle>Modelos de automação</DialogTitle>
        <DialogDescription className="mb-4">
          O modelo abre como automação nova e desligada, com anotações explicando cada parte e o que mudar. Nada é salvo até você clicar em Salvar.
        </DialogDescription>
        <CartoesDeModelos onUsar={onUsar} />
      </DialogPopup>
    </Dialog>
  )
}
