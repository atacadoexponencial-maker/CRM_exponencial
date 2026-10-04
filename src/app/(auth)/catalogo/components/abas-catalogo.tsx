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
  /** Endereço de cada aba; `null` esconde a aba (ex.: o Atendente só vê Pedidos). */
  hrefs: Record<AbaCatalogo, string | null>
  /** Número ao lado do nome da aba (ex.: pedidos Novos). */
  contadores?: Partial<Record<AbaCatalogo, number>>
}

export function AbasCatalogo({ ativa, hrefs, contadores }: AbasCatalogoProps) {
  const visiveis = ABAS.filter((aba) => hrefs[aba.id] !== null)
  // Uma aba só não é navegação: o título da página já diz onde se está.
  if (visiveis.length < 2) return null
  return (
    <nav className="flex gap-1 border-b border-border mb-6" aria-label="Seções do catálogo">
      {visiveis.map((aba) => {
        const href = hrefs[aba.id]!
        const classe = cn(
          "px-3 py-2 text-sm border-b-2 -mb-px transition-colors",
          aba.id === ativa
            ? "border-primary text-foreground font-medium"
            : "border-transparent text-muted-foreground hover:text-foreground"
        )
        const contador = contadores?.[aba.id]
        const rotulo = (
          <>
            {aba.label}
            {contador ? (
              <span className="ml-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground tabular-nums" aria-label={`${contador} novos`}>
                {contador}
              </span>
            ) : null}
          </>
        )
        return (
          <Link key={aba.id} href={href} className={classe} aria-current={aba.id === ativa ? "page" : undefined}>
            {rotulo}
          </Link>
        )
      })}
    </nav>
  )
}
