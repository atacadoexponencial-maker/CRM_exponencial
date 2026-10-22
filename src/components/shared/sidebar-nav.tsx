"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  AlarmClock,
  AlertTriangle,
  BarChart3,
  CalendarCheck,
  Contact,
  Kanban,
  LayoutDashboard,
  ListChecks,
  Megaphone,
  Menu,
  MessageSquare,
  MessageSquareText,
  PanelLeftClose,
  PanelLeftOpen,
  Plug,
  ShoppingBag,
  Store,
  Tags,
  FileBadge,
  Users,
  UsersRound,
  X,
  Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { COOKIE_MENU_RECOLHIDO, gravarPreferencia } from "@/lib/preferencias-layout"
import { MenuDoUsuario } from "./menu-do-usuario"
import { LogoDaMarca } from "./logo-da-marca"
import type { Tema } from "@/lib/tema"

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
  /** E-mail do usuário, para o menu da bolinha. */
  email?: string
  atrasados: number
  /** Pedidos do catálogo ainda Novos (B16-10). */
  pedidosNovos?: number
  /** Tema escolhido no perfil, para o menu do usuário (B36-01). */
  tema?: Tema
}

function montarSecoes(atrasados: number, pedidosNovos: number): SecaoNav[] {
  return [
    {
      titulo: null,
      itens: [
        { href: "/dashboard", label: "Dashboard", icone: LayoutDashboard },
        // B32-03: relatórios para todos; o Atendente vê só os próprios números.
        { href: "/relatorios", label: "Relatórios", icone: BarChart3 },
        { href: "/pipeline", label: "Pipeline", icone: Kanban },
        { href: "/chat", label: "Chat", icone: MessageSquare },
        { href: "/contatos", label: "Contatos", icone: Contact },
        { href: "/catalogo", label: "Catálogo", icone: Store, papeis: ["admin", "gerente"] },
        // Atendente vê só os pedidos do catálogo; os outros papéis veem o catálogo e os pedidos.
        { href: "/catalogo/pedidos", label: "Pedidos", icone: ShoppingBag, badge: pedidosNovos },
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
        { href: "/configuracoes/mensagens-rapidas", label: "Mensagens Rápidas", icone: MessageSquareText, papeis: ["admin"] },
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
  recolhido,
  onNavegar,
}: {
  item: ItemNav
  ativo: boolean
  recolhido?: boolean
  onNavegar?: () => void
}) {
  const Icone = item.icone
  const temBadge = (item.badge ?? 0) > 0
  return (
    <Link
      href={item.href}
      onClick={onNavegar}
      title={recolhido ? item.label : undefined}
      aria-label={recolhido ? item.label : undefined}
      aria-current={ativo ? "page" : undefined}
      className={cn(
        // B36-03: item do Caderno — o ativo ganha fundo e negrito, sem barra lateral.
        "group relative flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-sm transition-colors",
        recolhido && "justify-center px-0 py-2",
        ativo
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
          : "text-sidebar-foreground hover:bg-sidebar-accent/60"
      )}
    >
      <Icone className={cn("size-4 shrink-0", ativo ? "text-sidebar-accent-foreground" : "text-muted-foreground group-hover:text-sidebar-foreground")} />
      {recolhido ? (
        temBadge && <span data-badge={item.badge} className="absolute top-1 right-2 h-2 w-2 rounded-full bg-aviso" />
      ) : (
        <span className="truncate">{item.label}</span>
      )}
      {!recolhido && temBadge && (
        <span data-badge={item.badge} className="numero ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-aviso-fundo px-1.5 text-[11px] font-medium text-aviso">
          {item.badge! > 9 ? "9+" : item.badge}
        </span>
      )}
    </Link>
  )
}

function ConteudoNav({
  papel,
  atrasados,
  pedidosNovos = 0,
  pathname,
  recolhido = false,
  onAlternar,
  onNavegar,
  menuDoUsuario,
}: SidebarNavProps & {
  pathname: string
  recolhido?: boolean
  onAlternar?: () => void
  onNavegar?: () => void
  menuDoUsuario?: React.ReactNode
}) {
  const secoes = montarSecoes(atrasados, pedidosNovos)

  function visivel(item: ItemNav) {
    return !item.papeis || item.papeis.includes(papel)
  }

  const casa = (href: string) => pathname === href || pathname.startsWith(href + "/")
  const todosHrefs = secoes.flatMap((secao) => secao.itens.map((item) => item.href))

  function ehAtivo(href: string) {
    if (!casa(href)) return false
    // Em /catalogo/pedidos acende só "Pedidos", não também "Catálogo".
    return !todosHrefs.some((outro) => outro.length > href.length && outro.startsWith(href + "/") && casa(outro))
  }

  return (
    <div className="flex h-full flex-col">
      {/* Marca */}
      <div className={cn("flex items-center h-16 shrink-0", recolhido ? "justify-center" : "px-4 gap-2")}>
        {!recolhido && (
          <Link
            href="/dashboard"
            onClick={onNavegar}
            className="flex flex-1 min-w-0 items-center gap-2.5"
          >
            <LogoDaMarca className="h-8" />
          </Link>
        )}
        {onAlternar && (
          <button
            type="button"
            onClick={onAlternar}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label={recolhido ? "Expandir menu" : "Recolher menu"}
            title={recolhido ? "Expandir menu" : "Recolher menu"}
          >
            {recolhido ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </button>
        )}
      </div>

      {/* Seções */}
      <nav aria-label="Menu principal" className="flex-1 overflow-y-auto px-3 pb-3 flex flex-col gap-5">
        {secoes.map((secao, i) => {
          const itens = secao.itens.filter(visivel)
          if (itens.length === 0) return null
          return (
            <div key={i} className="flex flex-col gap-0.5">
              {secao.titulo && !recolhido && (
                <span className="px-2.5 pb-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  {secao.titulo}
                </span>
              )}
              {itens.map((item) => (
                <ItemLink key={item.href} item={item} ativo={ehAtivo(item.href)} recolhido={recolhido} onNavegar={onNavegar} />
              ))}
            </div>
          )
        })}
      </nav>

      {/* B36-03: o usuário no pé do menu, com perfil, tema e sair. */}
      {menuDoUsuario && (
        <div className={cn("shrink-0 border-t border-sidebar-border", recolhido ? "flex justify-center py-3" : "px-3 py-3")}>
          {menuDoUsuario}
        </div>
      )}
    </div>
  )
}

export function SidebarNav({ recolhidoInicial = false, ...props }: SidebarNavProps & { recolhidoInicial?: boolean }) {
  const pathname = usePathname()
  const [aberto, setAberto] = useState(false)
  const [recolhido, setRecolhido] = useState(recolhidoInicial)

  function alternarRecolhido() {
    const proximo = !recolhido
    setRecolhido(proximo)
    gravarPreferencia(COOKIE_MENU_RECOLHIDO, proximo)
  }

  return (
    <>
      {/* Sidebar fixa (desktop) */}
      <aside className={cn("hidden lg:flex shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground flex-col", recolhido ? "w-16" : "w-60")}>
        <ConteudoNav
          {...props}
          pathname={pathname}
          recolhido={recolhido}
          onAlternar={alternarRecolhido}
          menuDoUsuario={
            <MenuDoUsuario nome={props.nomeUsuario} email={props.email ?? ""} tema={props.tema} papel={props.papel} variante={recolhido ? "bolinha" : "linha"} />
          }
        />
      </aside>

      {/* Barra superior + drawer (mobile) */}
      <div className="lg:hidden flex items-center justify-between border-b border-sidebar-border bg-sidebar h-14 px-4 shrink-0">
        <span className="flex items-center gap-2">
          <LogoDaMarca className="h-8" />
        </span>
        <span className="flex items-center gap-2">
        <MenuDoUsuario nome={props.nomeUsuario} email={props.email ?? ""} tema={props.tema} />
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="relative flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted transition-colors"
          aria-label="Abrir menu"
        >
          <Menu className="size-5" />
          {props.atrasados > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive text-[9px] font-semibold text-background">
              <AlarmClock className="size-2.5" />
            </span>
          )}
        </button>
        </span>
      </div>

      {aberto && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAberto(false)} />
          <div className="relative w-64 max-w-[80vw] bg-sidebar text-sidebar-foreground border-r border-sidebar-border shadow-xl">
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
