import { cookies } from "next/headers"
import { sessaoAtual } from "@/lib/sessao"
import { SidebarNav } from "@/components/shared/sidebar-nav"
import { MenuDoUsuario } from "@/components/shared/menu-do-usuario"
import { COOKIE_MENU_RECOLHIDO } from "@/lib/preferencias-layout"
import { SincronizarTema } from "@/components/shared/sincronizar-tema"
import { temaValido, type Tema } from "@/lib/tema"

async function dadosDoUsuario(): Promise<{
  papel: "admin" | "gerente" | "atendente"
  nome: string
  email: string
  atrasados: number
  pedidosNovos: number
  tema: Tema
}> {
  const fallback = { papel: "atendente" as const, nome: "", email: "", atrasados: 0, pedidosNovos: 0, tema: "claro" as const }
  try {
    const { supabase, user, perfil } = await sessaoAtual()
    if (!user) return fallback

    const [{ count }, { count: novos }] = await Promise.all([
      supabase
        .from("reminders")
        .select("id", { count: "exact", head: true })
        .eq("atendente_id", user.id)
        .eq("status", "pendente")
        .lt("due_at", new Date().toISOString()),
      // B16-10: pedidos do catálogo ainda Novos (o RLS limita à empresa).
      supabase.from("catalog_orders").select("id", { count: "exact", head: true }).eq("status", "novo"),
    ])

    return {
      papel: (perfil?.role as "admin" | "gerente" | "atendente") ?? "atendente",
      nome: perfil?.name ?? "",
      email: user.email ?? "",
      atrasados: count ?? 0,
      pedidosNovos: novos ?? 0,
      tema: temaValido(perfil?.tema),
    }
  } catch {
    return fallback
  }
}

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const [{ papel, nome, email, atrasados, pedidosNovos, tema }, cookieStore] = await Promise.all([dadosDoUsuario(), cookies()])
  const menuRecolhido = cookieStore.get(COOKIE_MENU_RECOLHIDO)?.value === "1"

  return (
    <div className="h-screen overflow-hidden flex flex-col lg:flex-row">
      <SincronizarTema tema={tema} />
      <SidebarNav papel={papel} nomeUsuario={nome} email={email} atrasados={atrasados} pedidosNovos={pedidosNovos} tema={tema} recolhidoInicial={menuRecolhido} />
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Barra superior do computador (20/10/2026): a bolinha do usuário, com perfil e sair.
            No celular ela fica na barra que o menu já tem. 56 px + borda = os 57 px que o chat desconta. */}
        <div className="hidden lg:flex h-14 shrink-0 items-center justify-end border-b px-4">
          <MenuDoUsuario nome={nome} email={email} tema={tema} />
        </div>
        <main className="flex-1 min-w-0 flex flex-col overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
