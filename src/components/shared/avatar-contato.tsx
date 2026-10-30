"use client"

import { useState } from "react"
import { User } from "lucide-react"
import { cn } from "@/lib/utils"
import { iniciaisDoNome } from "@/lib/iniciais"

const TAMANHOS = {
  md: { circulo: "h-10 w-10 text-sm", icone: "size-5" },
  lg: { circulo: "h-16 w-16 text-xl", icone: "size-8" },
}

/**
 * Círculo do contato: a foto de perfil, quando o CRM tem uma cópia (B29);
 * senão as iniciais do nome ou, sem nome, o ícone de pessoa (o telefone
 * viraria um dígito solto). Foto que não carrega (endereço assinado vencido,
 * arquivo sumiu) volta às iniciais, sem imagem quebrada.
 */
export function AvatarContato({
  nome,
  fotoUrl = null,
  tamanho = "md",
}: {
  nome: string | null
  /** Endereço assinado da cópia da foto, ou null. */
  fotoUrl?: string | null
  tamanho?: keyof typeof TAMANHOS
}) {
  const t = TAMANHOS[tamanho]
  const nomeLimpo = nome?.trim()
  const iniciais = nomeLimpo ? iniciaisDoNome(nomeLimpo) : ""
  const [urlQuebrada, setUrlQuebrada] = useState<string | null>(null)
  const mostrarFoto = Boolean(fotoUrl) && urlQuebrada !== fotoUrl

  return (
    <div
      className={cn(
        "rounded-full bg-muted flex items-center justify-center font-medium text-muted-foreground shrink-0 overflow-hidden",
        t.circulo
      )}
    >
      {mostrarFoto ? (
        // eslint-disable-next-line @next/next/no-img-element -- endereço assinado, fora do otimizador do Next
        <img
          src={fotoUrl!}
          alt={nomeLimpo || "Foto do contato"}
          className="h-full w-full object-cover"
          onError={() => setUrlQuebrada(fotoUrl)}
        />
      ) : iniciais ? (
        iniciais
      ) : (
        <User className={t.icone} aria-label="Contato sem nome" />
      )}
    </div>
  )
}
