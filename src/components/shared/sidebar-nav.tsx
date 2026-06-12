"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  AlarmClock,
  AlertTriangle,
  CalendarCheck,
  Contact,
  Kanban,
  LayoutDashboard,
  ListChecks,
  Megaphone,
  Menu,
  MessageSquare,
  MessageSquareText,
  Plug,
  Tags,
  FileBadge,
  UserCircle,
  Users,
  UsersRound,
  X,
  Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"

type Papel = "admin" | "gerente" | "atendente"

interface ItemNav {
  href: string
  label: string
  icone: React.ComponentType<{ className?: string }>
  papeis?: Papel[] // ausente = todos
  badge?: number
}

interface SecaoNav {
  titulo: string | null
  itens: ItemNav[]
}

interface SidebarNavProps {
  papel: Papel
  nomeUsuario: string
  atrasados: number
}

function montarSecoes(atrasados: number): SecaoNav[] {
  return [
    {
      titulo: null,
      itens: [
        { href: "/dashboard", label: "Dashboard", icone: LayoutDashboard },
        { href: "/pipeline", label: "Pipeline", icone: Kanban },
        { href: "/chat", label: "Chat", icone: MessageSquare },
        { href: "/contatos", label: "Contatos", icone: Contact },
      ],
    },
    {
      titulo: "Rotina",
      itens: [
        { href: "/agenda", label: "Agenda", icone: CalendarCheck, badge: atrasados },
        { href: "/alertas", label: "Alertas", icone: AlertTriangle },
      ],
    },
    {
      titulo: "Automação",
      itens: [
        { href: "/sequencias", label: "Sequências", icone: ListChecks, papeis: ["admin", "gerente"] },
        { href: "/campanhas", label: "Campanhas", icone: Megaphone, papeis: ["admin", "gerente"] },
        { href: "/configuracoes/automacoes", label: "Automações", icone: Zap, papeis: ["admin"] },
      ],
    },
    {
      titulo: "Configurações",
      itens: [
        { href: "/configuracoes/mensagens-rapidas", label: "Mensagens Rápidas", icone: MessageSquareText },
        { href: "/configuracoes/etiquetas", label: "Etiquetas", icone: Tags, papeis: ["admin"] },
        { href: "/configuracoes/templates", label: "Templates", icone: FileBadge, papeis: ["admin"] },
        { href: "/configuracoes/usuarios", label: "Usuários", icone: Users, papeis: ["admin"] },
        { href: "/configuracoes/times", label: "Times", icone: UsersRound, papeis: ["admin"] },
        { href: "/configuracoes/whatsapp", label: "WhatsApp", icone: Plug, papeis: ["admin"] },
      ],
    },
  ]
}

function ItemLink({
  item,
  ativo,
  onNavegar,
}: {
  item: ItemNav
  ativo: boolean
  onNavegar?: () => void
}) {
  const Icone = item.icone
  return (
    <Link
      href={item.href}
      onClick={onNavegar}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
        ativo
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
      )}
    >
      {ativo && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-full bg-primary" />
      )}
      <Icone className={cn("size-4 shrink-0", ativo ? "text-primary" : "text-muted-foreground/70 group-hover:text-foreground")} />
      <span className="truncate">{item.label}</span>
      {(item.badge ?? 0) > 0 && (
        <span className="ml-auto flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
          {item.badge! > 9 ? "9+" : item.badge}
        </span>
      )}
    </Link>
  )
}

function ConteudoNav({
  papel,
  nomeUsuario,
  atrasados,
  pathname,
  onNavegar,
}: SidebarNavProps & { pathname: string; onNavegar?: () => void }) {
  const secoes = montarSecoes(atrasados)

  function visivel(item: ItemNav) {
    return !item.papeis || item.papeis.includes(papel)
  }

  function ehAtivo(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard" || pathname.startsWith("/dashboard/")
    return pathname === href || pathname.startsWith(href + "/")
  }

  return (
    <div className="flex h-full flex-col">
      {/* Marca */}
      <Link
        href="/dashboard"
        onClick={onNavegar}
        className="flex items-center gap-2.5 px-4 h-14 border-b shrink-0"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Zap className="size-4" />
        </span>
        <span className="font-semibold text-sm tracking-tight">CRM Exponencial</span>
      </Link>

      {/* Seções */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-3 flex flex-col gap-4">
        {secoes.map((secao, i) => {
          const itens = secao.itens.filter(visivel)
          if (itens.length === 0) return null
          return (
            <div key={i} className="flex flex-col gap-0.5">
              {secao.titulo && (
                <span className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                  {secao.titulo}
                </span>
              )}
              {itens.map((item) => (
                <ItemLink key={item.href} item={item} ativo={ehAtivo(item.href)} onNavegar={onNavegar} />
              ))}
            </div>
          )
        })}
      </nav>

      {/* Perfil fixo no rodapé */}
      <div className="border-t p-2.5 shrink-0">
        <Link
          href="/perfil"
          onClick={onNavegar}
          className={cn(
            "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
            ehAtivo("/perfil")
              ? "bg-primary/10 text-primary font-medium"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          )}
        >
          <UserCircle className="size-5 shrink-0" />
          <span className="flex flex-col min-w-0">
            <span className="truncate font-medium text-foreground text-xs">{nomeUsuario}</span>
            <span className="text-[11px] text-muted-foreground">Meu perfil</span>
          </span>
        </Link>
      </div>
    </div>
  )
}

export function SidebarNav(props: SidebarNavProps) {
  const pathname = usePathname()
  const [aberto, setAberto] = useState(false)

  return (
    <>
      {/* Sidebar fixa (desktop) */}
      <aside className="hidden lg:flex w-60 shrink-0 border-r bg-background flex-col">
        <ConteudoNav {...props} pathname={pathname} />
      </aside>

      {/* Barra superior + drawer (mobile) */}
      <div className="lg:hidden flex items-center justify-between border-b h-14 px-4 shrink-0">
        <span className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Zap className="size-4" />
          </span>
          <span className="font-semibold text-sm">CRM Exponencial</span>
        </span>
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="relative flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted transition-colors"
          aria-label="Abrir menu"
        >
          <Menu className="size-5" />
          {props.atrasados > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive text-[9px] font-semibold text-white">
              <AlarmClock className="size-2.5" />
            </span>
          )}
        </button>
      </div>

      {aberto && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAberto(false)} />
          <div className="relative w-64 max-w-[80vw] bg-background border-r shadow-xl">
            <button
              type="button"
              onClick={() => setAberto(false)}
              className="absolute top-3.5 right-3 flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted transition-colors z-10"
              aria-label="Fechar menu"
            >
              <X className="size-4" />
            </button>
            <ConteudoNav {...props} pathname={pathname} onNavegar={() => setAberto(false)} />
          </div>
        </div>
      )}
    </>
  )
}
