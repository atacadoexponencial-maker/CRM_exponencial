import Link from "next/link"
import { createClient } from "@/integrations/supabase/server"

async function contarLembretesAtrasados(): Promise<number> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 0

    const { count } = await supabase
      .from("reminders")
      .select("id", { count: "exact", head: true })
      .eq("atendente_id", user.id)
      .eq("status", "pendente")
      .lt("due_at", new Date().toISOString())

    return count ?? 0
  } catch {
    return 0
  }
}

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const atrasados = await contarLembretesAtrasados()

  return (
    <div className="h-screen overflow-hidden flex flex-col">
      <header className="border-b">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-semibold text-sm">CRM Exponencial</span>
          <nav className="flex items-center gap-5 text-sm">
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
              Dashboard
            </Link>
            <Link href="/pipeline" className="text-muted-foreground hover:text-foreground transition-colors">
              Pipeline
            </Link>
            <Link href="/chat" className="text-muted-foreground hover:text-foreground transition-colors">
              Chat
            </Link>
            <Link href="/contatos" className="text-muted-foreground hover:text-foreground transition-colors">
              Contatos
            </Link>
            <Link href="/agenda" className="relative text-muted-foreground hover:text-foreground transition-colors">
              Agenda
              {atrasados > 0 && (
                <span className="absolute -top-1.5 -right-3 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
                  {atrasados > 9 ? "9+" : atrasados}
                </span>
              )}
            </Link>
            <Link href="/alertas" className="text-muted-foreground hover:text-foreground transition-colors">
              Alertas
            </Link>
            <Link href="/sequencias" className="text-muted-foreground hover:text-foreground transition-colors">
              Sequências
            </Link>
            <Link href="/configuracoes/usuarios" className="text-muted-foreground hover:text-foreground transition-colors">
              Usuários
            </Link>
            <Link href="/configuracoes/times" className="text-muted-foreground hover:text-foreground transition-colors">
              Times
            </Link>
            <Link href="/configuracoes/etiquetas" className="text-muted-foreground hover:text-foreground transition-colors">
              Etiquetas
            </Link>
            <Link href="/configuracoes/mensagens-rapidas" className="text-muted-foreground hover:text-foreground transition-colors">
              Mensagens Rápidas
            </Link>
            <Link href="/configuracoes/automacoes" className="text-muted-foreground hover:text-foreground transition-colors">
              Automações
            </Link>
            <Link href="/configuracoes/templates" className="text-muted-foreground hover:text-foreground transition-colors">
              Templates
            </Link>
            <Link href="/configuracoes/whatsapp" className="text-muted-foreground hover:text-foreground transition-colors">
              WhatsApp
            </Link>
            <Link href="/perfil" className="text-muted-foreground hover:text-foreground transition-colors">
              Perfil
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 flex flex-col overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
