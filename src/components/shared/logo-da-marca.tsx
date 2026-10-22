import Image from "next/image"
import { cn } from "@/lib/utils"

/**
 * Logo do crmatacado exp na versão do tema (B36-01): grafite no claro, branca no
 * escuro. As duas vão no HTML e o CSS mostra uma só, então não pisca ao carregar.
 * Dentro de `.tema-claro` a variante `dark:` não vale e fica sempre a grafite.
 */
export function LogoDaMarca({ className, priority = true }: { className?: string; priority?: boolean }) {
  return (
    <>
      <Image
        src="/logo-crmatacado-exp-grafite.png"
        alt="crmatacado exp"
        width={720}
        height={382}
        priority={priority}
        data-logo="grafite"
        className={cn("w-auto dark:hidden", className)}
      />
      <Image
        src="/logo-crmatacado-exp.png"
        alt="crmatacado exp"
        width={720}
        height={349}
        priority={priority}
        data-logo="branca"
        className={cn("hidden w-auto dark:block", className)}
      />
    </>
  )
}
