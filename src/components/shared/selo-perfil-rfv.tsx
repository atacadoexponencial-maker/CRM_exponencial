// B43-01: selo do perfil RFV do contato, com o ícone, o nome e a cor da aba RFV dos
// Relatórios. Sem compras: "Sem compras". Sem leitura (falhou): "—".

import { PERFIL_POR_ID, type PerfilRfv } from "@/lib/relatorios/rfv"
import { cn } from "@/lib/utils"

export function SeloPerfilRfv({ perfil, className }: { perfil: PerfilRfv | null | undefined; className?: string }) {
  if (perfil === undefined) return <span className={cn("text-muted-foreground", className)}>—</span>
  if (perfil === null) {
    return (
      <span className={cn("inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-xs text-muted-foreground", className)}>
        Sem compras
      </span>
    )
  }
  const p = PERFIL_POR_ID[perfil]
  return (
    <span
      className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium text-white", className)}
      style={{ backgroundColor: p.cor }}
    >
      {p.icone} {p.nome}
    </span>
  )
}
