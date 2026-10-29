import { cookies } from "next/headers"
import { sessaoAtual } from "@/lib/sessao"
import { SidebarNav } from "@/components/shared/sidebar-nav"
import { COOKIE_MENU_RECOLHIDO } from "@/lib/preferencias-layout"
import { SincronizarTema } from "@/components/shared/sincronizar-tema"
import { AvisosNaTela } from "@/components/shared/avisos-na-tela"
import { temaValido, type Tema } from "@/lib/tema"
import { ProvedorDeFuso } from "@/components/shared/fuso-da-empresa"
import { fusoDaEmpresa } from "@/lib/fuso-da-empresa"
import { ehDaPlataforma } from "@/lib/plataforma"

async function dadosDoUsuario(): Promise<{
  papel: "admin" | "gerente" | "atendente"
  nome: string
  email: string
  atrasados: number
  pedidosNovos: number
  tema: Tema
  plataforma: boolean
}> {
  const fallback = { papel: "atendente" as const, nome: "", email: "", atrasados: 0, pedidosNovos: 0, tema: "claro" as const, plataforma: false }
  try {
    const { supabase, user, perfil } = await sessaoAtual()
    if (!user) return fallback

    const [{ count }, { count: novos }, plataforma] = await Promise.all([
      supabase
        .from("reminders")
        .select("id", { count: "exact", head: true })
        .eq("atendente_id", user.id)
        .eq("status", "pendente")
        .lt("due_at", new Date().toISOString()),
      // B16-10: pedidos do catálogo ainda Novos (o RLS limita à empresa).
      supabase.from("catalog_orders").select("id", { count: "exact", head: true }).eq("status", "novo"),
      // B51-01: quem cuida da plataforma vê "Convites" no menu
      ehDaPlataforma(user.email),
    ])

    return {
      papel: (perfil?.role as "admin" | "gerente" | "atendente") ?? "atendente",
      nome: perfil?.name ?? "",
      email: user.email ?? "",
      atrasados: count ?? 0,
      pedidosNovos: novos ?? 0,
      tema: temaValido(perfil?.tema),
      plataforma,
    }
  } catch {
    return fallback
  }
}

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const [{ papel, nome, email, atrasados, pedidosNovos, tema, plataforma }, cookieStore, fuso] = await Promise.all([dadosDoUsuario(), cookies(), fusoDaEmpresa()])
  const menuRecolhido = cookieStore.get(COOKIE_MENU_RECOLHIDO)?.value === "1"

  return (
    <ProvedorDeFuso fuso={fuso}>
      <div className="h-screen overflow-hidden flex flex-col lg:flex-row">
        <SincronizarTema tema={tema} />
        <AvisosNaTela />
        <SidebarNav papel={papel} nomeUsuario={nome} email={email} atrasados={atrasados} pedidosNovos={pedidosNovos} tema={tema} plataforma={plataforma} recolhidoInicial={menuRecolhido} />
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {/* B36-03: no computador o usuário fica no pé do menu lateral; a barra de cima saiu.
              No celular ele continua na barra do menu (56 px + borda = os 57 px que o chat desconta). */}
          <main className="flex-1 min-w-0 flex flex-col overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </ProvedorDeFuso>
  )
}
