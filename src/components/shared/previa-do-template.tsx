import { ExternalLink, Phone, Copy, Reply, Image as ImageIcon, Video, FileText, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"
import { ROTULO_DO_CABECALHO, type PartesDoTemplate, type BotaoDoTemplate } from "@/lib/templates-da-meta"

// B54-01: o template desenhado como um balão do WhatsApp: cabeçalho, corpo, rodapé e
// botões. Cabeçalho de mídia mostra a marca do tipo no lugar do arquivo. O balão segue
// o preview que a campanha já usa (`bg-sucesso-fundo`).

export const AVISO_SEM_CONTEUDO = "A Meta não devolveu o conteúdo deste template"

const ICONE_DA_MIDIA = {
  imagem: ImageIcon,
  video: Video,
  documento: FileText,
  localizacao: MapPin,
} as const

const ICONE_DO_BOTAO: Record<BotaoDoTemplate["tipo"], typeof Reply | null> = {
  resposta_rapida: Reply,
  link: ExternalLink,
  telefone: Phone,
  copiar_codigo: Copy,
  outro: null,
}

export function PreviaDoTemplate({
  partes,
  className,
}: {
  partes: PartesDoTemplate | null
  className?: string
}) {
  if (!partes) {
    return <p className={cn("text-sm text-muted-foreground", className)}>{AVISO_SEM_CONTEUDO}</p>
  }

  const cabecalho = partes.cabecalho
  const IconeDaMidia = cabecalho && cabecalho.tipo !== "texto" ? ICONE_DA_MIDIA[cabecalho.tipo] : null

  return (
    <div className={cn("max-w-sm text-sm", className)} data-testid="previa-do-template">
      <div className="rounded-lg bg-sucesso-fundo px-3 py-2 whitespace-pre-wrap">
        {cabecalho && cabecalho.tipo === "texto" && (
          <p className="font-semibold mb-1" data-testid="previa-cabecalho">{cabecalho.texto}</p>
        )}
        {cabecalho && cabecalho.tipo !== "texto" && IconeDaMidia && (
          <div
            className="mb-2 flex h-20 items-center justify-center gap-2 rounded-md bg-foreground/5 text-muted-foreground"
            data-testid="previa-cabecalho-midia"
          >
            <IconeDaMidia className="size-5" />
            <span>{ROTULO_DO_CABECALHO[cabecalho.tipo]}</span>
          </div>
        )}
        <p data-testid="previa-corpo">{partes.corpo}</p>
        {partes.rodape && (
          <p className="mt-1 text-xs text-muted-foreground" data-testid="previa-rodape">{partes.rodape}</p>
        )}
      </div>
      {partes.botoes.length > 0 && (
        <div className="mt-1 flex flex-col gap-1">
          {partes.botoes.map((b, i) => {
            const Icone = ICONE_DO_BOTAO[b.tipo]
            return (
              <div
                key={i}
                className="flex items-center justify-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-primary"
                data-testid="previa-botao"
              >
                {Icone && <Icone className="size-3.5" />}
                {b.texto}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
