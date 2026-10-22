import { cn } from "@/lib/utils"

/**
 * Página que é sempre clara, qualquer que seja o tema escolhido (B36-01): login,
 * cadastro, páginas legais, "não encontrado" e a loja pública. Redeclara as cores
 * claras e desliga as variantes `dark:` de tudo o que fica dentro.
 */
export function TemaClaro({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div data-tema="claro" className={cn("tema-claro flex flex-1 flex-col", className)}>
      {children}
    </div>
  )
}
