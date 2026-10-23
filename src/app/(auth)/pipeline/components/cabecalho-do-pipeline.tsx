import Link from "next/link"
import { Settings2 } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * B36-05: cabeçalho do Pipeline no estilo Caderno — título, abas Entrada/Recompra com
 * sublinhado na ativa e quantos cards a aba ativa tem; à direita, busca e ações.
 * B41-01: depois de Entrada e Recompra vêm os funis da empresa, por ordem de criação;
 * com muitas abas, a linha rola para o lado. Admin e Gerente veem "Gerenciar funis".
 */
export function CabecalhoDoPipeline({
  atual,
  quantidade,
  funis = [],
  papel,
  children,
}: {
  /** "entrada", "recompra" ou o id do funil da empresa. */
  atual: string
  quantidade: number
  funis?: Array<{ id: string; nome: string }>
  papel?: string
  children: React.ReactNode
}) {
  const abas = [
    { id: "entrada", rotulo: "Entrada", href: "/pipeline" },
    { id: "recompra", rotulo: "Recompra", href: "/pipeline/recompra" },
    ...funis.map((f) => ({ id: f.id, rotulo: f.nome, href: `/pipeline/funil/${f.id}` })),
  ]
  const gerencia = papel === "admin" || papel === "gerente"
  return (
    <div className="flex shrink-0 flex-wrap items-end justify-between gap-3 px-4 pt-6 sm:px-6 lg:px-8">
      <div className="flex min-w-0 max-w-full flex-col gap-3">
        <span className="text-[26px] font-semibold leading-tight tracking-tight" aria-hidden="true">Pipeline</span>
        <div className="flex min-w-0 items-end gap-6">
          <nav aria-label="Funis" className="flex min-w-0 gap-6 overflow-x-auto">
            {abas.map((a) => {
              const ativa = a.id === atual
              return (
                <Link
                  key={a.id}
                  href={a.href}
                  aria-current={ativa ? "page" : undefined}
                  className={cn(
                    "shrink-0 whitespace-nowrap pb-2.5 text-sm transition-colors",
                    ativa ? "font-semibold text-foreground shadow-[inset_0_-2px_0_var(--foreground)]" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {a.rotulo}
                  {ativa && <span className="numero ml-1.5 font-normal text-muted-foreground">{quantidade}</span>}
                </Link>
              )
            })}
          </nav>
          {gerencia && (
            <Link
              href="/configuracoes/funis"
              className="flex shrink-0 items-center gap-1 whitespace-nowrap pb-2.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <Settings2 className="size-3.5" aria-hidden />
              Gerenciar funis
            </Link>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 pb-2.5">{children}</div>
    </div>
  )
}
