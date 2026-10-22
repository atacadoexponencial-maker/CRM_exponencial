import Link from "next/link"
import { cn } from "@/lib/utils"

/**
 * B36-05: cabeçalho do Pipeline no estilo Caderno — título, abas Entrada/Recompra com
 * sublinhado na ativa e quantos cards a aba ativa tem; à direita, busca e ações.
 */
export function CabecalhoDoPipeline({
  atual,
  quantidade,
  children,
}: {
  atual: "entrada" | "recompra"
  quantidade: number
  children: React.ReactNode
}) {
  const abas = [
    { id: "entrada", rotulo: "Entrada", href: "/pipeline" },
    { id: "recompra", rotulo: "Recompra", href: "/pipeline/recompra" },
  ] as const
  return (
    <div className="flex shrink-0 flex-wrap items-end justify-between gap-3 px-4 pt-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3">
        <span className="text-[26px] font-semibold leading-tight tracking-tight" aria-hidden="true">Pipeline</span>
        <nav aria-label="Funis" className="flex gap-6">
          {abas.map((a) => {
            const ativa = a.id === atual
            return (
              <Link
                key={a.id}
                href={a.href}
                aria-current={ativa ? "page" : undefined}
                className={cn(
                  "pb-2.5 text-sm transition-colors",
                  ativa ? "font-semibold text-foreground shadow-[inset_0_-2px_0_var(--foreground)]" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {a.rotulo}
                {ativa && <span className="numero ml-1.5 font-normal text-muted-foreground">{quantidade}</span>}
              </Link>
            )
          })}
        </nav>
      </div>
      <div className="flex flex-wrap items-center gap-2 pb-2.5">{children}</div>
    </div>
  )
}
