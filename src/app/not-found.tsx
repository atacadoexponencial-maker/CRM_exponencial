import Link from "next/link"
import { TemaClaro } from "@/components/shared/tema-claro"

// QA M26 (06/10): o 404 era o padrão do Next, em inglês e com fundo branco.
export default function NotFound() {
  return (
    <TemaClaro>
    <main className="min-h-screen flex items-center justify-center bg-background text-foreground px-4">
      <div className="max-w-md w-full text-center space-y-4">
        <p className="text-sm text-muted-foreground">Erro 404</p>
        <h1 className="text-[26px] font-semibold leading-tight tracking-tight">Página não encontrada</h1>
        <p className="text-sm text-muted-foreground">
          O endereço pode estar errado, ou a página foi movida.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Ir para o início
        </Link>
      </div>
    </main>
    </TemaClaro>
  )
}
