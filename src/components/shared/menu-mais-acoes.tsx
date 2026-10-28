"use client"

// B48-16: ação perigosa (excluir, apagar de vez) não fica ao lado dos botões comuns:
// vai para este menu "⋯", como item vermelho (DropdownMenuItem variant="destructive").

import type { ReactNode } from "react"
import { MoreHorizontal } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export function MenuMaisAcoes({ rotulo, children, className }: { rotulo: string; children: ReactNode; className?: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={rotulo}
        title={rotulo}
        className={cn(
          "inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
          className
        )}
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">{children}</DropdownMenuContent>
    </DropdownMenu>
  )
}
