"use client"

// Bolinha do usuário no canto superior (pedido dela em 20/10/2026): iniciais, e ao
// clicar um menu com nome, e-mail, "Meu perfil" e "Sair". Antes, sair exigia abrir o
// perfil e clicar em Sair lá.

import { useRouter } from "next/navigation"
import { LogOut, UserCircle } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { realizarLogout } from "@/app/(auth)/perfil/actions"

/** Duas iniciais do nome; sem nome, a primeira letra do e-mail. */
export function iniciaisDe(nome: string, email: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  if (partes.length >= 2) return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return (email[0] ?? "?").toUpperCase()
}

export function MenuDoUsuario({ nome, email }: { nome: string; email: string }) {
  const router = useRouter()
  const iniciais = iniciaisDe(nome, email)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        aria-label="Menu do usuário"
        title={nome || email}
      >
        {iniciais}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="flex items-center gap-3 px-2 py-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
            {iniciais}
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium">{nome || "Sem nome"}</span>
            <span className="truncate text-xs text-muted-foreground">{email}</span>
          </span>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/perfil")}>
          <UserCircle className="size-4" />
          Meu perfil
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void realizarLogout()}>
          <LogOut className="size-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
