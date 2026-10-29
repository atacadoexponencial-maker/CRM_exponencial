import { TemaClaro } from "@/components/shared/tema-claro"
import { LogoDaMarca } from "@/components/shared/logo-da-marca"
import { AVISO_LINK_INVALIDO, linkDeSenhaNovaValido } from "@/lib/senha-nova"
import { FormularioSenhaNova } from "./formulario-senha-nova"

export const metadata = { title: "Criar senha nova" }

// B52-02: aberta pelo link do e-mail. Conferir o link não o gasta; só salvar gasta.
export default async function RedefinirSenhaPage({ searchParams }: { searchParams: Promise<{ codigo?: string | string[] }> }) {
  const { codigo } = await searchParams
  const valido = typeof codigo === "string" && (await linkDeSenhaNovaValido(codigo))

  return (
    <TemaClaro>
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <LogoDaMarca className="mx-auto mb-6 h-16" />
          <h1 className="text-2xl font-semibold tracking-tight">{valido ? "Criar senha nova" : "Link inválido"}</h1>
          <p className="text-sm text-muted-foreground mt-2">
            {valido ? "Escolha a senha nova da sua conta no crmatacado exp." : AVISO_LINK_INVALIDO}
          </p>
        </div>

        {valido ? (
          <FormularioSenhaNova codigo={codigo as string} avisoLinkInvalido={AVISO_LINK_INVALIDO} />
        ) : (
          <p className="text-center text-sm">
            <a href="/esqueci-minha-senha" className="text-foreground font-medium underline underline-offset-4 hover:text-foreground/80">
              Pedir outro link
            </a>
          </p>
        )}
      </div>
    </div>
    </TemaClaro>
  )
}
