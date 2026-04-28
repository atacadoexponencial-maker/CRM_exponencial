import Link from "next/link"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-semibold text-sm">CRM Exponencial</span>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/chat" className="text-muted-foreground hover:text-foreground transition-colors">
              Chat
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
            <Link href="/configuracoes/whatsapp" className="text-muted-foreground hover:text-foreground transition-colors">
              WhatsApp
            </Link>
            <Link href="/perfil" className="text-muted-foreground hover:text-foreground transition-colors">
              Perfil
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  )
}
