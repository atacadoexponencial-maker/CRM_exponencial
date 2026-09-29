import { cn } from "@/lib/utils"

/** Bloco cinza pulsante usado nos estados de carregamento das rotas. */
export function Esqueleto({ className }: { className?: string }) {
  return <div aria-hidden className={cn("rounded bg-muted animate-pulse", className)} />
}

/**
 * Esqueleto genérico de página: barra de título e alguns blocos.
 * Usado pelas rotas que não têm um esqueleto próprio.
 */
export function EsqueletoPagina({
  titulo,
  blocos = 3,
  className,
}: {
  titulo?: string
  blocos?: number
  className?: string
}) {
  return (
    <div className={cn("max-w-4xl mx-auto w-full px-4 py-8", className)} role="status" aria-label="Carregando">
      <div className="flex items-center justify-between mb-6">
        {titulo ? (
          <h1 className="text-xl font-semibold">{titulo}</h1>
        ) : (
          <Esqueleto className="h-7 w-40" />
        )}
        <Esqueleto className="h-8 w-28" />
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: blocos }, (_, i) => (
          <Esqueleto key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    </div>
  )
}
