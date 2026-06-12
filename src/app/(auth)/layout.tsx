import { createClient } from "@/integrations/supabase/server"
import { SidebarNav } from "@/components/shared/sidebar-nav"

async function dadosDoUsuario(): Promise<{
  papel: "admin" | "gerente" | "atendente"
  nome: string
  atrasados: number
}> {
  const fallback = { papel: "atendente" as const, nome: "", atrasados: 0 }
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return fallback

    const [{ data: perfil }, { count }] = await Promise.all([
      supabase.from("profiles").select("role, name").eq("id", user.id).single(),
      supabase
        .from("reminders")
        .select("id", { count: "exact", head: true })
        .eq("atendente_id", user.id)
        .eq("status", "pendente")
        .lt("due_at", new Date().toISOString()),
    ])

    return {
      papel: (perfil?.role as "admin" | "gerente" | "atendente") ?? "atendente",
      nome: perfil?.name ?? "",
      atrasados: count ?? 0,
    }
  } catch {
    return fallback
  }
}

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const { papel, nome, atrasados } = await dadosDoUsuario()

  return (
    <div className="h-screen overflow-hidden flex flex-col lg:flex-row">
      <SidebarNav papel={papel} nomeUsuario={nome} atrasados={atrasados} />
      <main className="flex-1 min-w-0 flex flex-col overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
