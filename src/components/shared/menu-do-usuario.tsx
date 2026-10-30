"use client"

// Bolinha do usuário no canto superior (pedido dela em 20/10/2026): iniciais, e ao
// clicar um menu com nome, e-mail, "Meu perfil" e "Sair". Antes, sair exigia abrir o
// perfil e clicar em Sair lá.

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut, Moon, Sun, UserCircle } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { realizarLogout, trocarTema } from "@/app/(auth)/perfil/actions"
import { aplicarTemaNoNavegador, temaValido, type Tema } from "@/lib/tema"
import { iniciaisDoNome } from "@/lib/iniciais"

/** Duas iniciais do nome; sem nome, a primeira letra do e-mail. */
export function iniciaisDe(nome: string, email: string): string {
  return iniciaisDoNome(nome, 2) || (email[0] ?? "?").toUpperCase()
}

const NOME_DO_PAPEL = { admin: "Admin", gerente: "Gerente", atendente: "Atendente" } as const

/**
 * `bolinha`: só as iniciais (barra do celular, menu recolhido).
 * `linha`: iniciais, nome e papel, no pé do menu lateral (B36-03).
 */
export function MenuDoUsuario({
  nome,
  email,
  tema = "claro",
  papel,
  variante = "bolinha",
}: {
  nome: string
  email: string
  tema?: Tema
  papel?: keyof typeof NOME_DO_PAPEL
  variante?: "bolinha" | "linha"
}) {
  const router = useRouter()
  const iniciais = iniciaisDe(nome, email)
  const [temaAtual, setTemaAtual] = useState<Tema>(tema)
  const [erroTema, setErroTema] = useState("")

  // B36-01: a tela muda na hora (sem recarregar); o perfil grava em seguida. Se a
  // gravação falhar, volta ao tema anterior e avisa.
  async function escolherTema(valor: string) {
    const novo = temaValido(valor)
    const anterior = temaAtual
    if (novo === anterior) return
    setErroTema("")
    setTemaAtual(novo)
    aplicarTemaNoNavegador(novo)
    const { erro } = await trocarTema(novo)
    if (erro) {
      setTemaAtual(anterior)
      aplicarTemaNoNavegador(anterior)
      setErroTema(erro)
    }
  }

  return (
    <DropdownMenu>
      {variante === "linha" ? (
        <DropdownMenuTrigger
          className="flex w-full items-center gap-2.5 rounded-md px-1.5 py-1.5 text-left outline-none hover:bg-sidebar-accent/60 focus-visible:ring-2 focus-visible:ring-ring/50"
          aria-label="Menu do usuário"
          title={nome || email}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
            {iniciais}
          </span>
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-sm font-medium">{nome || email}</span>
            {papel && <span className="truncate text-xs text-muted-foreground">{NOME_DO_PAPEL[papel]}</span>}
          </span>
        </DropdownMenuTrigger>
      ) : (
        <DropdownMenuTrigger
          className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          aria-label="Menu do usuário"
          title={nome || email}
        >
          {iniciais}
        </DropdownMenuTrigger>
      )}
      <DropdownMenuContent align={variante === "linha" ? "start" : "end"} side={variante === "linha" ? "top" : "bottom"} className="w-64">
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
        <div className="px-2 pt-1 pb-0.5 text-xs text-muted-foreground">Tema</div>
        <DropdownMenuRadioGroup value={temaAtual} onValueChange={(v) => void escolherTema(String(v))}>
          <DropdownMenuRadioItem value="claro" closeOnClick={false}>
            <Sun className="size-4" />
            Claro
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="escuro" closeOnClick={false}>
            <Moon className="size-4" />
            Escuro
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        {erroTema && <p role="alert" className="px-2 py-1 text-xs text-erro">{erroTema}</p>}
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
