import Link from "next/link"
import { cn } from "@/lib/utils"

export type AbaCatalogo = "produtos" | "aparencia" | "configuracoes" | "pedidos"

const ABAS: { id: AbaCatalogo; label: string }[] = [
  { id: "produtos", label: "Produtos" },
  { id: "aparencia", label: "Aparência" },
  { id: "configuracoes", label: "Configurações" },
  { id: "pedidos", label: "Pedidos" },
]

interface AbasCatalogoProps {
  ativa: AbaCatalogo
  /** Endereço de cada aba; `null` mostra a aba desabilitada. */
  hrefs: Record<AbaCatalogo, string | null>
}

export function AbasCatalogo({ ativa, hrefs }: AbasCatalogoProps) {
  return (
    <nav className="flex gap-1 border-b border-border mb-6" aria-label="Seções do catálogo">
      {ABAS.map((aba) => {
        const href = hrefs[aba.id]
        const classe = cn(
          "px-3 py-2 text-sm border-b-2 -mb-px transition-colors",
          aba.id === ativa
            ? "border-primary text-foreground font-medium"
            : "border-transparent text-muted-foreground hover:text-foreground"
        )
        if (!href) {
          return (
            <span key={aba.id} className={cn(classe, "opacity-40 cursor-not-allowed hover:text-muted-foreground")} title="Em breve">
              {aba.label}
            </span>
          )
        }
        return (
          <Link key={aba.id} href={href} className={classe} aria-current={aba.id === ativa ? "page" : undefined}>
            {aba.label}
          </Link>
        )
      })}
    </nav>
  )
}
