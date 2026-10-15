import { User } from "lucide-react"
import { cn } from "@/lib/utils"

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/)
  if (partes.length >= 2) return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
  return partes[0][0].toUpperCase()
}

const TAMANHOS = {
  md: { circulo: "h-10 w-10 text-sm", icone: "size-5" },
  lg: { circulo: "h-16 w-16 text-xl", icone: "size-8" },
}

/**
 * Círculo do contato: as iniciais do nome ou, sem nome, o ícone de pessoa (o
 * telefone viraria um dígito solto). O CRM ainda não busca foto de perfil.
 */
export function AvatarContato({ nome, tamanho = "md" }: { nome: string | null; tamanho?: keyof typeof TAMANHOS }) {
  const t = TAMANHOS[tamanho]
  const nomeLimpo = nome?.trim()

  return (
    <div
      className={cn(
        "rounded-full bg-muted flex items-center justify-center font-medium text-muted-foreground shrink-0",
        t.circulo
      )}
    >
      {nomeLimpo ? iniciais(nomeLimpo) : <User className={t.icone} aria-label="Contato sem nome" />}
    </div>
  )
}
